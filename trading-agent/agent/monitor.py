"""Monitoring: daily equity log, performance report, alerts, drift warnings.

Alerts go to the log always, and to Telegram when TELEGRAM_BOT_TOKEN and
TELEGRAM_CHAT_ID are set in the environment.
"""
from __future__ import annotations

import csv
import json
import logging
import os
import urllib.parse
import urllib.request
from datetime import date

import numpy as np
import pandas as pd

from .config import Config

log = logging.getLogger("agent.monitor")


class Notifier:
    def __init__(self, enabled: bool = True):
        self.token = os.environ.get("TELEGRAM_BOT_TOKEN", "")
        self.chat = os.environ.get("TELEGRAM_CHAT_ID", "")
        self.enabled = enabled and bool(self.token and self.chat)
        self.sent: list[str] = []

    def send(self, text: str, level: int = logging.WARNING) -> None:
        log.log(level, "ALERT: %s", text)
        self.sent.append(text)
        if not self.enabled:
            return
        try:
            data = urllib.parse.urlencode({"chat_id": self.chat, "text": f"[trading-agent] {text}"}).encode()
            urllib.request.urlopen(f"https://api.telegram.org/bot{self.token}/sendMessage", data, timeout=10)
        except Exception as e:  # alerts must never break trading
            log.error("telegram alert failed: %s", e)


def record_equity(state_dir, equity: float, cash: float, gross: float, managed: dict) -> None:
    """One row per day in state/equity.csv (re-running the same day overwrites it)."""
    path = state_dir / "equity.csv"
    today = date.today().isoformat()
    rows = []
    if path.exists():
        with path.open() as f:
            rows = [r for r in csv.DictReader(f) if r["date"] != today]
    rows.append({"date": today, "equity": round(equity, 2), "cash": round(cash, 2),
                 "gross": round(gross, 2), "managed": json.dumps(managed)})
    with path.open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["date", "equity", "cash", "gross", "managed"])
        w.writeheader()
        w.writerows(rows)


def load_equity(state_dir) -> pd.Series:
    path = state_dir / "equity.csv"
    if not path.exists():
        return pd.Series(dtype=float)
    df = pd.read_csv(path, parse_dates=["date"]).set_index("date")
    return df["equity"].astype(float)


def load_journal(state_dir) -> pd.DataFrame:
    path = state_dir / "journal.csv"
    return pd.read_csv(path) if path.exists() else pd.DataFrame()


def live_stats(equity: pd.Series) -> dict:
    out = {"days": len(equity)}
    if equity.empty:
        return out
    r = equity.pct_change().dropna()
    out.update(
        nav=float(equity.iloc[-1]),
        peak=float(equity.max()),
        drawdown=float(equity.iloc[-1] / equity.max() - 1),
        max_drawdown=float((equity / equity.cummax() - 1).min()),
        total_return=float(equity.iloc[-1] / equity.iloc[0] - 1),
    )
    if len(r) >= 20 and r.std() > 0:
        out["sharpe"] = float(r.mean() / r.std() * np.sqrt(252))
        r60 = r.tail(60)
        out["sharpe_60d"] = float(r60.mean() / r60.std() * np.sqrt(252)) if r60.std() > 0 else 0.0
    return out


def drift_warnings(cfg: Config, equity: pd.Series, journal: pd.DataFrame) -> list[str]:
    """Signs that live trading is not behaving like the backtest."""
    m = cfg.monitor
    warn = []
    s = live_stats(equity)
    if "drawdown" in s and m.expected_max_drawdown_pct and s["drawdown"] * 100 <= -m.expected_max_drawdown_pct:
        warn.append(f"drawdown {s['drawdown']:.1%} is beyond the backtest's worst "
                    f"(-{m.expected_max_drawdown_pct}%): review before the hard limit "
                    f"(-{cfg.risk.max_drawdown_pct}%) liquidates")
    if s.get("sharpe_60d") is not None and s["sharpe_60d"] < m.min_sharpe_60d:
        warn.append(f"60-day Sharpe {s['sharpe_60d']:.2f} below {m.min_sharpe_60d}")
    if not journal.empty and "slippage_bps" in journal:
        slip = pd.to_numeric(journal["slippage_bps"], errors="coerce").dropna().tail(20)
        if len(slip) >= 5 and slip.mean() > m.max_avg_slippage_bps:
            warn.append(f"average slippage {slip.mean():.1f} bps over last {len(slip)} fills "
                        f"(backtest assumes ~{m.max_avg_slippage_bps:.0f})")
    if not journal.empty:
        recent = journal.tail(50)
        errors = (recent["action"] == "ERROR").sum()
        if errors >= m.max_recent_errors:
            warn.append(f"{errors} errors in the last 50 journal rows")
    return warn


def report(cfg: Config) -> str:
    sd = cfg.state_dir
    equity, journal = load_equity(sd), load_journal(sd)
    s = live_stats(equity)
    lines = [f"Trading agent report - {date.today()}  (mode={cfg.mode}, dry_run={cfg.dry_run})"]
    if (sd / "STOP").exists():
        lines.append(f"!! KILL SWITCH ON: {(sd / 'STOP').read_text().strip()}")
    if s["days"] == 0:
        lines.append("No equity history yet (state/equity.csv). Run the agent first.")
    else:
        lines += [
            f"NAV {s['nav']:,.2f}   peak {s['peak']:,.2f}   drawdown {s['drawdown']:.1%}   "
            f"max drawdown {s['max_drawdown']:.1%}",
            f"return since {equity.index[0].date()}: {s['total_return']:+.1%} over {s['days']} days",
        ]
        if "sharpe" in s:
            lines.append(f"Sharpe (all) {s['sharpe']:.2f}   Sharpe (60d) {s['sharpe_60d']:.2f}")
        else:
            lines.append("Sharpe: needs 20+ days of history")
    managed = json.loads((sd / "managed.json").read_text()) if (sd / "managed.json").exists() else {}
    lines.append(f"positions managed by the agent: {managed or 'none'}")
    if not journal.empty:
        filled = journal[journal["status"].astype(str).str.startswith(("filled", "partial"))]
        slip = pd.to_numeric(filled.get("slippage_bps"), errors="coerce").dropna()
        notes = journal["notes"].fillna("").astype(str)
        lines += [
            f"orders filled: {len(filled)} (buys {int((filled['action'] == 'BUY').sum())}, "
            f"sells {int((filled['action'] == 'SELL').sum())})"
            + (f", avg slippage {slip.mean():.1f} bps" if len(slip) else ""),
            f"refused: {int((journal['status'] == 'refused').sum())}  "
            f"(Claude vetoes: {int(notes.str.contains('claude vetoed').sum())})  "
            f"errors: {int((journal['action'] == 'ERROR').sum())}",
        ]
    for w in drift_warnings(cfg, equity, journal):
        lines.append(f"WARNING: {w}")
    return "\n".join(lines)
