from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

import yaml


@dataclass
class Instrument:
    symbol: str
    exchange: str = "SMART"
    currency: str = "USD"


@dataclass
class IBKRConfig:
    host: str = "127.0.0.1"
    port: int = 7497
    client_id: int = 17
    account: str = ""


@dataclass
class StrategyConfig:
    fast_sma: int = 20
    slow_sma: int = 50
    rsi_period: int = 14
    rsi_max_entry: float = 70
    atr_period: int = 14
    atr_stop_mult: float = 3.0


@dataclass
class RiskConfig:
    risk_per_trade_pct: float = 1.0
    max_position_pct: float = 20.0
    max_gross_exposure_pct: float = 80.0
    min_cash_pct: float = 10.0
    max_daily_loss_pct: float = 3.0
    max_orders_per_day: int = 10
    limit_offset_pct: float = 0.2


@dataclass
class AnalystConfig:
    enabled: bool = False
    model: str = "claude-opus-5-5"
    effort: str = "high"
    web_search: bool = True
    max_searches: int = 5
    min_confidence: float = 0.6


@dataclass
class Config:
    mode: str = "paper"
    dry_run: bool = True
    ibkr: IBKRConfig = field(default_factory=IBKRConfig)
    universe: list[Instrument] = field(default_factory=list)
    strategy: StrategyConfig = field(default_factory=StrategyConfig)
    risk: RiskConfig = field(default_factory=RiskConfig)
    analyst: AnalystConfig = field(default_factory=AnalystConfig)
    state_dir: Path = Path("state")

    def __post_init__(self):
        if self.mode not in ("paper", "live"):
            raise ValueError(f"mode must be 'paper' or 'live', got {self.mode!r}")
        if self.strategy.fast_sma >= self.strategy.slow_sma:
            raise ValueError("fast_sma must be smaller than slow_sma")

    def instrument(self, symbol: str) -> Instrument | None:
        return next((i for i in self.universe if i.symbol == symbol), None)


def load_config(path: str | Path) -> Config:
    raw = yaml.safe_load(Path(path).read_text()) or {}
    return Config(
        mode=raw.get("mode", "paper"),
        dry_run=bool(raw.get("dry_run", True)),
        ibkr=IBKRConfig(**raw.get("ibkr", {})),
        universe=[Instrument(**u) for u in raw.get("universe", [])],
        strategy=StrategyConfig(**raw.get("strategy", {})),
        risk=RiskConfig(**raw.get("risk", {})),
        analyst=AnalystConfig(**raw.get("analyst", {})),
        state_dir=Path(raw.get("state_dir", "state")),
    )
