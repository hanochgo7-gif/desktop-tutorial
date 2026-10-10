"""Long-only trend-following strategy on daily bars.

Entry: fast SMA crosses above slow SMA while RSI is not overbought.
Exit:  fast SMA crosses below slow SMA, or close falls under a trailing
       ATR stop (highest close since entry - atr_stop_mult * ATR).

The same function drives both the backtest and the live agent, so what you
backtest is what trades.
"""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd

from .config import StrategyConfig


def sma(close: pd.Series, n: int) -> pd.Series:
    return close.rolling(n, min_periods=n).mean()


def rsi(close: pd.Series, n: int) -> pd.Series:
    delta = close.diff()
    gain = delta.clip(lower=0).ewm(alpha=1 / n, min_periods=n, adjust=False).mean()
    loss = (-delta.clip(upper=0)).ewm(alpha=1 / n, min_periods=n, adjust=False).mean()
    rs = gain / loss.replace(0, np.nan)
    return (100 - 100 / (1 + rs)).fillna(100.0).where(gain.notna())


def atr(df: pd.DataFrame, n: int) -> pd.Series:
    prev_close = df["close"].shift()
    tr = pd.concat(
        [df["high"] - df["low"], (df["high"] - prev_close).abs(), (df["low"] - prev_close).abs()],
        axis=1,
    ).max(axis=1)
    return tr.ewm(alpha=1 / n, min_periods=n, adjust=False).mean()


@dataclass
class Signal:
    in_position: bool   # desired state after the latest bar
    reason: str
    close: float
    atr: float
    stop: float | None  # current trailing stop when in position


def compute(df: pd.DataFrame, cfg: StrategyConfig) -> pd.DataFrame:
    """Return df with indicator columns plus `position` (0/1) and `reason`.

    `position` on bar t is the state decided at the close of bar t; a backtest
    must apply it to bar t+1's return to avoid look-ahead bias.
    """
    out = df.copy()
    out["fast"] = sma(out["close"], cfg.fast_sma)
    out["slow"] = sma(out["close"], cfg.slow_sma)
    out["rsi"] = rsi(out["close"], cfg.rsi_period)
    out["atr"] = atr(out, cfg.atr_period)

    fast, slow, r, a, close = (out[c].to_numpy() for c in ("fast", "slow", "rsi", "atr", "close"))
    position = np.zeros(len(out), dtype=int)
    stop = np.full(len(out), np.nan)
    reason = np.full(len(out), "", dtype=object)

    held, peak = False, 0.0
    for i in range(1, len(out)):
        if np.isnan(slow[i - 1]) or np.isnan(a[i]):
            continue
        cross_up = fast[i - 1] <= slow[i - 1] and fast[i] > slow[i]
        cross_down = fast[i - 1] >= slow[i - 1] and fast[i] < slow[i]
        if not held:
            if cross_up and r[i] <= cfg.rsi_max_entry:
                held, peak = True, close[i]
                reason[i] = "entry: SMA cross up"
        else:
            peak = max(peak, close[i])
            trail = peak - cfg.atr_stop_mult * a[i]
            if cross_down:
                held, reason[i] = False, "exit: SMA cross down"
            elif close[i] < trail:
                held, reason[i] = False, "exit: ATR trailing stop"
            else:
                stop[i] = trail
        position[i] = int(held)

    out["position"] = position
    out["stop"] = stop
    out["reason"] = reason
    return out


def latest_signal(df: pd.DataFrame, cfg: StrategyConfig) -> Signal:
    if len(df) < cfg.slow_sma + 2:
        raise ValueError(f"need at least {cfg.slow_sma + 2} bars, got {len(df)}")
    last = compute(df, cfg).iloc[-1]
    return Signal(
        in_position=bool(last["position"]),
        reason=last["reason"] or ("hold" if last["position"] else "flat"),
        close=float(last["close"]),
        atr=float(last["atr"]),
        stop=None if np.isnan(last["stop"]) else float(last["stop"]),
    )
