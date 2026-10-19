"""Long-only trend-following strategy on daily bars.

Entry: fast SMA crosses above slow SMA ("cross" mode), or fast > slow
       ("trend" mode), while every enabled filter passes:
       RSI not overbought, optional SMA-trend, MACD, volume and market regime.
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


def ema(close: pd.Series, n: int) -> pd.Series:
    return close.ewm(span=n, min_periods=n, adjust=False).mean()


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


def macd(close: pd.Series, fast: int = 12, slow: int = 26, signal: int = 9) -> pd.DataFrame:
    line = ema(close, fast) - ema(close, slow)
    sig = ema(line, signal)
    return pd.DataFrame({"macd": line, "macd_signal": sig, "macd_hist": line - sig})


def regime_filter(benchmark: pd.DataFrame, n: int) -> pd.Series:
    """True on days the benchmark closes above its n-day SMA."""
    return benchmark["close"] > sma(benchmark["close"], n)


@dataclass
class Signal:
    in_position: bool   # desired state after the latest bar
    reason: str
    close: float
    atr: float
    stop: float | None  # current trailing stop when in position


def indicators(df: pd.DataFrame, cfg: StrategyConfig) -> pd.DataFrame:
    out = df.copy()
    c = out["close"]
    out["fast"] = sma(c, cfg.fast_sma)
    out["slow"] = sma(c, cfg.slow_sma)
    out["rsi"] = rsi(c, cfg.rsi_period)
    out["atr"] = atr(out, cfg.atr_period)
    out = out.join(macd(c))
    out["sma150"] = sma(c, 150)
    out["sma200"] = sma(c, 200)
    vol = out["volume"].astype(float) if "volume" in out else pd.Series(np.nan, index=out.index)
    out["vol_ratio"] = vol / vol.rolling(20, min_periods=20).mean()
    if cfg.trend_sma:
        out["trend"] = sma(c, cfg.trend_sma)
    return out


def entry_filters(out: pd.DataFrame, cfg: StrategyConfig, regime: pd.Series | None) -> pd.Series:
    ok = out["rsi"] <= cfg.rsi_max_entry
    if cfg.trend_sma:
        ok &= (out["close"] > out["trend"]) & (out["trend"] > out["trend"].shift(20))
    if cfg.macd_confirm:
        ok &= out["macd_hist"] > 0
    if cfg.min_volume_ratio:
        ok &= out["vol_ratio"] >= cfg.min_volume_ratio
    if cfg.regime_symbol:
        # No regime data for a day means no entries that day (fail closed).
        aligned = regime.reindex(out.index).ffill() if regime is not None else None
        ok &= aligned.fillna(False).astype(bool) if aligned is not None else False
    return ok.fillna(False)


def compute(df: pd.DataFrame, cfg: StrategyConfig, regime: pd.Series | None = None) -> pd.DataFrame:
    """Return df with indicator columns plus `position` (0/1) and `reason`.

    `position` on bar t is the state decided at the close of bar t; a backtest
    must apply it to bar t+1's return to avoid look-ahead bias.
    """
    out = indicators(df, cfg)
    allowed = entry_filters(out, cfg, regime).to_numpy()
    fast, slow, a, close = (out[c].to_numpy() for c in ("fast", "slow", "atr", "close"))
    position = np.zeros(len(out), dtype=int)
    stop = np.full(len(out), np.nan)
    reason = np.full(len(out), "", dtype=object)

    held, peak, last_exit = False, 0.0, -10**9
    for i in range(1, len(out)):
        if np.isnan(slow[i - 1]) or np.isnan(a[i]):
            continue
        cross_up = fast[i - 1] <= slow[i - 1] and fast[i] > slow[i]
        cross_down = fast[i - 1] >= slow[i - 1] and fast[i] < slow[i]
        if not held:
            if cfg.entry_mode == "cross":
                trigger, why = cross_up, "entry: SMA cross up"
            else:
                trigger = fast[i] > slow[i] and i - last_exit >= cfg.cooldown_bars
                why = "entry: uptrend"
            if trigger and allowed[i]:
                held, peak = True, close[i]
                reason[i] = why
        else:
            peak = max(peak, close[i])
            trail = peak - cfg.atr_stop_mult * a[i]
            if cross_down:
                held, last_exit, reason[i] = False, i, "exit: SMA cross down"
            elif close[i] < trail:
                held, last_exit, reason[i] = False, i, "exit: ATR trailing stop"
            else:
                stop[i] = trail
        position[i] = int(held)

    out["position"] = position
    out["stop"] = stop
    out["reason"] = reason
    return out


def latest_signal(df: pd.DataFrame, cfg: StrategyConfig, regime: pd.Series | None = None) -> Signal:
    need = max(cfg.slow_sma, cfg.trend_sma + 20 if cfg.trend_sma else 0) + 2
    if len(df) < need:
        raise ValueError(f"need at least {need} bars, got {len(df)}")
    last = compute(df, cfg, regime).iloc[-1]
    return Signal(
        in_position=bool(last["position"]),
        reason=last["reason"] or ("hold" if last["position"] else "flat"),
        close=float(last["close"]),
        atr=float(last["atr"]),
        stop=None if np.isnan(last["stop"]) else float(last["stop"]),
    )
