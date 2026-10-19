"""Thin wrapper around ib_async with safety checks on what we connect to."""
from __future__ import annotations

import os
from datetime import date

import pandas as pd

from .config import Config, Instrument

PAPER_PORTS = {7497, 4002}
LIVE_PORTS = {7496, 4001}


class SafetyError(RuntimeError):
    pass


def check_connection_target(cfg: Config, account_id: str | None = None) -> None:
    """Refuse to trade on a live account unless explicitly asked to, twice."""
    port = cfg.ibkr.port
    if cfg.mode == "paper":
        if port in LIVE_PORTS:
            raise SafetyError(f"mode=paper but port {port} is a LIVE port")
        # IBKR paper account ids start with "D" (DU..., DF...); live ones with "U".
        if account_id is not None and not account_id.startswith("D"):
            raise SafetyError(f"mode=paper but account {account_id} is not a paper account")
    else:
        if os.environ.get("CONFIRM_LIVE_TRADING") != "yes":
            raise SafetyError("mode=live requires environment variable CONFIRM_LIVE_TRADING=yes")
        if port in PAPER_PORTS:
            raise SafetyError(f"mode=live but port {port} is a paper port")


class IBKRBroker:
    def __init__(self, cfg: Config):
        from ib_async import IB  # imported lazily so tests/backtests don't need it

        self.cfg = cfg
        self.ib = IB()
        self.account = ""
        self._contracts: dict[str, object] = {}

    def connect(self) -> None:
        check_connection_target(self.cfg)
        c = self.cfg.ibkr
        # dry_run connects read-only, so the API cannot place orders even by mistake.
        self.ib.connect(c.host, c.port, clientId=c.client_id, readonly=self.cfg.dry_run, timeout=10)
        accounts = self.ib.managedAccounts()
        self.account = c.account or accounts[0]
        if self.account not in accounts:
            raise SafetyError(f"account {self.account} not in {accounts}")
        check_connection_target(self.cfg, self.account)

    def disconnect(self) -> None:
        self.ib.disconnect()

    def contract(self, inst: Instrument):
        from ib_async import Stock

        if inst.symbol not in self._contracts:
            (q,) = self.ib.qualifyContracts(Stock(inst.symbol, inst.exchange, inst.currency))
            self._contracts[inst.symbol] = q
        return self._contracts[inst.symbol]

    def daily_bars(self, inst: Instrument, duration: str = "2 Y") -> pd.DataFrame:
        from ib_async import util

        bars = self.ib.reqHistoricalData(
            self.contract(inst), endDateTime="", durationStr=duration,
            barSizeSetting="1 day", whatToShow="TRADES", useRTH=True,
        )
        df = util.df(bars)
        if df is None or df.empty:
            raise RuntimeError(f"no historical data for {inst.symbol}")
        df = df.set_index(pd.to_datetime(df["date"]))[["open", "high", "low", "close", "volume"]]
        # Drop today's still-forming bar: signals use completed sessions only.
        return df[df.index.date < date.today()]

    def account_values(self) -> dict[str, float]:
        wanted = {"NetLiquidation", "TotalCashValue", "GrossPositionValue"}
        out: dict[str, float] = {}
        for v in self.ib.accountSummary(self.account):
            if v.tag in wanted and v.tag not in out:
                out[v.tag] = float(v.value)
        return out

    def position(self, symbol: str) -> int:
        return int(sum(p.position for p in self.ib.positions(self.account) if p.contract.symbol == symbol))

    def has_open_order(self, symbol: str) -> bool:
        """Open orders other than our protective stop."""
        return any(t.contract.symbol == symbol and t.order.orderType != "STP"
                   for t in self.ib.openTrades())

    def _stop_trades(self, symbol: str) -> list:
        return [t for t in self.ib.openTrades()
                if t.contract.symbol == symbol and t.order.orderType == "STP" and t.order.action == "SELL"]

    def protective_stop(self, symbol: str) -> tuple[int, float] | None:
        """(qty, stop price) of the resting GTC stop for `symbol`, if any."""
        trades = self._stop_trades(symbol)
        if not trades:
            return None
        o = trades[0].order
        return int(o.totalQuantity), float(o.auxPrice)

    def set_protective_stop(self, inst: Instrument, qty: int, price: float) -> None:
        """Create or modify the GTC stop that protects the position if the agent is offline."""
        from ib_async import StopOrder

        trades = self._stop_trades(inst.symbol)
        for extra in trades[1:]:
            self.ib.cancelOrder(extra.order)
        if trades:
            o = trades[0].order
            o.totalQuantity, o.auxPrice = qty, price
        else:
            o = StopOrder("SELL", qty, price, tif="GTC", account=self.account)
        self.ib.placeOrder(self.contract(inst), o)
        self.ib.sleep(1)

    def cancel_protective_stop(self, inst: Instrument) -> None:
        for t in self._stop_trades(inst.symbol):
            self.ib.cancelOrder(t.order)
        self.ib.sleep(1)

    def place_limit(self, inst: Instrument, side: str, qty: int, price: float,
                    wait_s: float = 30) -> tuple[int, float]:
        """Place a DAY limit order, wait for fills, cancel the remainder.

        Returns (filled qty, average fill price)."""
        from ib_async import LimitOrder

        order = LimitOrder(side, qty, price, tif="DAY", account=self.account)
        trade = self.ib.placeOrder(self.contract(inst), order)
        waited = 0.0
        while not trade.isDone() and waited < wait_s:
            self.ib.sleep(1)
            waited += 1
        if not trade.isDone():
            self.ib.cancelOrder(order)
            self.ib.sleep(2)
        return int(trade.orderStatus.filled), float(trade.orderStatus.avgFillPrice or 0.0)
