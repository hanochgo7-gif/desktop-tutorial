"""Backtesting and validation: KPIs, portfolio view, benchmarks, walk-forward, A/B.

Every function is causal: positions decided at the close of bar t earn bar
t+1's return, and walk-forward picks parameters using only past windows.
Note: backtests run on today's list of symbols, which is survivorship-biased
(companies that later failed are missing). Treat results as optimistic.
"""
from __future__ import annotations

import itertools
from dataclasses import dataclass, replace
from pathlib import Path

import numpy as np
import pandas as pd

from .config import StrategyConfig
from .strategy import compute

TRADING_DAYS = 252


# --- metrics -------------------------------------------------------------------
def max_drawdown(returns: pd.Series) -> float:
    equity = (1 + returns).cumprod()
    return float((equity / equity.cummax() - 1).min()) if len(equity) else 0.0


def metrics(returns: pd.Series, rf: pd.Series | None = None) -> dict:
    """KPIs. Sharpe and Sortino use returns in excess of `rf` (daily risk-free rate) when given."""
    r = returns.dropna()
    if r.empty:
        return dict(total=0.0, cagr=0.0, max_dd=0.0, sharpe=0.0, sortino=0.0, vol=0.0)
    total = float((1 + r).prod() - 1)
    years = len(r) / TRADING_DAYS
    ex = r - rf.reindex(r.index).ffill().fillna(0) if rf is not None else r
    # Downside deviation: RMS of negative excess returns over all days (target 0).
    downside = float(np.sqrt((ex.clip(upper=0) ** 2).mean()) * np.sqrt(TRADING_DAYS))
    ann = ex.mean() * TRADING_DAYS
    return dict(
        total=total,
        cagr=float((1 + total) ** (1 / years) - 1) if total > -1 and years > 0 else -1.0,
        max_dd=max_drawdown(r),
        sharpe=float(ann / (r.std() * np.sqrt(TRADING_DAYS))) if r.std() > 0 else 0.0,
        sortino=float(ann / downside) if downside > 0 else 0.0,
        vol=float(r.std() * np.sqrt(TRADING_DAYS)),
    )


def trade_stats(sig: pd.DataFrame) -> dict:
    """Round-trip trades from entry/exit closes: hit rate, payoff (avg win / avg loss), profit factor."""
    trades, entry = [], None
    pos = sig["position"].to_numpy()
    close = sig["close"].to_numpy()
    for i in range(1, len(pos)):
        if pos[i] == 1 and pos[i - 1] == 0:
            entry = close[i]
        elif pos[i] == 0 and pos[i - 1] == 1 and entry is not None:
            trades.append(close[i] / entry - 1)
            entry = None
    t = np.array(trades)
    wins, losses = t[t > 0], t[t <= 0]
    return dict(
        trades=len(t),
        win_rate=float(len(wins) / len(t)) if len(t) else 0.0,
        avg_win=float(wins.mean()) if len(wins) else 0.0,
        avg_loss=float(losses.mean()) if len(losses) else 0.0,
        payoff=float(wins.mean() / -losses.mean()) if len(wins) and len(losses) and losses.mean() < 0 else 0.0,
        profit_factor=float(wins.sum() / -losses.sum()) if len(losses) and losses.sum() < 0 else 0.0,
    )


# --- single symbol ---------------------------------------------------------------
def strategy_returns(df: pd.DataFrame, cfg: StrategyConfig, cost_bps: float = 5,
                     regime: pd.Series | None = None,
                     cash: pd.Series | None = None) -> tuple[pd.Series, pd.DataFrame]:
    """Daily returns; idle capital earns `cash` (daily T-bill rate) when given, else 0."""
    sig = compute(df, cfg, regime)
    ret = sig["close"].pct_change().fillna(0)
    pos = sig["position"].shift(1).fillna(0)  # decision at close t is held over bar t+1
    turnover = sig["position"].diff().abs().fillna(0).shift(1).fillna(0)
    idle = (1 - pos) * cash.reindex(sig.index).ffill().fillna(0) if cash is not None else 0
    return pos * ret + idle - turnover * cost_bps / 10_000, sig


def tbill_daily(years: int, cache_dir: Path | None = None) -> pd.Series:
    """Daily cash return from the 13-week T-bill yield (^IRX, percent annualised)."""
    irx = load_yahoo("^IRX", years, cache_dir)["close"]
    return (irx / 100 / TRADING_DAYS).clip(lower=0)


@dataclass
class Result:
    symbol: str
    total_return: float
    cagr: float
    max_drawdown: float
    sharpe: float
    sortino: float
    exposure: float
    trades: int
    win_rate: float
    payoff: float
    profit_factor: float
    bh_total_return: float
    bh_max_drawdown: float

    HEADER = (f"{'symbol':<8} {'return':>8} {'CAGR':>7} {'maxDD':>8} {'sharpe':>6} {'sortino':>7} "
              f"{'expo':>5} {'trades':>6} {'win%':>5} {'payoff':>6} {'PF':>5} | {'B&H ret':>8} {'B&H DD':>8}")

    def row(self) -> str:
        return (f"{self.symbol:<8} {self.total_return:>8.1%} {self.cagr:>7.1%} {self.max_drawdown:>8.1%} "
                f"{self.sharpe:>6.2f} {self.sortino:>7.2f} {self.exposure:>5.0%} {self.trades:>6d} "
                f"{self.win_rate:>5.0%} {self.payoff:>6.2f} {self.profit_factor:>5.2f} | "
                f"{self.bh_total_return:>8.1%} {self.bh_max_drawdown:>8.1%}")


def backtest(df: pd.DataFrame, cfg: StrategyConfig, symbol: str = "", cost_bps: float = 5,
             regime: pd.Series | None = None, cash: pd.Series | None = None) -> Result:
    strat, sig = strategy_returns(df, cfg, cost_bps, regime, cash)
    m, t = metrics(strat, cash), trade_stats(sig)
    bh = sig["close"].pct_change().fillna(0)
    return Result(
        symbol=symbol, total_return=m["total"], cagr=m["cagr"], max_drawdown=m["max_dd"],
        sharpe=m["sharpe"], sortino=m["sortino"], exposure=float(sig["position"].mean()),
        trades=t["trades"], win_rate=t["win_rate"], payoff=t["payoff"],
        profit_factor=t["profit_factor"], bh_total_return=metrics(bh)["total"],
        bh_max_drawdown=max_drawdown(bh),
    )


# --- portfolio ---------------------------------------------------------------------
def portfolio_returns(data: dict[str, pd.DataFrame], cfg: StrategyConfig, cost_bps: float = 5,
                      regime: pd.Series | None = None, cash: pd.Series | None = None) -> pd.Series:
    """Equal-weight sleeves: each symbol gets 1/N of capital, idle sleeves hold cash."""
    cols = {s: strategy_returns(df, cfg, cost_bps, regime, cash)[0] for s, df in data.items()}
    return pd.DataFrame(cols).fillna(0).mean(axis=1)


def buy_hold_returns(data: dict[str, pd.DataFrame]) -> pd.Series:
    return pd.DataFrame({s: df["close"].pct_change() for s, df in data.items()}).fillna(0).mean(axis=1)


def sixty_forty(stocks: pd.DataFrame, bonds: pd.DataFrame) -> pd.Series:
    """60/40 benchmark, rebalanced daily (close enough to monthly for comparison)."""
    r = pd.DataFrame({"s": stocks["close"].pct_change(), "b": bonds["close"].pct_change()}).dropna()
    return 0.6 * r["s"] + 0.4 * r["b"]


def summary_row(name: str, r: pd.Series, rf: pd.Series | None = None) -> str:
    m = metrics(r, rf)
    return (f"{name:<22} {m['cagr']:>7.1%} {m['vol']:>6.1%} {m['max_dd']:>8.1%} "
            f"{m['sharpe']:>6.2f} {m['sortino']:>7.2f}")


SUMMARY_HEADER = f"{'':<22} {'CAGR':>7} {'vol':>6} {'maxDD':>8} {'sharpe':>6} {'sortino':>7}"


# --- A/B: compare strategy variants ---------------------------------------------------
def parse_overrides(spec: str) -> dict:
    """"fast_sma=10,entry_mode=trend" -> {"fast_sma": 10, "entry_mode": "trend"}"""
    out = {}
    for part in filter(None, spec.split(",")):
        k, v = part.split("=", 1)
        for cast in (int, float):
            try:
                v = cast(v)
                break
            except ValueError:
                continue
        if v in ("true", "false"):
            v = v == "true"
        out[k.strip()] = v
    return out


def compare(data: dict[str, pd.DataFrame], base: StrategyConfig, variants: dict[str, dict],
            cost_bps: float = 5, regime: pd.Series | None = None,
            cash: pd.Series | None = None) -> dict[str, pd.Series]:
    results = {}
    for name, overrides in {"base": {}, **variants}.items():
        cfg = replace(base, **overrides)
        results[name] = portfolio_returns(data, cfg, cost_bps, regime if cfg.regime_symbol else None, cash)
    return results


# --- walk-forward -------------------------------------------------------------------------
DEFAULT_GRID = {
    "fast_sma": [10, 20, 50],
    "slow_sma": [50, 100, 200],
    "atr_stop_mult": [2.0, 3.0, 4.0],
    "entry_mode": ["cross", "trend"],
}


@dataclass
class WalkForward:
    oos_returns: pd.Series          # stitched out-of-sample returns
    windows: list[dict]             # per window: dates, chosen params, in/out-of-sample Sharpe


def walk_forward(data: dict[str, pd.DataFrame], base: StrategyConfig, grid: dict | None = None,
                 train_years: int = 3, test_years: int = 1, cost_bps: float = 5,
                 cash: pd.Series | None = None) -> WalkForward:
    """Rolling: pick the best-Sharpe parameters on `train_years`, trade them on the next `test_years`."""
    grid = grid or DEFAULT_GRID
    keys = list(grid)
    combos = [dict(zip(keys, vals)) for vals in itertools.product(*grid.values())]
    combos = [c for c in combos if c.get("fast_sma", base.fast_sma) < c.get("slow_sma", base.slow_sma)]

    # Positions are causal, so computing each combo once over full history is safe.
    series = {i: portfolio_returns(data, replace(base, **c), cost_bps, cash=cash) for i, c in enumerate(combos)}
    idx = next(iter(series.values())).index
    warmup = idx[0] + pd.DateOffset(years=1)  # indicators need history before the first window

    windows, oos = [], []
    t0 = warmup
    while True:
        train_end = t0 + pd.DateOffset(years=train_years)
        test_end = train_end + pd.DateOffset(years=test_years)
        if train_end >= idx[-1]:
            break
        scores = {i: metrics(r[(r.index >= t0) & (r.index < train_end)], cash)["sharpe"]
                  for i, r in series.items()}
        best = max(scores, key=scores.get)
        test = series[best][(series[best].index >= train_end) & (series[best].index < test_end)]
        if test.empty:
            break
        oos.append(test)
        windows.append(dict(train=f"{t0.date()}..{train_end.date()}", test=f"{train_end.date()}..{test.index[-1].date()}",
                            params=combos[best], train_sharpe=scores[best],
                            test_sharpe=metrics(test, cash)["sharpe"]))
        t0 = t0 + pd.DateOffset(years=test_years)
    return WalkForward(pd.concat(oos) if oos else pd.Series(dtype=float), windows)


# --- data -------------------------------------------------------------------------------------
def load_yahoo(symbol: str, years: int, cache_dir: Path | None = None) -> pd.DataFrame:
    cache = Path(cache_dir) / f"{symbol}_{years}y_{pd.Timestamp.today().date()}.csv" if cache_dir else None
    if cache and cache.exists():
        return pd.read_csv(cache, index_col=0, parse_dates=True)
    import yfinance as yf

    df = yf.download(symbol, period=f"{years}y", interval="1d", auto_adjust=True, progress=False)
    if df.empty:
        raise RuntimeError(f"no data for {symbol}")
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)
    df = df.rename(columns=str.lower)[["open", "high", "low", "close", "volume"]].dropna()
    if cache:
        cache.parent.mkdir(parents=True, exist_ok=True)
        df.to_csv(cache)
    return df
