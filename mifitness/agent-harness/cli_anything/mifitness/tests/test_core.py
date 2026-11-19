import pytest

from cli_anything.mifitness.core import metrics as M
from cli_anything.mifitness.core.reader import (PasswordError, classify, parse_csv,
                                                 read_export, _parse_time)
from cli_anything.mifitness.core.store import Store
from cli_anything.mifitness.tests.fixtures import DAILY_STEPS, DAYS, build_files, write_zip

UTC = M.get_tz("UTC")


@pytest.fixture
def store(tmp_path):
    for name, text in build_files().items():
        (tmp_path / "exp").mkdir(exist_ok=True)
        (tmp_path / "exp" / name).write_text(text)
    recs, _ = read_export(tmp_path / "exp")
    st = Store(tmp_path / "db.sqlite")
    st.add(recs)
    yield st
    st.close()


def test_classify():
    assert classify("x_MiFitness_hlth_center_fitness_data.csv") == "fitness"
    assert classify("x_MiFitness_hlth_center_aggregated_fitness_data.csv") == "aggregated"
    assert classify("x_MiFitness_hlth_center_sport_record.csv") == "sport"
    assert classify("export/SLEEP/SLEEP_1.csv") == "legacy"
    assert classify("readme.txt") is None


def test_parse_time_variants():
    assert _parse_time("1700000000") == 1700000000
    assert _parse_time("1700000000000") == 1700000000
    assert _parse_time("2026-11-01") == 1793491200
    assert _parse_time("") is None


def test_parse_fitness_csv():
    text = "Uid,Sid,Key,Time,Value,UpdateTime\n1,s,steps,100,\"{\"\"steps\"\": 5}\",100\n"
    (r,) = list(parse_csv(text, "fitness"))
    assert (r.key, r.ts, r.value) == ("steps", 100, {"steps": 5})


def test_legacy_activity():
    text = "date,steps,distance,runDistance,calories\n2026-11-01,1234,900,0,50\n"
    (r,) = list(parse_csv(text, "legacy", "ACTIVITY/ACTIVITY_1.csv"))
    assert r.key == "activity" and r.value["steps"] == 1234


def test_encrypted_zip_requires_password(tmp_path):
    z = write_zip(tmp_path / "e.zip")
    with pytest.raises(PasswordError):
        read_export(z)
    recs, files = read_export(z, "s3cret")
    assert len(files) == 4 and len(recs) > 50


def test_store_idempotent(tmp_path):
    recs, _ = read_export(write_zip(tmp_path / "e.zip"), "s3cret")
    with Store(tmp_path / "d.db") as st:
        first = st.add(recs)
        second = st.add(recs)
    assert first["added"] == len(recs) and second["added"] == 0


def test_store_query_filters(store):
    assert all(r.key == "spo2" for r in store.query(key="spo2"))
    assert len(store.query(source="sport")) == 4
    assert store.query(limit=3).__len__() == 3


def test_steps_prefer_daily_report(store):
    rows = M.steps(store, UTC)
    assert [r["steps"] for r in rows] == DAILY_STEPS
    assert all(r["basis"] == "daily_report" for r in rows)


def test_heart_rate_stats(store):
    rows = M.heart_rate(store, UTC)
    assert len(rows) == DAYS
    assert rows[0]["min"] == 60 and rows[0]["max"] == 110 and rows[0]["avg"] == 83


def test_sleep(store):
    rows = M.sleep(store, UTC)
    assert len(rows) == DAYS
    r = rows[0]
    assert r["date"] == "2026-11-01" and r["total_min"] == 480 and r["deep_min"] == 100
    assert r["score"] == 80


def test_workouts(store):
    rows = M.workouts(store, UTC)
    assert len(rows) == 4
    assert rows[0]["type"] == "outdoor_running" and rows[0]["duration_min"] == 30


def test_daily_merges(store):
    rows = M.daily(store, UTC, "2026-11-01", "2026-11-07")
    assert len(rows) == DAYS
    d = rows[0]
    for k in ("steps", "hr_avg", "spo2_avg", "stress_avg", "sleep_min", "resting_hr"):
        assert d.get(k) is not None, k
    assert d["workouts"] == 1


def test_series_agg(store):
    rows = M.series(store, UTC, "heart_rate", "bpm", agg="max")
    assert rows[0] == {"date": "2026-11-01", "max": 110}


def test_date_range_window():
    s, e = M.day_range("2026-11-01", "2026-11-01", UTC)
    assert e - s == 86400
    s2, _ = M.day_range("7d", None, UTC)
    assert s2 is not None


def test_reset(store):
    store.reset()
    assert store.status()["records"] == 0
