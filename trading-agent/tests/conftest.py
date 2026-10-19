import sys
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


def make_bars(closes, end=None) -> pd.DataFrame:
    """Daily bars ending on the last business day before `end` (default: today)."""
    close = pd.Series(np.asarray(closes, dtype=float))
    end = pd.Timestamp(end or pd.Timestamp.today().normalize()) - pd.offsets.BDay(1)
    idx = pd.bdate_range(end=end, periods=len(close))
    return pd.DataFrame(
        {"open": close.values, "high": close.values * 1.01, "low": close.values * 0.99,
         "close": close.values, "volume": 1_000_000},
        index=idx,
    )


@pytest.fixture
def down_then_up():
    """Falls for 80 bars then rallies: a clean golden cross near the end."""
    return make_bars(np.r_[np.linspace(120, 80, 80), np.linspace(80, 130, 60)])
