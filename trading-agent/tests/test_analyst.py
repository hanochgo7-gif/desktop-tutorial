from types import SimpleNamespace as NS

import numpy as np
import pytest

from agent.analyst import ClaudeAnalyst, describe_setup
from agent.config import AnalystConfig, StrategyConfig
from agent.strategy import compute
from conftest import make_bars


def tool_call(**inp):
    base = dict(decision="approve", size_multiplier=1.0, confidence=0.9, summary="ok", risks=[])
    return NS(type="tool_use", name="submit_review", input={**base, **inp})


def resp(*blocks, stop="tool_use"):
    return NS(stop_reason=stop, content=list(blocks))


class FakeClient:
    def __init__(self, *responses):
        self.responses, self.calls = list(responses), []
        self.beta = NS(messages=NS(create=self._create))

    def _create(self, **kw):
        self.calls.append(kw)
        r = self.responses.pop(0)
        if isinstance(r, Exception):
            raise r
        return r


@pytest.fixture
def ind():
    return compute(make_bars(np.r_[np.linspace(120, 80, 80), np.linspace(80, 130, 60)]),
                   StrategyConfig())


def review(ind, client, tmp_path=None, **cfg):
    a = ClaudeAnalyst(AnalystConfig(enabled=True, **cfg), client=client, audit_dir=tmp_path)
    return a.review("AAA", ind, 100, 130.0, 100_000)


def test_approve(ind, tmp_path):
    c = FakeClient(resp(tool_call()))
    r = review(ind, c, tmp_path)
    assert r.approved and r.size_multiplier == 1.0
    assert list(tmp_path.glob("*_AAA.json"))  # audit trail written


def test_request_shape(ind):
    c = FakeClient(resp(tool_call()))
    review(ind, c)
    kw = c.calls[0]
    assert kw["model"] == "claude-opus-5-5"
    assert kw["fallbacks"] == "default" and "server-side-fallback-2026-07-01" in kw["betas"]
    assert {t["name"] for t in kw["tools"]} == {"web_search", "submit_review"}
    assert "temperature" not in kw


def test_no_web_search_when_disabled(ind):
    c = FakeClient(resp(tool_call()))
    review(ind, c, web_search=False)
    assert [t["name"] for t in c.calls[0]["tools"]] == ["submit_review"]


def test_veto(ind):
    r = review(ind, FakeClient(resp(tool_call(decision="veto", summary="earnings tomorrow"))))
    assert not r.approved and r.size_multiplier == 0


def test_cannot_enlarge(ind):
    assert review(ind, FakeClient(resp(tool_call(size_multiplier=3.0)))).size_multiplier == 1.0


def test_low_confidence_becomes_veto(ind):
    assert not review(ind, FakeClient(resp(tool_call(confidence=0.3)))).approved


@pytest.mark.parametrize("response", [
    RuntimeError("network down"),
    resp(stop="refusal"),
    resp(NS(type="text", text="I think it's fine"), stop="end_turn"),
])
def test_fails_closed(ind, response):
    assert not review(ind, FakeClient(response)).approved


def test_resumes_pause_turn(ind):
    paused = resp(NS(type="server_tool_use", name="web_search", input={}), stop="pause_turn")
    c = FakeClient(paused, resp(tool_call()))
    assert review(ind, c).approved
    assert len(c.calls) == 2 and c.calls[1]["messages"][-1]["role"] == "assistant"


def test_prompt_has_indicators(ind):
    text = describe_setup("AAA", ind, 100, 130.0, 100_000)
    assert "BUY 100 AAA" in text and "RSI14" in text and "52w high" in text
