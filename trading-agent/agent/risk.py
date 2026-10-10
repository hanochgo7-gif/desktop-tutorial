"""Hard risk limits. Every order goes through here; nothing bypasses it.

Buys can be shrunk or refused. Sells that close a position the agent opened
are always allowed (exiting reduces risk), except when the kill switch is on.
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field

from .config import RiskConfig


@dataclass
class AccountSnapshot:
    equity: float          # net liquidation value
    cash: float
    gross_exposure: float  # sum of |market value| of all positions
    day_start_equity: float
    orders_today: int

    @property
    def daily_pnl_pct(self) -> float:
        if self.day_start_equity <= 0:
            return 0.0
        return (self.equity / self.day_start_equity - 1) * 100


@dataclass
class Decision:
    qty: int
    notes: list[str] = field(default_factory=list)

    @property
    def approved(self) -> bool:
        return self.qty > 0


class RiskManager:
    def __init__(self, cfg: RiskConfig, atr_stop_mult: float):
        self.cfg = cfg
        self.atr_stop_mult = atr_stop_mult

    def size_buy(self, price: float, atr: float, acct: AccountSnapshot) -> Decision:
        """Volatility-based size: lose ~risk_per_trade_pct of equity if the stop hits."""
        c = self.cfg
        notes: list[str] = []

        if acct.daily_pnl_pct <= -c.max_daily_loss_pct:
            return Decision(0, [f"daily loss {acct.daily_pnl_pct:.2f}% hit limit -{c.max_daily_loss_pct}%"])
        if acct.orders_today >= c.max_orders_per_day:
            return Decision(0, [f"max orders per day ({c.max_orders_per_day}) reached"])
        if price <= 0 or atr <= 0 or not math.isfinite(atr):
            return Decision(0, ["invalid price/ATR"])

        risk_budget = acct.equity * c.risk_per_trade_pct / 100
        qty = math.floor(risk_budget / (self.atr_stop_mult * atr))
        notes.append(f"risk sizing -> {qty}")

        caps = {
            "max_position_pct": acct.equity * c.max_position_pct / 100,
            "max_gross_exposure_pct": acct.equity * c.max_gross_exposure_pct / 100 - acct.gross_exposure,
            "min_cash_pct": acct.cash - acct.equity * c.min_cash_pct / 100,
        }
        for name, dollars in caps.items():
            cap_qty = max(0, math.floor(dollars / price))
            if cap_qty < qty:
                qty = cap_qty
                notes.append(f"capped by {name} -> {qty}")

        return Decision(max(qty, 0), notes)

    def limit_price(self, side: str, last: float) -> float:
        off = self.cfg.limit_offset_pct / 100
        px = last * (1 + off) if side == "BUY" else last * (1 - off)
        return round(px, 2)
