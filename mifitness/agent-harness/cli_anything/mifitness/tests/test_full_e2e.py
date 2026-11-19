"""End-to-end tests: generate a realistic AES-encrypted Mi Fitness export and
drive the installed CLI exactly as a user/agent would."""
import csv
import json
import os
import shutil
import subprocess
import sys

import pytest

from cli_anything.mifitness.tests.fixtures import DAILY_STEPS, DAYS, write_zip


def _resolve_cli(name):
    """Resolve installed CLI command; falls back to python -m for dev.

    Set env CLI_ANYTHING_FORCE_INSTALLED=1 to require the installed command.
    """
    force = os.environ.get("CLI_ANYTHING_FORCE_INSTALLED", "").strip() == "1"
    path = shutil.which(name)
    if path:
        print(f"[_resolve_cli] Using installed command: {path}")
        return [path]
    if force:
        raise RuntimeError(f"{name} not found in PATH. Install with: pip install -e .")
    module = "cli_anything.mifitness.mifitness_cli"
    print(f"[_resolve_cli] Falling back to: {sys.executable} -m {module}")
    return [sys.executable, "-m", module]


@pytest.fixture
def env(tmp_path):
    z = write_zip(tmp_path / "export.zip")
    e = {**os.environ, "MIFITNESS_HOME": str(tmp_path / "home"), "MIFITNESS_TZ": "UTC"}
    e.pop("MIFITNESS_PROJECT", None)
    return tmp_path, z, e


class TestCLISubprocess:
    CLI_BASE = _resolve_cli("cli-anything-mifitness")

    def _run(self, e, *args, check=True):
        r = subprocess.run(self.CLI_BASE + list(args), capture_output=True, text=True, env=e)
        if check and r.returncode != 0:
            raise AssertionError(r.stderr + r.stdout)
        return r

    def _json(self, e, *args):
        return json.loads(self._run(e, "--json", *args).stdout)

    def _imported(self, env):
        tmp, z, e = env
        self._run(e, "data", "import", str(z), "--password", "s3cret")
        return tmp, e

    def test_help_groups(self, env):
        out = self._run(env[2], "--help").stdout
        for g in ("project", "data", "health", "export", "session"):
            assert g in out

    def test_status_empty_hint(self, env):
        out = self._json(env[2], "data", "status")
        assert out["records"] == 0 and "Export data" in out["hint"]

    def test_missing_and_wrong_password(self, env):
        tmp, z, e = env
        r = self._run(e, "import", str(z), check=False)
        assert r.returncode == 1 and "password" in r.stderr.lower()
        r = self._run(e, "--json", "import", str(z), "--password", "nope", check=False)
        assert r.returncode == 1 and "password" in json.loads(r.stdout)["error"].lower()

    def test_dry_run_saves_nothing(self, env):
        tmp, z, e = env
        out = self._json(e, "data", "import", str(z), "--password", "s3cret", "--dry-run")
        assert out["parsed"] > 50
        assert self._json(e, "data", "status")["records"] == 0

    def test_import_status_idempotent(self, env):
        tmp, z, e = env
        out = self._json(e, "data", "import", str(z), "--password", "s3cret")
        assert out["added"] == out["parsed"] > 50 and len(out["files"]) == 4
        st = self._json(e, "data", "status")
        assert st["first"].startswith("2026-11-01") and st["last"].startswith("2026-11-07")
        again = self._json(e, "import", str(z), "--password", "s3cret")
        assert again["added"] == 0

    def test_weekly_daily(self, env):
        tmp, e = self._imported(env)
        rows = self._json(e, "health", "daily", "--from", "2026-11-01", "--to", "2026-11-07")
        assert len(rows) == DAYS
        assert [r["steps"] for r in rows] == DAILY_STEPS
        assert all(r["sleep_min"] == 480 for r in rows)

    def test_sleep_workouts_vitals(self, env):
        tmp, e = self._imported(env)
        assert len(self._json(e, "sleep")) == DAYS
        w = self._json(e, "health", "workouts")
        assert len(w) == 4 and w[0]["distance_m"] == 5000
        assert self._json(e, "heart-rate", "--summary")["max"]["max"] == 110
        assert self._json(e, "health", "spo2")[0]["avg"] == 96
        keys = {k["key"] for k in self._json(e, "data", "keys")}
        assert {"steps", "heart_rate", "spo2", "stress", "watch_night_sleep", "outdoor_running"} <= keys

    def test_export_presets(self, env):
        tmp, e = self._imported(env)
        out = tmp / "daily.csv"
        self._run(e, "export", "render", "daily-csv", "-o", str(out))
        rows = list(csv.DictReader(out.open()))
        assert len(rows) == DAYS and [int(r["steps"]) for r in rows] == DAILY_STEPS
        print(f"\n  CSV: {out} ({out.stat().st_size:,} bytes)")
        j = tmp / "raw.json"
        self._run(e, "export", "render", "raw-json", "-o", str(j))
        assert len(json.loads(j.read_text())) > 50
        md = tmp / "report.md"
        res = self._json(e, "export", "render", "report-md", "-o", str(md))
        text = md.read_text()
        assert res["size_bytes"] == md.stat().st_size > 0
        assert text.startswith("# Mi Fitness report") and str(DAILY_STEPS[0]) in text
        print(f"  Report: {md} ({md.stat().st_size:,} bytes)")

    def test_undo_redo_import(self, env):
        tmp, e = self._imported(env)
        n = self._json(e, "data", "status")["records"]
        self._run(e, "session", "undo")
        assert self._json(e, "data", "status")["records"] == 0
        self._run(e, "session", "redo")
        assert self._json(e, "data", "status")["records"] == n
        assert len(self._json(e, "session", "history")["undo"]) == 1

    def test_projects(self, env):
        tmp, z, e = env
        self._run(e, "project", "new", "me", "--open")
        self._run(e, "import", str(z), "--password", "s3cret")
        assert self._json(e, "project", "info")["project"].endswith("profiles/me.db")
        assert [p["name"] for p in self._json(e, "project", "list")] == ["me"]
        assert self._json(e, "--project", "me", "status")["records"] > 50
        r = self._run(e, "--project", "ghost", "status", check=False)
        assert r.returncode == 1

    def test_human_table(self, env):
        tmp, e = self._imported(env)
        out = self._run(e, "steps").stdout
        assert "steps" in out and str(DAILY_STEPS[0]) in out
