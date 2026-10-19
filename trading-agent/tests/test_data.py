from datetime import datetime, timezone

import numpy as np
import pandas as pd

from agent.data import BarStore, clean_bars
from conftest import make_bars

TODAY = pd.Timestamp("2020-05-21")


def bars(n=100):
    return make_bars(np.linspace(100, 120, n), end="2020-05-20")  # last bar 2020-05-19


def test_clean_passes_good_data():
    out, q = clean_bars(bars(), today=TODAY)
    assert q.ok and not q.issues and len(out) == 100


def test_drops_bad_rows():
    df = bars()
    df.iloc[10, df.columns.get_loc("close")] = np.nan
    df.iloc[20, df.columns.get_loc("low")] = -1
    df.iloc[30, df.columns.get_loc("high")] = 1  # high < low
    df = pd.concat([df, df.iloc[[40]]])          # duplicate date
    out, q = clean_bars(df, today=TODAY)
    assert q.ok and len(out) == 97 and len(q.issues) == 3
    assert (out["high"] >= out[["open", "close"]].max(axis=1)).all()


def test_split_like_jump_is_fatal():
    df = bars()
    df.iloc[-5:, :4] /= 2
    _, q = clean_bars(df, today=TODAY)
    assert not q.ok and "split" in q.fatal[0]


def test_stale_data_is_fatal():
    _, q = clean_bars(bars(), today=pd.Timestamp("2020-07-01"))
    assert not q.ok and "stale" in q.fatal[0]


def test_point_in_time_store(tmp_path):
    s = BarStore(tmp_path / "bars.db")
    t1 = datetime(2020, 1, 1, tzinfo=timezone.utc)
    t2 = datetime(2020, 1, 2, tzinfo=timezone.utc)
    df = bars(10)
    assert s.save("AAA", df, t1) == 10
    assert s.save("AAA", df, t2) == 0           # unchanged -> nothing new
    revised = df.copy()
    revised.iloc[-1, revised.columns.get_loc("close")] = 999
    assert s.save("AAA", revised, t2) == 1      # one bar revised
    assert s.as_of("AAA", t1)["close"].iloc[-1] != 999   # what we knew on t1
    assert s.as_of("AAA")["close"].iloc[-1] == 999        # what we know now
