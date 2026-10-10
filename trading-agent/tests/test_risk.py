import pytest

from agent.broker import SafetyError, check_connection_target
from agent.config import Config, IBKRConfig, RiskConfig
from agent.risk import AccountSnapshot, RiskManager

RISK = RiskConfig(risk_per_trade_pct=1, max_position_pct=20, max_gross_exposure_pct=80,
                  min_cash_pct=10, max_daily_loss_pct=3, max_orders_per_day=5)


def acct(**kw):
    base = dict(equity=100_000, cash=100_000, gross_exposure=0, day_start_equity=100_000, orders_today=0)
    return AccountSnapshot(**{**base, **kw})


def test_volatility_sizing():
    # 1% of 100k = 1000 at risk; stop distance 3 * 2 = 6 -> 166 shares (16.6k < 20k cap)
    assert RiskManager(RISK, 3).size_buy(100, 2, acct()).qty == 166


def test_position_cap():
    # tiny ATR would size huge; capped at 20% of equity = 200 shares at $100
    assert RiskManager(RISK, 3).size_buy(100, 0.1, acct()).qty == 200


def test_gross_exposure_cap():
    d = RiskManager(RISK, 3).size_buy(100, 0.1, acct(gross_exposure=75_000, cash=25_000))
    assert d.qty == 50 and any("gross" in n for n in d.notes)


def test_min_cash_cap():
    assert RiskManager(RISK, 3).size_buy(100, 0.1, acct(cash=12_000)).qty == 20


def test_daily_loss_halts_buys():
    d = RiskManager(RISK, 3).size_buy(100, 2, acct(equity=96_000))
    assert not d.approved and "daily loss" in d.notes[0]


def test_order_limit():
    assert not RiskManager(RISK, 3).size_buy(100, 2, acct(orders_today=5)).approved


def test_limit_price():
    rm = RiskManager(RISK, 3)
    assert rm.limit_price("BUY", 100) == 100.2
    assert rm.limit_price("SELL", 100) == 99.8


def test_paper_refuses_live_port_and_account(monkeypatch):
    with pytest.raises(SafetyError):
        check_connection_target(Config(ibkr=IBKRConfig(port=7496)))
    with pytest.raises(SafetyError):
        check_connection_target(Config(), account_id="U1234567")
    check_connection_target(Config(), account_id="DU1234567")


def test_live_requires_env(monkeypatch):
    live = Config(mode="live", ibkr=IBKRConfig(port=7496))
    monkeypatch.delenv("CONFIRM_LIVE_TRADING", raising=False)
    with pytest.raises(SafetyError):
        check_connection_target(live)
    monkeypatch.setenv("CONFIRM_LIVE_TRADING", "yes")
    check_connection_target(live)
