import numpy as np
import pandas as pd
import pytest

from agent.backtest import (compare, max_drawdown, metrics, parse_overrides, portfolio_returns,
                            sixty_forty, trade_stats, walk_forward)
from agent.config import StrategyConfig
from conftest import make_bars


def test_metrics_known_values():
    r = pd.Series([0.01, -0.02, 0.01, 0.0] * 63)  # one year
    m = metrics(r)
    assert m["total"] == pytest.approx((1.01 * 0.98 * 1.01) ** 63 - 1)
    dd = np.sqrt((0.02 ** 2) / 4) * np.sqrt(252)
    assert m["sortino"] == pytest.approx(r.mean() * 252 / dd)
    assert m["max_dd"] < 0
    assert max_drawdown(pd.Series([0.1, -0.5, 0.2])) == pytest.approx(-0.5)


def test_trade_stats_payoff_and_profit_factor():
    sig = pd.DataFrame({"position": [0, 1, 1, 0, 1, 0, 1, 0],
                        "close":    [10, 10, 12, 12, 10, 9, 10, 11]})
    t = trade_stats(sig)
    # trades: +20%, -10%, +10%
    assert t["trades"] == 3 and t["win_rate"] == pytest.approx(2 / 3)
    assert t["payoff"] == pytest.approx(0.15 / 0.10)
    assert t["profit_factor"] == pytest.approx(0.30 / 0.10)


def test_parse_overrides():
    assert parse_overrides("fast_sma=10,entry_mode=trend,macd_confirm=true,atr_stop_mult=2.5") == {
        "fast_sma": 10, "entry_mode": "trend", "macd_confirm": True, "atr_stop_mult": 2.5}


def _data():
    rng = np.random.default_rng(1)
    n = 252 * 7
    return {s: make_bars(100 * np.exp(np.cumsum(rng.normal(0.0004, 0.015, n)))) for s in ("A", "B")}


def test_compare_and_portfolio():
    data = _data()
    res = compare(data, StrategyConfig(), {"trend": {"entry_mode": "trend"}})
    assert set(res) == {"base", "trend"}
    assert len(portfolio_returns(data, StrategyConfig())) == len(data["A"])


def test_sixty_forty():
    s, b = make_bars(np.linspace(100, 110, 50)), make_bars(np.full(50, 100.0))
    r = sixty_forty(s, b)
    assert r.iloc[-1] == pytest.approx(0.6 * (110 / s["close"].iloc[-2] - 1))


def test_walk_forward_is_out_of_sample():
    data = _data()
    grid = {"fast_sma": [10, 20], "slow_sma": [50, 100]}
    wf = walk_forward(data, StrategyConfig(), grid, train_years=2, test_years=1)
    assert len(wf.windows) >= 3
    for w in wf.windows:
        train_end = pd.Timestamp(w["train"].split("..")[1])
        test_start = pd.Timestamp(w["test"].split("..")[0])
        assert test_start >= train_end  # parameters never see their test period
        assert w["params"]["fast_sma"] < w["params"]["slow_sma"]
    assert wf.oos_returns.index.is_monotonic_increasing


def test_idle_cash_earns_interest():
    from agent.backtest import strategy_returns
    flat = make_bars(np.full(300, 100.0))  # never trades
    cash = pd.Series(0.0001, index=flat.index)
    r, _ = strategy_returns(flat, StrategyConfig(), cash=cash)
    assert r.iloc[1:].eq(0.0001).all()


def test_sharpe_uses_excess_return():
    cash_only = pd.Series(0.0002, index=range(252)) + np.random.default_rng(0).normal(0, 1e-6, 252)
    assert metrics(cash_only)["sharpe"] > 10                            # raw: looks amazing
    assert abs(metrics(cash_only, pd.Series(0.0002, index=range(252)))["sharpe"]) < 1  # excess: nothing
