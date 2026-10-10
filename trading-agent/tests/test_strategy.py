import numpy as np

from agent.backtest import backtest
from agent.config import StrategyConfig
from agent.strategy import compute, latest_signal, rsi
from conftest import make_bars

CFG = StrategyConfig(rsi_max_entry=100)


def test_enters_on_golden_cross(down_then_up):
    out = compute(down_then_up, CFG)
    entries = out.index[out["reason"].str.startswith("entry")]
    assert len(entries) == 1
    assert out["position"].iloc[-1] == 1
    assert out["position"].iloc[:80].sum() == 0


def test_trailing_stop_exits_on_crash(down_then_up):
    crash = np.r_[down_then_up["close"].to_numpy(), np.linspace(130, 95, 8)]
    out = compute(make_bars(crash), CFG)
    assert out["position"].iloc[-1] == 0
    assert "stop" in " ".join(out["reason"].iloc[-8:])


def test_rsi_filter_blocks_overbought_entry(down_then_up):
    out = compute(down_then_up, StrategyConfig(rsi_max_entry=1))
    assert out["position"].sum() == 0


def test_rsi_bounds():
    r = rsi(make_bars(np.random.default_rng(0).normal(100, 2, 300))["close"], 14).dropna()
    assert ((r >= 0) & (r <= 100)).all()


def test_no_lookahead(down_then_up):
    """Appending future bars must not change past decisions."""
    full = compute(down_then_up, CFG)["position"]
    part = compute(down_then_up.iloc[:110], CFG)["position"]
    assert (full.iloc[:110] == part).all()


def test_latest_signal_needs_history(down_then_up):
    import pytest
    with pytest.raises(ValueError):
        latest_signal(down_then_up.iloc[:30], CFG)


def test_backtest_runs(down_then_up):
    r = backtest(down_then_up, CFG, "X")
    assert -1 < r.max_drawdown <= 0
    assert 0 <= r.exposure <= 1
