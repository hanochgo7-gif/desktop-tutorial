"""Data quality checks and a point-in-time (bitemporal) bar store.

clean_bars() rejects data the strategy must not trade on.
BarStore keeps every version of every bar with the time we learned it, so any
past decision can be replayed with exactly the data that was known then.
"""
from __future__ import annotations

import sqlite3
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd

OHLC = ["open", "high", "low", "close"]


@dataclass
class Quality:
    issues: list[str] = field(default_factory=list)  # cleaned up, logged
    fatal: list[str] = field(default_factory=list)   # do not trade this symbol today

    @property
    def ok(self) -> bool:
        return not self.fatal


def clean_bars(df: pd.DataFrame, max_jump: float = 0.4, max_stale_days: int = 5,
               today: pd.Timestamp | None = None) -> tuple[pd.DataFrame, Quality]:
    q = Quality()
    out = df.sort_index()

    dups = out.index.duplicated(keep="last")
    if dups.any():
        q.issues.append(f"dropped {dups.sum()} duplicate dates")
        out = out[~dups]

    bad = out[OHLC].isna().any(axis=1) | (out[OHLC] <= 0).any(axis=1)
    if bad.any():
        q.issues.append(f"dropped {bad.sum()} bars with missing/non-positive prices")
        out = out[~bad]

    inverted = out["high"] < out["low"]
    if inverted.any():
        q.issues.append(f"dropped {inverted.sum()} bars with high < low")
        out = out[~inverted]

    # Keep high/low consistent with open/close (some feeds report them slightly off).
    out = out.assign(
        high=out[OHLC].max(axis=1),
        low=out[OHLC].min(axis=1),
        volume=out["volume"].fillna(0) if "volume" in out else 0,
    )

    if out.empty:
        q.fatal.append("no valid bars")
        return out, q

    # A huge one-day gap in recent history usually means an unadjusted split or
    # a bad tick; indicators across it are meaningless.
    jumps = out["close"].pct_change().abs().tail(60)
    if (jumps > max_jump).any():
        when = jumps[jumps > max_jump].index[-1].date()
        q.fatal.append(f"{jumps.max():.0%} one-day move on {when}: possible split/bad data")

    today = pd.Timestamp(today or pd.Timestamp.now().normalize())
    age = np.busday_count(out.index[-1].date(), today.date())
    if age > max_stale_days:
        q.fatal.append(f"stale data: last bar {out.index[-1].date()} is {age} business days old")

    return out, q


class BarStore:
    """SQLite bitemporal store: (symbol, date) is when it happened, known_at is when we saw it."""

    def __init__(self, path: Path):
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        self.db = sqlite3.connect(path)
        self.db.execute("""
            CREATE TABLE IF NOT EXISTS bars (
                symbol TEXT, date TEXT, known_at TEXT,
                open REAL, high REAL, low REAL, close REAL, volume REAL,
                PRIMARY KEY (symbol, date, known_at))""")

    def save(self, symbol: str, df: pd.DataFrame, known_at: datetime | None = None) -> int:
        """Store bars that are new or changed since the last version. Returns rows written."""
        known = (known_at or datetime.now(timezone.utc)).isoformat(timespec="seconds")
        latest = self.as_of(symbol)
        rows = []
        for ts, r in df.iterrows():
            d = ts.date().isoformat()
            vals = tuple(float(r[c]) for c in (*OHLC, "volume"))
            if d in latest.index:
                prev = tuple(float(latest.loc[d, c]) for c in (*OHLC, "volume"))
                if np.allclose(prev, vals, rtol=1e-9, atol=1e-9):
                    continue
            rows.append((symbol, d, known, *vals))
        self.db.executemany("INSERT OR REPLACE INTO bars VALUES (?,?,?,?,?,?,?,?)", rows)
        self.db.commit()
        return len(rows)

    def as_of(self, symbol: str, known_at: datetime | str | None = None) -> pd.DataFrame:
        """Bars as they were known at `known_at` (default: now)."""
        cutoff = known_at.isoformat(timespec="seconds") if isinstance(known_at, datetime) else known_at
        cutoff = cutoff or "9999"
        q = """
            SELECT b.date, b.open, b.high, b.low, b.close, b.volume FROM bars b
            JOIN (SELECT date, MAX(known_at) k FROM bars
                  WHERE symbol = ? AND known_at <= ? GROUP BY date) v
              ON b.date = v.date AND b.known_at = v.k
            WHERE b.symbol = ? ORDER BY b.date"""
        df = pd.read_sql_query(q, self.db, params=(symbol, cutoff, symbol))
        return df.set_index("date")
