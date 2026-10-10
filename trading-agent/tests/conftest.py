import sys
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


def make_bars(closes) -> pd.DataFrame:
    close = pd.Series(np.asarray(closes, dtype=float))
    idx = pd.bdate_range("2020-01-01", periods=len(close))
    return pd.DataFrame(
        {"open": close.values, "high": close.values * 1.01, "low": close.values * 0.99,
         "close": close.values, "volume": 1_000_000},
        index=idx,
    )


@pytest.fixture
def down_then_up():
    """Falls for 80 bars then rallies: a clean golden cross near the end."""
    return make_bars(np.r_[np.linspace(120, 80, 80), np.linspace(80, 130, 60)])
