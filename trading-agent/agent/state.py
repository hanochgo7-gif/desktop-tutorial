"""Persistent state: which shares the agent owns, daily counters, trade journal.

The agent only ever sells shares it bought itself (tracked in managed.json),
so positions you already hold in the account are never touched.
"""
from __future__ import annotations

import csv
import json
from datetime import date, datetime, timezone
from pathlib import Path


class State:
    def __init__(self, root: Path):
        self.root = Path(root)
        self.root.mkdir(parents=True, exist_ok=True)
        self._managed_path = self.root / "managed.json"
        self._daily_path = self.root / "daily.json"
        self.journal_path = self.root / "journal.csv"

    @property
    def kill_switch(self) -> bool:
        return (self.root / "STOP").exists()

    # --- shares owned by the agent -------------------------------------------
    def managed(self) -> dict[str, int]:
        if not self._managed_path.exists():
            return {}
        return {k: int(v) for k, v in json.loads(self._managed_path.read_text()).items()}

    def add_managed(self, symbol: str, qty: int) -> None:
        m = self.managed()
        m[symbol] = m.get(symbol, 0) + qty
        if m[symbol] <= 0:
            m.pop(symbol)
        self._managed_path.write_text(json.dumps(m, indent=2))

    def set_managed(self, symbol: str, qty: int) -> None:
        m = self.managed()
        if qty > 0:
            m[symbol] = qty
        else:
            m.pop(symbol, None)
        self._managed_path.write_text(json.dumps(m, indent=2))

    # --- account high-water mark (for the max drawdown limit) -----------------
    def peak_equity(self, equity_now: float) -> float:
        path = self.root / "peak.json"
        peak = json.loads(path.read_text())["peak"] if path.exists() else 0.0
        if equity_now > peak:
            peak = equity_now
            path.write_text(json.dumps({"peak": peak}))
        return peak

    def trip_kill_switch(self, reason: str) -> None:
        (self.root / "STOP").write_text(reason + "\n")

    # --- Claude vetoes (so a vetoed buy is not re-asked every day) -------------
    def record_veto(self, symbol: str) -> None:
        path = self.root / "vetoes.json"
        v = json.loads(path.read_text()) if path.exists() else {}
        v[symbol] = date.today().isoformat()
        path.write_text(json.dumps(v, indent=2))

    def vetoed_recently(self, symbol: str, days: int) -> bool:
        path = self.root / "vetoes.json"
        if not path.exists():
            return False
        when = json.loads(path.read_text()).get(symbol)
        return bool(when) and (date.today() - date.fromisoformat(when)).days < days

    # --- last exit per symbol (cooldown before re-entering) ----------------------
    def record_exit(self, symbol: str) -> None:
        path = self.root / "exits.json"
        v = json.loads(path.read_text()) if path.exists() else {}
        v[symbol] = date.today().isoformat()
        path.write_text(json.dumps(v, indent=2))

    def exited_within(self, symbol: str, business_days: int) -> bool:
        path = self.root / "exits.json"
        if not path.exists() or business_days <= 0:
            return False
        when = json.loads(path.read_text()).get(symbol)
        if not when:
            return False
        import numpy as np
        return int(np.busday_count(date.fromisoformat(when), date.today())) < business_days

    # --- per-day counters ----------------------------------------------------
    def daily(self, equity_now: float) -> dict:
        today = date.today().isoformat()
        d = json.loads(self._daily_path.read_text()) if self._daily_path.exists() else {}
        if d.get("date") != today:
            d = {"date": today, "start_equity": equity_now, "orders": 0}
            self._daily_path.write_text(json.dumps(d, indent=2))
        return d

    def count_order(self) -> None:
        d = json.loads(self._daily_path.read_text())
        d["orders"] += 1
        self._daily_path.write_text(json.dumps(d, indent=2))

    # --- journal -------------------------------------------------------------
    def log(self, **row) -> None:
        row = {"time": datetime.now(timezone.utc).isoformat(timespec="seconds"), **row}
        fields = ["time", "symbol", "action", "qty", "price", "fill_price", "slippage_bps",
                  "status", "reason", "notes"]
        new = not self.journal_path.exists()
        with self.journal_path.open("a", newline="") as f:
            w = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
            if new:
                w.writeheader()
            w.writerow(row)
