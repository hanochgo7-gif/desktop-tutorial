"""One pass of the agent: read data, decide, check risk, (maybe) trade, journal."""
from __future__ import annotations

import logging

from .broker import IBKRBroker
from .config import Config
from .risk import AccountSnapshot, RiskManager
from .state import State
from .strategy import compute, latest_signal

log = logging.getLogger("agent")


def run_once(cfg: Config, broker: IBKRBroker | None = None, analyst=None) -> None:
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
        _run(cfg, broker, state, analyst)
    finally:
        broker.disconnect()


def _snapshot(broker: IBKRBroker, state: State) -> AccountSnapshot:
    v = broker.account_values()
    equity = v["NetLiquidation"]
    daily = state.daily(equity)
    return AccountSnapshot(
        equity=equity,
        cash=v.get("TotalCashValue", 0.0),
        gross_exposure=v.get("GrossPositionValue", 0.0),
        day_start_equity=daily["start_equity"],
        orders_today=daily["orders"],
    )


def _run(cfg: Config, broker: IBKRBroker, state: State, analyst) -> None:
    risk = RiskManager(cfg.risk, cfg.strategy.atr_stop_mult)
    tag = "DRY-RUN" if cfg.dry_run else cfg.mode.upper()
    # Records the day's starting equity on the first pass of the day.
    start = _snapshot(broker, state)
    log.info("[%s] account %s equity=%.2f day P&L=%.2f%% orders today=%d",
             tag, broker.account, start.equity, start.daily_pnl_pct, start.orders_today)

    for inst in cfg.universe:
        sym = inst.symbol
        try:
            bars = broker.daily_bars(inst)
            sig = latest_signal(bars, cfg.strategy)
        except Exception as e:  # one bad symbol must not stop the rest
            log.error("%s: data/signal error: %s", sym, e)
            state.log(symbol=sym, action="ERROR", status="skipped", reason=str(e))
            continue

        # Never sell more than the agent bought, and never more than the account holds.
        owned = min(state.managed().get(sym, 0), max(broker.position(sym), 0))
        log.info("%s close=%.2f atr=%.2f owned=%d -> %s (%s)", sym, sig.close, sig.atr, owned,
                 "LONG" if sig.in_position else "FLAT", sig.reason)

        if broker.has_open_order(sym):
            log.info("%s: open order exists, skipping", sym)
            continue

        if sig.in_position and owned == 0:
            if "entry" not in sig.reason:
                # Trend already running; wait for a fresh crossover instead of chasing.
                continue
            acct = _snapshot(broker, state)
            d = risk.size_buy(sig.close, sig.atr, acct)
            if d.qty > 0 and analyst is not None:
                # Claude reviews after the hard limits, and can only shrink or veto.
                r = analyst.review(sym, compute(bars, cfg.strategy), d.qty, sig.close, acct.equity)
                scaled = int(d.qty * r.size_multiplier) if r.approved else 0
                verdict = "approved" if r.approved else "vetoed"
                d.notes.append(f"claude {verdict} x{r.size_multiplier:.2f} -> {scaled}: {r.summary}")
                log.info("%s: Claude %s (conf %.2f): %s", sym, verdict, r.confidence, r.summary)
                d.qty = scaled
            _execute(cfg, broker, state, risk, inst, "BUY", d.qty, sig, "; ".join(d.notes))
        elif not sig.in_position and owned > 0:
            _execute(cfg, broker, state, risk, inst, "SELL", owned, sig, "")


def _execute(cfg, broker, state, risk, inst, side, qty, sig, notes) -> None:
    sym = inst.symbol
    if qty <= 0:
        log.info("%s: %s refused by risk: %s", sym, side, notes)
        state.log(symbol=sym, action=side, qty=0, price=sig.close, status="refused",
                  reason=sig.reason, notes=notes)
        return

    px = risk.limit_price(side, sig.close)
    if cfg.dry_run:
        log.info("%s: DRY-RUN would %s %d @ %.2f", sym, side, qty, px)
        state.log(symbol=sym, action=side, qty=qty, price=px, status="dry-run",
                  reason=sig.reason, notes=notes)
        return

    filled = broker.place_limit(inst, side, qty, px)
    state.count_order()
    state.add_managed(sym, filled if side == "BUY" else -filled)
    log.info("%s: %s %d/%d @ %.2f filled", sym, side, filled, qty, px)
    state.log(symbol=sym, action=side, qty=filled, price=px,
              status="filled" if filled == qty else f"partial {filled}/{qty}",
              reason=sig.reason, notes=notes)
