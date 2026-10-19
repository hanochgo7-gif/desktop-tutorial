import csv

import numpy as np

from agent.config import Config, Instrument, RiskConfig, StrategyConfig
from agent.runner import run_once
from agent.state import State
from conftest import make_bars


class FakeBroker:
    def __init__(self, bars, positions=None, equity=100_000):
        self.bars, self.positions, self.equity = bars, positions or {}, equity
        self.account, self.orders, self.stops = "DU000001", [], {}

    def connect(self): pass
    def disconnect(self): pass
    def daily_bars(self, inst): return self.bars[inst.symbol]
    def position(self, sym): return self.positions.get(sym, 0)
    def has_open_order(self, sym): return False

    def account_values(self):
        return {"NetLiquidation": self.equity, "TotalCashValue": self.equity, "GrossPositionValue": 0}

    def place_limit(self, inst, side, qty, price, wait_s=30):
        self.orders.append((inst.symbol, side, qty, price))
        self.positions[inst.symbol] = self.positions.get(inst.symbol, 0) + (qty if side == "BUY" else -qty)
        return qty, price

    def protective_stop(self, sym): return self.stops.get(sym)
    def set_protective_stop(self, inst, qty, price): self.stops[inst.symbol] = (qty, price)
    def cancel_protective_stop(self, inst): self.stops.pop(inst.symbol, None)


def cfg(tmp_path, dry_run, **risk):
    return Config(dry_run=dry_run, universe=[Instrument("AAA")], state_dir=tmp_path,
                  strategy=StrategyConfig(rsi_max_entry=100),
                  risk=RiskConfig(**{"circuit_symbol": "", **risk}))


def entry_bars():
    """Series whose last bar is exactly the golden-cross entry bar."""
    from agent.strategy import compute
    closes = np.r_[np.linspace(120, 80, 80), np.linspace(80, 130, 60)]
    out = compute(make_bars(closes), StrategyConfig(rsi_max_entry=100))
    i = out.index.get_loc(out.index[out["reason"].str.startswith("entry")][0])
    return make_bars(closes[: i + 1])


def journal(tmp_path):
    with (tmp_path / "journal.csv").open() as f:
        return list(csv.DictReader(f))


def test_dry_run_places_nothing(tmp_path):
    b = FakeBroker({"AAA": entry_bars()})
    run_once(cfg(tmp_path, True), b)
    assert b.orders == []
    assert journal(tmp_path)[0]["status"] == "dry-run"


def test_buys_on_entry_and_tracks_managed(tmp_path):
    b = FakeBroker({"AAA": entry_bars()})
    run_once(cfg(tmp_path, False), b)
    assert len(b.orders) == 1 and b.orders[0][1] == "BUY"
    assert State(tmp_path).managed()["AAA"] == b.orders[0][2]


def test_never_sells_preexisting_holdings(tmp_path):
    """Flat signal + 500 shares the user already owned -> no sell."""
    falling = make_bars(np.linspace(120, 80, 120))
    b = FakeBroker({"AAA": falling}, positions={"AAA": 500})
    run_once(cfg(tmp_path, False), b)
    assert b.orders == []


def test_sells_only_managed_shares(tmp_path):
    falling = make_bars(np.linspace(120, 80, 120))
    b = FakeBroker({"AAA": falling}, positions={"AAA": 500})
    State(tmp_path).add_managed("AAA", 120)
    run_once(cfg(tmp_path, False), b)
    assert b.orders == [("AAA", "SELL", 120, b.orders[0][3])]
    assert State(tmp_path).managed() == {}


def test_kill_switch(tmp_path):
    (tmp_path / "STOP").touch()
    b = FakeBroker({"AAA": entry_bars()})
    run_once(cfg(tmp_path, False), b)
    assert b.orders == []


class FakeAnalyst:
    def __init__(self, approved, mult=1.0):
        self.approved, self.mult, self.calls = approved, mult, 0

    def review(self, symbol, ind, qty, price, equity, fundamentals=None):
        from agent.analyst import Review
        self.calls += 1
        return Review(self.approved, self.mult if self.approved else 0.0, 0.9, "test")


def test_analyst_veto_blocks_buy(tmp_path):
    b = FakeBroker({"AAA": entry_bars()})
    run_once(cfg(tmp_path, False), b, analyst=FakeAnalyst(False))
    assert b.orders == []
    assert journal(tmp_path)[0]["status"] == "refused"


def test_analyst_scales_size_down(tmp_path):
    full = FakeBroker({"AAA": entry_bars()})
    run_once(cfg(tmp_path / "a", False), full, analyst=FakeAnalyst(True, 1.0))
    half = FakeBroker({"AAA": entry_bars()})
    run_once(cfg(tmp_path / "b", False), half, analyst=FakeAnalyst(True, 0.5))
    assert half.orders[0][2] == full.orders[0][2] // 2


def test_analyst_not_consulted_on_exits(tmp_path):
    b = FakeBroker({"AAA": make_bars(np.linspace(120, 80, 120))}, positions={"AAA": 100})
    State(tmp_path).add_managed("AAA", 100)
    a = FakeAnalyst(False)
    run_once(cfg(tmp_path, False), b, analyst=a)
    assert a.calls == 0 and b.orders[0][1] == "SELL"


def test_bad_data_skips_symbol_and_records_pit(tmp_path):
    bad = entry_bars()
    bad.iloc[-3:, :4] /= 2  # split-like gap
    b = FakeBroker({"AAA": bad})
    run_once(cfg(tmp_path, False), b)
    assert b.orders == []
    row = journal(tmp_path)[0]
    assert row["action"] == "ERROR" and "split" in row["reason"]
    assert (tmp_path / "bars.db").exists()


def test_regime_filter_in_runner(tmp_path):
    from dataclasses import replace
    c = cfg(tmp_path, False)
    c = replace(c, strategy=replace(c.strategy, regime_symbol="SPY", regime_sma=50))
    no_spy = FakeBroker({"AAA": entry_bars()})          # benchmark missing -> no entries
    run_once(c, no_spy)
    assert no_spy.orders == []
    bull = FakeBroker({"AAA": entry_bars(), "SPY": make_bars(np.linspace(100, 150, 150))})
    run_once(replace(c, state_dir=tmp_path / "b"), bull)
    assert bull.orders and bull.orders[0][1] == "BUY"


def test_buy_places_broker_stop_and_trails_it_up(tmp_path):
    b = FakeBroker({"AAA": entry_bars()})
    run_once(cfg(tmp_path, False), b)
    qty, first = b.stops["AAA"]
    assert qty == b.orders[0][2] and first < b.orders[0][3]
    # Next day the trend continues: stop moves up, never down.
    closes = np.r_[entry_bars()["close"].to_numpy(), entry_bars()["close"].iloc[-1] * 1.05]
    b.bars["AAA"] = make_bars(closes)
    run_once(cfg(tmp_path, False), b)
    assert b.stops["AAA"][1] >= first and len(b.orders) == 1


def test_exit_cancels_broker_stop(tmp_path):
    b = FakeBroker({"AAA": make_bars(np.linspace(120, 80, 120))}, positions={"AAA": 100})
    b.stops["AAA"] = (100, 70.0)
    State(tmp_path).add_managed("AAA", 100)
    run_once(cfg(tmp_path, False), b)
    assert "AAA" not in b.stops and b.orders[0][1] == "SELL"


def test_stop_filled_at_broker_reconciles_managed(tmp_path):
    b = FakeBroker({"AAA": make_bars(np.linspace(120, 80, 120))}, positions={"AAA": 0})
    State(tmp_path).add_managed("AAA", 100)
    run_once(cfg(tmp_path, False), b)
    assert State(tmp_path).managed() == {} and b.orders == []


def test_max_drawdown_liquidates_and_trips_kill_switch(tmp_path):
    import json
    (tmp_path / "peak.json").write_text(json.dumps({"peak": 150_000}))
    b = FakeBroker({"AAA": entry_bars()}, positions={"AAA": 50}, equity=100_000)  # -33%
    State(tmp_path).add_managed("AAA", 50)
    run_once(cfg(tmp_path, False, max_drawdown_pct=20), b)
    assert b.orders == [("AAA", "SELL", 50, b.orders[0][3])]
    assert State(tmp_path).kill_switch
    run_once(cfg(tmp_path, False), b)  # stays stopped
    assert len(b.orders) == 1


def test_circuit_breaker_blocks_buys(tmp_path):
    spy_crash = make_bars(np.r_[np.linspace(100, 110, 100), 103.0])  # -6.4% last session
    b = FakeBroker({"AAA": entry_bars(), "SPY": spy_crash})
    run_once(cfg(tmp_path, False, circuit_symbol="SPY", circuit_drop_pct=5), b)
    assert b.orders == []
    assert "circuit breaker" in journal(tmp_path)[0]["notes"]


def test_circuit_breaker_fails_closed_without_data(tmp_path):
    b = FakeBroker({"AAA": entry_bars()})
    run_once(cfg(tmp_path, False, circuit_symbol="SPY"), b)
    assert b.orders == []


def test_slippage_recorded(tmp_path):
    b = FakeBroker({"AAA": entry_bars()})
    run_once(cfg(tmp_path, False), b)
    row = journal(tmp_path)[0]
    assert row["fill_price"] and float(row["slippage_bps"]) > 0  # limit is 0.2% above close


def test_partial_exit_restores_stop_on_remainder(tmp_path):
    class HalfFill(FakeBroker):
        def place_limit(self, inst, side, qty, price, wait_s=30):
            return super().place_limit(inst, side, qty // 2, price)

    b = HalfFill({"AAA": make_bars(np.linspace(120, 80, 120))}, positions={"AAA": 100})
    b.stops["AAA"] = (100, 70.0)
    State(tmp_path).add_managed("AAA", 100)
    run_once(cfg(tmp_path, False), b)
    assert b.stops["AAA"] == (50, 70.0) and State(tmp_path).managed() == {"AAA": 50}


def test_trend_mode_enters_after_entry_day(tmp_path):
    from dataclasses import replace
    up = make_bars(np.r_[np.linspace(120, 80, 80), np.linspace(80, 130, 80)])  # long for a while
    c = cfg(tmp_path, False)
    cross = replace(c, strategy=replace(c.strategy, entry_mode="cross"))
    trend = replace(c, state_dir=tmp_path / "t", strategy=replace(c.strategy, entry_mode="trend"))
    b1, b2 = FakeBroker({"AAA": up}), FakeBroker({"AAA": up})
    run_once(cross, b1)
    run_once(trend, b2)
    assert b1.orders == []                       # missed the cross day: cross mode waits
    assert b2.orders and b2.orders[0][1] == "BUY"


def test_veto_is_remembered(tmp_path):
    from dataclasses import replace
    up = make_bars(np.r_[np.linspace(120, 80, 80), np.linspace(80, 130, 80)])
    c = cfg(tmp_path, False)
    c = replace(c, strategy=replace(c.strategy, entry_mode="trend"))
    a = FakeAnalyst(False)
    run_once(c, FakeBroker({"AAA": up}), analyst=a)
    run_once(c, FakeBroker({"AAA": up}), analyst=a)
    assert a.calls == 1  # second day: not re-asked
