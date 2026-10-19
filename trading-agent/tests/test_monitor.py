import json
import logging

import numpy as np
import pandas as pd

from agent import monitor
from agent.config import Config, MonitorConfig


def test_equity_log_one_row_per_day(tmp_path):
    monitor.record_equity(tmp_path, 100_000, 50_000, 50_000, {"AAA": 10})
    monitor.record_equity(tmp_path, 101_000, 50_000, 51_000, {"AAA": 10})
    eq = monitor.load_equity(tmp_path)
    assert len(eq) == 1 and eq.iloc[-1] == 101_000


def test_live_stats_and_drift(tmp_path):
    idx = pd.bdate_range(end="2026-10-16", periods=80)
    eq = pd.Series(np.r_[np.linspace(100_000, 120_000, 40), np.linspace(120_000, 95_000, 40)], index=idx)
    s = monitor.live_stats(eq)
    assert s["peak"] == 120_000 and round(s["drawdown"], 3) == round(95 / 120 - 1, 3)
    cfg = Config(monitor=MonitorConfig(expected_max_drawdown_pct=18))
    journal = pd.DataFrame({"action": ["BUY"] * 6, "slippage_bps": [30] * 6, "status": ["filled"] * 6})
    w = monitor.drift_warnings(cfg, eq, journal)
    assert any("drawdown" in x for x in w) and any("slippage" in x for x in w)
    assert any("Sharpe" in x for x in w)


def test_report_runs_without_history(tmp_path):
    cfg = Config(state_dir=tmp_path)
    assert "No equity history" in monitor.report(cfg)
    (tmp_path / "STOP").write_text("max drawdown hit")
    assert "KILL SWITCH ON" in monitor.report(cfg)


def test_report_with_history(tmp_path):
    pd.DataFrame({"date": ["2026-10-15", "2026-10-16"], "equity": [100_000, 101_000], "cash": 0,
                  "gross": 0, "managed": "{}"}).to_csv(tmp_path / "equity.csv", index=False)
    pd.DataFrame({"time": ["t"], "symbol": ["AAA"], "action": ["BUY"], "qty": [10], "price": [100],
                  "fill_price": [100.1], "slippage_bps": [10.0], "status": ["filled"],
                  "reason": ["entry"], "notes": [""]}).to_csv(tmp_path / "journal.csv", index=False)
    (tmp_path / "managed.json").write_text(json.dumps({"AAA": 10}))
    text = monitor.report(Config(state_dir=tmp_path))
    assert "NAV 101,000.00" in text and "orders filled: 1" in text and "{'AAA': 10}" in text


def test_notifier_without_telegram_only_logs(monkeypatch, caplog):
    monkeypatch.delenv("TELEGRAM_BOT_TOKEN", raising=False)
    n = monitor.Notifier()
    with caplog.at_level(logging.WARNING):
        n.send("hello")
    assert not n.enabled and n.sent == ["hello"] and "ALERT: hello" in caplog.text
