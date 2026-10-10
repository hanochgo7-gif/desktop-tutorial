"""Command line entry point.

  python run.py check                 connect read-only, print account and signals
  python run.py run                   one agent pass (honours dry_run in config)
  python run.py backtest SPY QQQ -y 10
"""
from __future__ import annotations

import argparse
import logging
import sys
from dataclasses import replace

from agent.backtest import Result, backtest, load_yahoo
from agent.config import load_config


def main() -> int:
    p = argparse.ArgumentParser(description="IBKR technical trading agent")
    p.add_argument("-c", "--config", default="config.yaml")
    sub = p.add_subparsers(dest="cmd", required=True)
    sub.add_parser("check", help="read-only: connect, show account and current signals")
    sub.add_parser("run", help="run one trading pass")
    bt = sub.add_parser("backtest", help="backtest on Yahoo Finance daily data")
    bt.add_argument("symbols", nargs="*", help="defaults to the config universe")
    bt.add_argument("-y", "--years", type=int, default=10)
    bt.add_argument("--cost-bps", type=float, default=5)
    args = p.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    cfg = load_config(args.config)

    if args.cmd == "backtest":
        symbols = args.symbols or [i.symbol for i in cfg.universe]
        print(Result.HEADER)
        for s in symbols:
            try:
                print(backtest(load_yahoo(s, args.years), cfg.strategy, s, args.cost_bps).row())
            except Exception as e:
                print(f"{s:<8} error: {e}")
        return 0

    from agent.runner import run_once

    if args.cmd == "check":
        cfg = replace(cfg, dry_run=True)
    run_once(cfg)
    return 0


if __name__ == "__main__":
    sys.exit(main())
