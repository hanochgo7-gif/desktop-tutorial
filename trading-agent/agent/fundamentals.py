"""Best-effort fundamental snapshot for the Claude review (live use only).

This is today's data, not point-in-time, so it must never feed a backtest.
Any failure returns {} and the review proceeds on technicals plus web search.
"""
from __future__ import annotations

import logging
from datetime import date

from .config import Instrument

log = logging.getLogger("agent.fundamentals")

FIELDS = {
    "shortName": "name", "sector": "sector", "industry": "industry", "marketCap": "market_cap",
    "trailingPE": "pe_trailing", "forwardPE": "pe_forward", "pegRatio": "peg",
    "priceToBook": "price_to_book", "revenueGrowth": "revenue_growth_yoy",
    "earningsGrowth": "earnings_growth_yoy", "profitMargins": "profit_margin",
    "returnOnEquity": "roe", "debtToEquity": "debt_to_equity_pct",
    "freeCashflow": "free_cash_flow", "totalCash": "total_cash", "totalDebt": "total_debt",
    "beta": "beta", "recommendationKey": "analyst_consensus",
}


def yahoo_symbol(inst: Instrument) -> str:
    return f"{inst.symbol}.TA" if inst.exchange == "TASE" else inst.symbol


def fetch(inst: Instrument) -> dict:
    try:
        import yfinance as yf

        t = yf.Ticker(yahoo_symbol(inst))
        info = t.info or {}
        out = {new: info[old] for old, new in FIELDS.items() if info.get(old) is not None}
        try:
            cal = t.calendar or {}
            dates = cal.get("Earnings Date") or []
            upcoming = [d for d in dates if isinstance(d, date) and d >= date.today()]
            if upcoming:
                out["next_earnings"] = upcoming[0].isoformat()
                out["days_to_earnings"] = (upcoming[0] - date.today()).days
        except Exception:
            pass
        return out
    except Exception as e:
        log.warning("%s: fundamentals unavailable: %s", inst.symbol, e)
        return {}


def describe(f: dict) -> str:
    if not f:
        return "Fundamentals: unavailable (check via web search)."

    def fmt(k, v):
        if isinstance(v, float) and k.endswith(("growth_yoy", "margin", "roe")):
            return f"{v:+.1%}" if "growth" in k else f"{v:.1%}"
        if isinstance(v, (int, float)) and abs(v) >= 1e6:
            return f"{v / 1e9:,.1f}B"
        if isinstance(v, float):
            return f"{v:.2f}"
        return str(v)

    return "Fundamentals (current, from Yahoo Finance):\n" + "\n".join(
        f"- {k}: {fmt(k, v)}" for k, v in f.items())
