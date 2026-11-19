# cli-anything-mifitness test plan

## Inventory
- `test_core.py`: 18 unit tests (reader, store, metrics, project, session, export) on synthetic data
- `test_full_e2e.py`: 11 end-to-end tests in `TestCLISubprocess`: build a realistic AES-encrypted
  Mi Fitness export ZIP, run the installed CLI as a subprocess, verify output files

## Unit plan
- `reader.py`: file classification (new + legacy names), JSON/ms/date time parsing,
  CSV parsing for fitness/aggregated/sport/legacy, folder and plain-CSV inputs,
  encrypted ZIP without password raises `PasswordError`.
- `store.py`: insert, idempotent re-import (duplicates counted), query filters, reset.
- `metrics.py`: daily steps prefer daily_report over samples; heart rate min/avg/max
  from samples; sleep stage totals and night date = wake date; workouts duration
  from seconds; `daily` merges everything; `series` aggregation; `Nd` ranges.

## E2E plan / workflows
1. **First import** — simulates a user importing the emailed export:
   `import export.zip --password` → `status` → verify record count and date range.
2. **Wrong / missing password** → non-zero exit with clear message.
3. **Weekly review** — `daily --from ... --to ...` JSON: 7 days, every metric present.
4. **Sleep + workouts** — values match the generated fixture.
5. **Export** — `export --what daily --format csv` → file exists, header + 7 rows,
   steps column equals fixture totals; JSON export parses.
6. **Re-import** is idempotent (added == 0); `--dry-run` saves nothing.
7. **Undo/redo** — `session undo` empties the project, `session redo` restores it.
8. **Projects** — `project new me --open`, import, `--project me status`; unknown project fails.
9. **Report** — `export render report-md` writes a Markdown report containing fixture values.

## Part 2: Results (2026-11-19)

```
cli_anything/mifitness/tests/test_core.py::test_classify PASSED
cli_anything/mifitness/tests/test_core.py::test_parse_time_variants PASSED
cli_anything/mifitness/tests/test_core.py::test_parse_fitness_csv PASSED
cli_anything/mifitness/tests/test_core.py::test_legacy_activity PASSED
cli_anything/mifitness/tests/test_core.py::test_encrypted_zip_requires_password PASSED
cli_anything/mifitness/tests/test_core.py::test_store_idempotent PASSED
cli_anything/mifitness/tests/test_core.py::test_store_query_filters PASSED
cli_anything/mifitness/tests/test_core.py::test_steps_prefer_daily_report PASSED
cli_anything/mifitness/tests/test_core.py::test_heart_rate_stats PASSED
cli_anything/mifitness/tests/test_core.py::test_sleep PASSED
cli_anything/mifitness/tests/test_core.py::test_workouts PASSED
cli_anything/mifitness/tests/test_core.py::test_daily_merges PASSED
cli_anything/mifitness/tests/test_core.py::test_series_agg PASSED
cli_anything/mifitness/tests/test_core.py::test_date_range_window PASSED
cli_anything/mifitness/tests/test_core.py::test_reset PASSED
cli_anything/mifitness/tests/test_core.py::test_project_resolve_and_create PASSED
cli_anything/mifitness/tests/test_core.py::test_session_undo_redo PASSED
cli_anything/mifitness/tests/test_core.py::test_export_presets_and_report PASSED
cli_anything/mifitness/tests/test_full_e2e.py::TestCLISubprocess::test_help_groups PASSED
cli_anything/mifitness/tests/test_full_e2e.py::TestCLISubprocess::test_status_empty_hint PASSED
cli_anything/mifitness/tests/test_full_e2e.py::TestCLISubprocess::test_missing_and_wrong_password PASSED
cli_anything/mifitness/tests/test_full_e2e.py::TestCLISubprocess::test_dry_run_saves_nothing PASSED
cli_anything/mifitness/tests/test_full_e2e.py::TestCLISubprocess::test_import_status_idempotent PASSED
cli_anything/mifitness/tests/test_full_e2e.py::TestCLISubprocess::test_weekly_daily PASSED
cli_anything/mifitness/tests/test_full_e2e.py::TestCLISubprocess::test_sleep_workouts_vitals PASSED
PASSED
cli_anything/mifitness/tests/test_full_e2e.py::TestCLISubprocess::test_undo_redo_import PASSED
cli_anything/mifitness/tests/test_full_e2e.py::TestCLISubprocess::test_projects PASSED
cli_anything/mifitness/tests/test_full_e2e.py::TestCLISubprocess::test_human_table PASSED
============================== 29 passed in 3.87s ==============================
```
