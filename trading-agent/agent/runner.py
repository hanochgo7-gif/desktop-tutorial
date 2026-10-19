"""One pass of the agent: read data, decide, check risk, (maybe) trade, journal.

Order of checks each pass:
  kill switch -> max drawdown from peak -> per symbol: data quality -> signal
  -> exits (rules only) / entries (risk limits -> circuit breaker -> Claude)
"""
from __future__ import annotations

import logging

from .broker import IBKRBroker
from .config import Config, Instrument
from .data import BarStore, clean_bars
from . import monitor
from .risk import AccountSnapshot, RiskManager
from .state import State
from .strategy import compute, latest_signal, regime_filter

log = logging.getLogger("agent")

VETO_DAYS = 7  # after a Claude veto, do not ask again about the same symbol for this long


def run_once(cfg: Config, broker: IBKRBroker | None = None, analyst=None, notifier=None) -> None:
    state = State(cfg.state_dir)
    if state.kill_switch:
        log.warning("kill switch %s exists - doing nothing", state.root / "STOP")
        return

    if analyst is None and cfg.analyst.enabled:
        from .analyst import ClaudeAnalyst

        analyst = ClaudeAnalyst(cfg.analyst, audit_dir=state.root / "reviews")

    broker = broker or IBKRBroker(cfg)
    broker.connect()
    try:
        Pass(cfg, broker, state, analyst, notifier).run()
    finally:
        broker.disconnect()


class Pass:
    def __init__(self, cfg: Config, broker, state: State, analyst, notifier=None):
        self.cfg, self.broker, self.state, self.analyst = cfg, broker, state, analyst
        self.alert = (notifier or monitor.Notifier(cfg.monitor.alerts)).send
        self.risk = RiskManager(cfg.risk, cfg.strategy.atr_stop_mult)
        self.store = BarStore(state.root / "bars.db")
        self._bars: dict[str, object] = {}
        self.live = not cfg.dry_run

    # --- helpers ---------------------------------------------------------------
    def snapshot(self) -> AccountSnapshot:
        v = self.broker.account_values()
        equity = v["NetLiquidation"]
        daily = self.state.daily(equity)
        return AccountSnapshot(
            equity=equity,
            cash=v.get("TotalCashValue", 0.0),
            gross_exposure=v.get("GrossPositionValue", 0.0),
            day_start_equity=daily["start_equity"],
            orders_today=daily["orders"],
        )

    def bars(self, symbol: str):
        """Cleaned daily bars, cached for this pass and recorded point-in-time."""
        if symbol not in self._bars:
            inst = self.cfg.instrument(symbol) or Instrument(symbol)
            df, q = clean_bars(self.broker.daily_bars(inst))
            self.store.save(symbol, df)
            for issue in q.issues:
                log.warning("%s: data: %s", symbol, issue)
            if not q.ok:
                raise ValueError("bad data: " + "; ".join(q.fatal))
            self._bars[symbol] = df
        return self._bars[symbol]

    def owned(self, symbol: str) -> int:
        """Shares the agent may sell. Reconciles state if the position shrank (e.g. stop filled)."""
        managed = self.state.managed().get(symbol, 0)
        held = max(self.broker.position(symbol), 0)
        if held < managed:
            log.warning("%s: position %d < managed %d (broker stop filled or manual sale)",
                        symbol, held, managed)
            self.state.set_managed(symbol, held)
            self.state.log(symbol=symbol, action="RECONCILE", qty=held, status="managed reduced",
                           reason=f"position {held} < managed {managed}")
            managed = held
        return managed

    # --- the pass ----------------------------------------------------------------
    def run(self) -> None:
        start = self.snapshot()
        tag = "DRY-RUN" if self.cfg.dry_run else self.cfg.mode.upper()
        log.info("[%s] account %s equity=%.2f day P&L=%.2f%% orders today=%d",
                 tag, self.broker.account, start.equity, start.daily_pnl_pct, start.orders_today)

        if self.drawdown_breached(start.equity):
            self.finish()
            return

        regime = self.regime()
        buys_blocked = self.circuit_breaker()
        if buys_blocked:
            self.alert(buys_blocked)

        for inst in self.cfg.universe:
            try:
                self.symbol(inst, regime, buys_blocked)
            except Exception as e:  # one bad symbol must not stop the rest
                log.error("%s: %s", inst.symbol, e)
                self.state.log(symbol=inst.symbol, action="ERROR", status="skipped", reason=str(e))
                self.alert(f"{inst.symbol}: skipped: {e}")
        self.finish()

    def finish(self) -> None:
        """Record today's equity and warn if live results drift from the backtest."""
        try:
            v = self.broker.account_values()
            monitor.record_equity(self.state.root, v["NetLiquidation"], v.get("TotalCashValue", 0.0),
                                  v.get("GrossPositionValue", 0.0), self.state.managed())
            for w in monitor.drift_warnings(self.cfg, monitor.load_equity(self.state.root),
                                            monitor.load_journal(self.state.root)):
                self.alert(w)
        except Exception as e:
            log.error("monitoring failed: %s", e)

    def drawdown_breached(self, equity: float) -> bool:
        limit = self.cfg.risk.max_drawdown_pct
        peak = self.state.peak_equity(equity)
        dd = (equity / peak - 1) * 100 if peak else 0.0
        if not limit or dd > -limit:
            return False
        reason = f"max drawdown hit: equity {equity:,.0f} is {dd:.1f}% below peak {peak:,.0f}"
        log.critical(reason + " - liquidating managed positions and stopping")
        self.alert(reason + " - liquidating managed positions and stopping the agent", logging.CRITICAL)
        for sym in list(self.state.managed()):
            inst = self.cfg.instrument(sym) or Instrument(sym)
            try:
                qty = self.owned(sym)
                if qty > 0:
                    last = float(self.bars(sym)["close"].iloc[-1])
                    self.execute(inst, "SELL", qty, last, "exit: max drawdown", "")
            except Exception as e:  # keep going; its broker stop is still in place
                log.critical("%s: could not liquidate: %s", sym, e)
                self.state.log(symbol=sym, action="ERROR", status="liquidation failed", reason=str(e))
        if self.live:
            self.state.trip_kill_switch(reason)
        return True

    def regime(self):
        s = self.cfg.strategy
        if not s.regime_symbol:
            return None
        try:
            r = regime_filter(self.bars(s.regime_symbol), s.regime_sma)
            log.info("regime %s > SMA%d: %s", s.regime_symbol, s.regime_sma, bool(r.iloc[-1]))
            return r
        except Exception as e:
            log.error("regime data for %s unavailable, blocking entries: %s", s.regime_symbol, e)
            return None

    def circuit_breaker(self) -> str:
        """Reason buys are blocked today, or "" if they are allowed."""
        r = self.cfg.risk
        if not r.circuit_symbol:
            return ""
        try:
            close = self.bars(r.circuit_symbol)["close"]
            move = (close.iloc[-1] / close.iloc[-2] - 1) * 100
        except Exception as e:
            return f"circuit breaker: {r.circuit_symbol} data unavailable ({e})"
        if move <= -r.circuit_drop_pct:
            reason = f"circuit breaker: {r.circuit_symbol} {move:.1f}% last session"
            log.warning(reason + " - no buys today")
            return reason
        return ""

    def symbol(self, inst: Instrument, regime, buys_blocked: str) -> None:
        sym = inst.symbol
        bars = self.bars(sym)
        sig = latest_signal(bars, self.cfg.strategy, regime)
        owned = self.owned(sym)
        log.info("%s close=%.2f atr=%.2f owned=%d -> %s (%s)", sym, sig.close, sig.atr, owned,
                 "LONG" if sig.in_position else "FLAT", sig.reason)

        if self.broker.has_open_order(sym):
            log.info("%s: open order exists, skipping", sym)
            return

        if not sig.in_position and owned > 0:
            self.execute(inst, "SELL", owned, sig.close, sig.reason, "")
        elif sig.in_position and owned > 0:
            if sig.stop:
                self.trail_stop(inst, owned, sig.stop)
        elif sig.in_position and owned == 0:
            # "cross" mode buys only on the entry bar (never chase). "trend" mode buys any day
            # the strategy is long, which is what its backtest assumes.
            if "entry" in sig.reason or self.cfg.strategy.entry_mode == "trend":
                self.buy(inst, sig, bars, regime, buys_blocked)

    def buy(self, inst: Instrument, sig, bars, regime, buys_blocked: str) -> None:
        sym = inst.symbol
        if buys_blocked:
            self.state.log(symbol=sym, action="BUY", qty=0, price=sig.close, status="refused",
                           reason=sig.reason, notes=buys_blocked)
            return
        acct = self.snapshot()
        d = self.risk.size_buy(sig.close, sig.atr, acct)
        if d.qty > 0 and self.analyst is not None and self.state.vetoed_recently(sym, VETO_DAYS):
            d.notes.append(f"claude vetoed within the last {VETO_DAYS} days")
            d.qty = 0
        elif d.qty > 0 and self.analyst is not None:
            # Claude reviews after the hard limits, and can only shrink or veto.
            from .fundamentals import fetch as fetch_fundamentals

            r = self.analyst.review(sym, compute(bars, self.cfg.strategy, regime), d.qty,
                                    sig.close, acct.equity, fetch_fundamentals(inst))
            scaled = int(d.qty * r.size_multiplier) if r.approved else 0
            verdict = "approved" if r.approved else "vetoed"
            d.notes.append(f"claude {verdict} x{r.size_multiplier:.2f} -> {scaled}: {r.summary}")
            log.info("%s: Claude %s (conf %.2f): %s", sym, verdict, r.confidence, r.summary)
            if not r.approved:
                self.state.record_veto(sym)
                self.alert(f"{sym}: Claude vetoed BUY {d.qty}: {r.summary}", logging.INFO)
            d.qty = scaled
        filled = self.execute(inst, "BUY", d.qty, sig.close, sig.reason, "; ".join(d.notes))
        if filled > 0:
            initial_stop = sig.close - self.cfg.strategy.atr_stop_mult * sig.atr
            self.trail_stop(inst, filled, initial_stop)

    def trail_stop(self, inst: Instrument, qty: int, stop: float) -> None:
        """Keep a GTC stop at the broker for the managed shares. It only ever moves up."""
        if not (self.cfg.risk.broker_stop and self.live):
            return
        stop = round(stop, 2)
        current = self.broker.protective_stop(inst.symbol)
        if current and current[0] == qty and current[1] >= stop:
            return
        if current:
            stop = max(stop, current[1])
        self.broker.set_protective_stop(inst, qty, stop)
        log.info("%s: protective stop %d @ %.2f", inst.symbol, qty, stop)

    def execute(self, inst: Instrument, side: str, qty: int, ref_price: float,
                reason: str, notes: str) -> int:
        sym = inst.symbol
        if qty <= 0:
            log.info("%s: %s refused by risk: %s", sym, side, notes)
            self.state.log(symbol=sym, action=side, qty=0, price=ref_price, status="refused",
                           reason=reason, notes=notes)
            return 0

        px = self.risk.limit_price(side, ref_price)
        if not self.live:
            log.info("%s: DRY-RUN would %s %d @ %.2f", sym, side, qty, px)
            self.state.log(symbol=sym, action=side, qty=qty, price=px, status="dry-run",
                           reason=reason, notes=notes)
            return 0

        prev_stop = None
        if side == "SELL" and self.cfg.risk.broker_stop:
            prev_stop = self.broker.protective_stop(sym)
            self.broker.cancel_protective_stop(inst)  # or the stop could sell the same shares again
        filled, avg = self.broker.place_limit(inst, side, qty, px)
        self.state.count_order()
        self.state.add_managed(sym, filled if side == "BUY" else -filled)
        if side == "SELL" and filled < qty and prev_stop:
            # Partial exit: put the old stop back on what is left; the next pass sells it.
            self.broker.set_protective_stop(inst, qty - filled, prev_stop[1])
        slip = ((avg / ref_price - 1) * 1e4 * (1 if side == "BUY" else -1)) if filled and avg else ""
        log.info("%s: %s %d/%d @ %.2f filled (avg %.2f)", sym, side, filled, qty, px, avg)
        self.alert(f"{side} {sym} {filled}/{qty} @ {avg:.2f} ({reason})", logging.INFO)
        self.state.log(symbol=sym, action=side, qty=filled, price=px,
                       fill_price=round(avg, 4) if avg else "",
                       slippage_bps=round(slip, 1) if slip != "" else "",
                       status="filled" if filled == qty else f"partial {filled}/{qty}",
                       reason=reason, notes=notes)
        return filled
