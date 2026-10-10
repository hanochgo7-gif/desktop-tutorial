import csv

import numpy as np

from agent.config import Config, Instrument, StrategyConfig
from agent.runner import run_once
from agent.state import State
from conftest import make_bars


class FakeBroker:
    def __init__(self, bars, positions=None, equity=100_000):
        self.bars, self.positions, self.equity = bars, positions or {}, equity
        self.account, self.orders = "DU000001", []

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
        return qty


def cfg(tmp_path, dry_run):
    return Config(dry_run=dry_run, universe=[Instrument("AAA")], state_dir=tmp_path,
                  strategy=StrategyConfig(rsi_max_entry=100))


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

    def review(self, symbol, ind, qty, price, equity):
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
