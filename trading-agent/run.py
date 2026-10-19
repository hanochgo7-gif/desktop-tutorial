"""Command line entry point.

  python run.py check                       connect read-only, print account and signals
  python run.py run                         one agent pass (honours dry_run in config)
  python run.py backtest [SYM ...] -y 10    per-symbol + portfolio vs buy&hold and 60/40
  python run.py compare -v trend:entry_mode=trend -v stage2:trend_sma=150
  python run.py walkforward -y 20           rolling parameter selection, out-of-sample only
  python run.py report                      live performance from the agent's own records
"""
from __future__ import annotations

import argparse
import logging
import sys
from dataclasses import replace

import pandas as pd

from agent import backtest as bt
from agent.config import load_config
from agent.strategy import regime_filter


def load_universe(cfg, symbols, years):
    cache = cfg.state_dir / "cache"
    data = {}
    for s in symbols:
        try:
            data[s] = bt.load_yahoo(s, years, cache)
        except Exception as e:
            print(f"{s:<8} error: {e}")
    regime = None
    if cfg.strategy.regime_symbol:
        regime = regime_filter(bt.load_yahoo(cfg.strategy.regime_symbol, years, cache), cfg.strategy.regime_sma)
    return data, regime


def common_window(series: dict[str, pd.Series], warmup_days: int = 252) -> dict[str, pd.Series]:
    """Clip every series to the same dates, after an indicator warm-up period."""
    start = max(s.index[0] for s in series.values()) + pd.tseries.offsets.BDay(warmup_days)
    end = min(s.index[-1] for s in series.values())
    return {k: s[(s.index >= start) & (s.index <= end)] for k, s in series.items()}


def benchmarks(cfg, years, data):
    cache = cfg.state_dir / "cache"
    out = {"buy & hold (same)": bt.buy_hold_returns(data)}  # benchmarks are fully invested: no cash leg
    try:
        out["60/40 SPY/AGG"] = bt.sixty_forty(bt.load_yahoo("SPY", years, cache), bt.load_yahoo("AGG", years, cache))
    except Exception as e:
        print(f"60/40 benchmark unavailable: {e}")
    return out


def print_summary(rows: dict[str, pd.Series], rf: pd.Series | None = None):
    rows = common_window(rows)
    first = next(iter(rows.values()))
    print(f"\n{first.index[0].date()} .. {first.index[-1].date()}"
          + ("  (Sharpe/Sortino in excess of T-bills)" if rf is not None else ""))
    print(bt.SUMMARY_HEADER)
    for name, r in rows.items():
        print(bt.summary_row(name, r, rf=rf))


def main() -> int:
    p = argparse.ArgumentParser(description="IBKR technical trading agent")
    p.add_argument("-c", "--config", default="config.yaml")
    sub = p.add_subparsers(dest="cmd", required=True)
    sub.add_parser("check", help="read-only: connect, show account and current signals")
    sub.add_parser("run", help="run one trading pass")
    sub.add_parser("report", help="live performance from state/equity.csv and the journal")
    for name in ("backtest", "compare", "walkforward"):
        sp = sub.add_parser(name)
        sp.add_argument("symbols", nargs="*", help="defaults to the config universe")
        sp.add_argument("-y", "--years", type=int, default=10)
        sp.add_argument("--cost-bps", type=float, default=5)
        sp.add_argument("--no-cash-yield", action="store_true",
                        help="idle cash earns 0%% instead of the T-bill rate")
        if name == "compare":
            sp.add_argument("-v", "--variant", action="append", default=[],
                            help="name:key=val,key=val (strategy settings to override)")
        if name == "walkforward":
            sp.add_argument("--train", type=int, default=3, help="training window, years")
            sp.add_argument("--test", type=int, default=1, help="test window, years")
    args = p.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    cfg = load_config(args.config)

    if args.cmd in ("backtest", "compare", "walkforward"):
        data, regime = load_universe(cfg, args.symbols or [i.symbol for i in cfg.universe], args.years)
        if not data:
            return 1
        cash = None if args.no_cash_yield else bt.tbill_daily(args.years, cfg.state_dir / "cache")

    if args.cmd == "backtest":
        print(bt.Result.HEADER)
        for s, df in data.items():
            print(bt.backtest(df, cfg.strategy, s, args.cost_bps, regime, cash).row())
        port = bt.portfolio_returns(data, cfg.strategy, args.cost_bps, regime, cash)
        print_summary({"strategy (equal weight)": port, **benchmarks(cfg, args.years, data)}, cash)
        return 0

    if args.cmd == "compare":
        variants = {}
        for v in args.variant:
            name, _, spec = v.partition(":")
            variants[name] = bt.parse_overrides(spec)
        res = bt.compare(data, cfg.strategy, variants, args.cost_bps, regime, cash)
        if any(replace(cfg.strategy, **o).regime_symbol for o in variants.values()) and regime is None:
            # A variant turned the regime filter on: load its benchmark.
            sym = next(replace(cfg.strategy, **o).regime_symbol for o in variants.values()
                       if replace(cfg.strategy, **o).regime_symbol)
            reg = regime_filter(bt.load_yahoo(sym, args.years, cfg.state_dir / "cache"), cfg.strategy.regime_sma)
            res = bt.compare(data, cfg.strategy, variants, args.cost_bps, reg, cash)
        print_summary({**res, **benchmarks(cfg, args.years, data)}, cash)
        return 0

    if args.cmd == "walkforward":
        wf = bt.walk_forward(data, cfg.strategy, train_years=args.train, test_years=args.test,
                             cost_bps=args.cost_bps, cash=cash)
        print(f"{'test window':<25} {'chosen params':<48} {'train SR':>8} {'test SR':>8}")
        for w in wf.windows:
            print(f"{w['test']:<25} {str(w['params']):<48} {w['train_sharpe']:>8.2f} {w['test_sharpe']:>8.2f}")
        fixed = bt.portfolio_returns(data, cfg.strategy, args.cost_bps, cash=cash)
        rows = {"walk-forward (OOS)": wf.oos_returns, "fixed config params": fixed,
                **benchmarks(cfg, args.years, data)}
        start = wf.oos_returns.index[0]
        print_summary({k: v[v.index >= start] for k, v in rows.items()}, cash)
        return 0

    if args.cmd == "report":
        from agent.monitor import report
        print(report(cfg))
        return 0

    from agent.runner import run_once

    if args.cmd == "check":
        cfg = replace(cfg, dry_run=True)
    run_once(cfg)
    return 0


if __name__ == "__main__":
    sys.exit(main())
