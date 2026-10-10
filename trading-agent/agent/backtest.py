"""Backtest the strategy on daily data, against buy-and-hold."""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd

from .config import StrategyConfig
from .strategy import compute


@dataclass
class Result:
    symbol: str
    total_return: float
    cagr: float
    max_drawdown: float
    sharpe: float
    exposure: float
    trades: int
    win_rate: float
    bh_total_return: float
    bh_max_drawdown: float

    def row(self) -> str:
        return (f"{self.symbol:<8} {self.total_return:>8.1%} {self.cagr:>7.1%} {self.max_drawdown:>8.1%} "
                f"{self.sharpe:>6.2f} {self.exposure:>6.0%} {self.trades:>6d} {self.win_rate:>6.0%} | "
                f"{self.bh_total_return:>8.1%} {self.bh_max_drawdown:>8.1%}")

    HEADER = (f"{'symbol':<8} {'return':>8} {'CAGR':>7} {'maxDD':>8} {'sharpe':>6} {'expo':>6} "
              f"{'trades':>6} {'win%':>6} | {'B&H ret':>8} {'B&H DD':>8}")


def _max_dd(equity: pd.Series) -> float:
    return float((equity / equity.cummax() - 1).min())


def backtest(df: pd.DataFrame, cfg: StrategyConfig, symbol: str = "", cost_bps: float = 5) -> Result:
    sig = compute(df, cfg)
    ret = sig["close"].pct_change().fillna(0)
    # Decision at close t is held over bar t+1: no look-ahead.
    pos = sig["position"].shift(1).fillna(0)
    turnover = sig["position"].diff().abs().fillna(0).shift(1).fillna(0)
    strat = pos * ret - turnover * cost_bps / 10_000
    equity = (1 + strat).cumprod()
    bh = (1 + ret).cumprod()

    years = max(len(df) / 252, 1e-9)
    total = float(equity.iloc[-1] - 1)
    sharpe = float(strat.mean() / strat.std() * np.sqrt(252)) if strat.std() > 0 else 0.0

    # Per-trade returns from entry/exit closes.
    trades = []
    entry = None
    for px, p, prev in zip(sig["close"], sig["position"], sig["position"].shift(1).fillna(0)):
        if p == 1 and prev == 0:
            entry = px
        elif p == 0 and prev == 1 and entry is not None:
            trades.append(px / entry - 1)
            entry = None
    wins = sum(t > 0 for t in trades)

    return Result(
        symbol=symbol,
        total_return=total,
        cagr=float((1 + total) ** (1 / years) - 1) if total > -1 else -1.0,
        max_drawdown=_max_dd(equity),
        sharpe=sharpe,
        exposure=float(pos.mean()),
        trades=len(trades),
        win_rate=wins / len(trades) if trades else 0.0,
        bh_total_return=float(bh.iloc[-1] - 1),
        bh_max_drawdown=_max_dd(bh),
    )


def load_yahoo(symbol: str, years: int) -> pd.DataFrame:
    import yfinance as yf

    df = yf.download(symbol, period=f"{years}y", interval="1d", auto_adjust=True, progress=False)
    if df.empty:
        raise RuntimeError(f"no data for {symbol}")
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)
    return df.rename(columns=str.lower)[["open", "high", "low", "close", "volume"]].dropna()
