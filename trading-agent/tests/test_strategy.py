import pandas as pd
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


def test_indicator_columns(down_then_up):
    out = compute(down_then_up, CFG)
    for col in ("macd", "macd_signal", "macd_hist", "vol_ratio", "sma150"):
        assert col in out


def test_trend_mode_enters_without_fresh_cross():
    from dataclasses import replace
    up = make_bars(np.linspace(80, 130, 120))  # fast > slow from early on, no cross
    assert compute(up, CFG)["position"].sum() == 0
    assert compute(up, replace(CFG, entry_mode="trend"))["position"].iloc[-1] == 1


def test_trend_mode_cooldown_after_stop(down_then_up):
    from dataclasses import replace
    crash = np.r_[down_then_up["close"].to_numpy(), np.linspace(130, 110, 4), np.full(3, 112)]
    out = compute(make_bars(crash), replace(CFG, entry_mode="trend", cooldown_bars=5, atr_stop_mult=1))
    exit_i = np.flatnonzero(out["reason"].str.startswith("exit"))[0]
    assert out["position"].iloc[exit_i:exit_i + 5].sum() == 0


def test_regime_filter_blocks_entries(down_then_up):
    from dataclasses import replace
    cfg = replace(CFG, regime_symbol="SPY")
    bear = pd.Series(False, index=down_then_up.index)
    bull = pd.Series(True, index=down_then_up.index)
    assert compute(down_then_up, cfg, bear)["position"].sum() == 0
    assert compute(down_then_up, cfg, None)["position"].sum() == 0  # missing regime: fail closed
    assert compute(down_then_up, cfg, bull)["position"].iloc[-1] == 1


def test_trend_sma_filter_blocks_entry_below_falling_sma(down_then_up):
    from dataclasses import replace
    # The 150-SMA is still falling at the golden cross -> no stage-2 entry.
    long = make_bars(np.r_[np.linspace(160, 80, 200), np.linspace(80, 120, 60)])
    assert compute(long, CFG)["position"].iloc[-1] == 1
    assert compute(long, replace(CFG, trend_sma=150))["position"].sum() == 0


def test_macd_confirm_filter(down_then_up):
    from dataclasses import replace
    out = compute(down_then_up, replace(CFG, macd_confirm=True))
    i = np.flatnonzero(out["reason"].str.startswith("entry"))
    assert len(i) == 1 and out["macd_hist"].iloc[i[0]] > 0
