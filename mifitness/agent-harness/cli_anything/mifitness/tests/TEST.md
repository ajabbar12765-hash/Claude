# cli-anything-mifitness test plan

## Inventory
- `test_core.py`: ~14 unit tests (reader, store, metrics) on synthetic data
- `test_full_e2e.py`: ~8 end-to-end tests: build a realistic AES-encrypted
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
6. **Re-import** is idempotent (added == 0).

## Results
See bottom of file (appended after running pytest).

## Results (2026-11-19)

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
cli_anything/mifitness/tests/test_full_e2e.py::test_help PASSED
cli_anything/mifitness/tests/test_full_e2e.py::test_status_empty_hint PASSED
cli_anything/mifitness/tests/test_full_e2e.py::test_missing_and_wrong_password PASSED
cli_anything/mifitness/tests/test_full_e2e.py::test_import_and_status PASSED
cli_anything/mifitness/tests/test_full_e2e.py::test_weekly_daily PASSED
cli_anything/mifitness/tests/test_full_e2e.py::test_sleep_workouts_vitals PASSED
PASSED
cli_anything/mifitness/tests/test_full_e2e.py::test_human_table PASSED
============================== 23 passed in 2.13s ==============================
```
