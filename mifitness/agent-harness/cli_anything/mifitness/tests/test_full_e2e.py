import csv
import json
import os
import shutil
import subprocess
import sys

import pytest

from cli_anything.mifitness.tests.fixtures import DAILY_STEPS, DAYS, write_zip


def _resolve_cli(name):
    force = os.environ.get("CLI_ANYTHING_FORCE_INSTALLED", "").strip() == "1"
    path = shutil.which(name)
    if path:
        print(f"[_resolve_cli] Using installed command: {path}")
        return [path]
    if force:
        raise RuntimeError(f"{name} not found in PATH. Install with: pip install -e .")
    return [sys.executable, "-m", "cli_anything.mifitness"]


CLI = _resolve_cli("cli-anything-mifitness")


@pytest.fixture
def env(tmp_path):
    z = write_zip(tmp_path / "export.zip")
    e = {**os.environ, "MIFITNESS_HOME": str(tmp_path / "home"), "MIFITNESS_TZ": "UTC"}
    return tmp_path, z, e


def run(e, *args, check=True):
    r = subprocess.run(CLI + list(args), capture_output=True, text=True, env=e)
    if check and r.returncode != 0:
        raise AssertionError(r.stderr + r.stdout)
    return r


def imported(env):
    tmp, z, e = env
    run(e, "import", str(z), "--password", "s3cret")
    return tmp, e


def test_help(env):
    assert "Mi Fitness" in run(env[2], "--help").stdout


def test_status_empty_hint(env):
    out = json.loads(run(env[2], "--json", "status").stdout)
    assert out["records"] == 0


def test_missing_and_wrong_password(env):
    tmp, z, e = env
    r = run(e, "import", str(z), check=False)
    assert r.returncode != 0 and "password" in r.stderr.lower()
    r = run(e, "import", str(z), "--password", "nope", check=False)
    assert r.returncode != 0 and "password" in r.stderr.lower()


def test_import_and_status(env):
    tmp, z, e = env
    out = json.loads(run(e, "--json", "import", str(z), "--password", "s3cret").stdout)
    assert out["added"] == out["parsed"] > 50 and len(out["files"]) == 4
    st = json.loads(run(e, "--json", "status").stdout)
    assert st["first"].startswith("2026-11-01") and st["last"].startswith("2026-11-07")
    again = json.loads(run(e, "--json", "import", str(z), "--password", "s3cret").stdout)
    assert again["added"] == 0


def test_weekly_daily(env):
    tmp, e = imported(env)
    rows = json.loads(run(e, "--json", "daily", "--from", "2026-11-01", "--to", "2026-11-07").stdout)
    assert len(rows) == DAYS
    assert [r["steps"] for r in rows] == DAILY_STEPS
    assert all(r["sleep_min"] == 480 for r in rows)


def test_sleep_workouts_vitals(env):
    tmp, e = imported(env)
    assert len(json.loads(run(e, "--json", "sleep").stdout)) == DAYS
    w = json.loads(run(e, "--json", "workouts").stdout)
    assert len(w) == 4 and w[0]["distance_m"] == 5000
    hr = json.loads(run(e, "--json", "heart-rate", "--summary").stdout)
    assert hr["max"]["max"] == 110
    assert json.loads(run(e, "--json", "spo2").stdout)[0]["avg"] == 96
    keys = {k["key"] for k in json.loads(run(e, "--json", "keys").stdout)}
    assert {"steps", "heart_rate", "spo2", "stress", "watch_night_sleep", "outdoor_running"} <= keys


def test_export_csv_json(env):
    tmp, e = imported(env)
    out = tmp / "daily.csv"
    run(e, "export", "--what", "daily", "-o", str(out))
    assert out.exists() and out.stat().st_size > 0
    rows = list(csv.DictReader(out.open()))
    assert len(rows) == DAYS and [int(r["steps"]) for r in rows] == DAILY_STEPS
    print(f"\n  CSV: {out} ({out.stat().st_size:,} bytes)")
    j = tmp / "raw.json"
    run(e, "export", "--what", "raw", "--format", "json", "-o", str(j))
    assert len(json.loads(j.read_text())) > 50


def test_human_table(env):
    tmp, e = imported(env)
    out = run(e, "steps").stdout
    assert "steps" in out and str(DAILY_STEPS[0]) in out
