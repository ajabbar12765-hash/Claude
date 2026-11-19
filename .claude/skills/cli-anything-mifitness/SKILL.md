---
name: cli-anything-mifitness
description: >-
  Read the user's Xiaomi Mi Fitness health data (Mi Smart Band / Xiaomi Watch):
  steps, distance, calories, sleep stages and scores, heart rate, resting heart
  rate, SpO2, stress and workouts. Use whenever the user asks about their
  fitness, sleep, heart rate, activity trends or workouts from Mi Fitness.
---

# cli-anything-mifitness

Mi Fitness has no public API. This CLI imports the official Xiaomi account data
export into a local SQLite database and answers questions from it.

## Install

```bash
pip install -e mifitness/agent-harness     # from the repo root
```

## Getting the data (one-time, done by the user on their phone)

1. Mi Fitness app > Profile > Settings > Privacy (wording varies by version:
   "User agreement & privacy" / "Manage data") > **Export data**, or sign in at
   account.xiaomi.com > Privacy > Manage your data > Export.
2. Xiaomi emails a download link and, separately, a ZIP password (can take hours).
3. Upload the ZIP, then: `cli-anything-mifitness import export.zip --password '<pwd>'`

Never print or store the password in files. Prefer `MIFITNESS_ZIP_PASSWORD` env var.
Re-importing a newer export is safe: duplicates are skipped.

## Commands (always use `--json` for parsing)

| Command | What |
|---|---|
| `status` | DB path, record count, date range |
| `keys` | every data type in the export with counts |
| `daily [--from D --to D]` | one row per day: steps, calories, HR, resting HR, SpO2, stress, sleep, workouts |
| `steps`, `sleep`, `heart-rate`, `resting-hr`, `spo2`, `stress`, `workouts` | per-metric tables; add `--summary` for avg/min/max |
| `series KEY [--field F] [--agg sum|avg|min|max|count]` | any other key from `keys` |
| `query [--key K] [--limit N]` | raw records with full JSON |
| `export --what daily|sleep|...|raw --format csv|json -o FILE` | write a file |
| `reset --yes` | delete imported data |

Dates: `--from 2026-11-01 --to 2026-11-07`, or `--from 30d` for the last 30 days.
Day boundaries use `--tz` (default: local; e.g. `--tz Asia/Karachi`).

Example: `cli-anything-mifitness --json daily --from 7d`

## Notes
- Units: distance metres, calories kcal, sleep minutes, HR bpm, SpO2 %.
- Sleep rows are dated by the morning you woke up.
- `basis` says whether a day came from Xiaomi's daily report or was computed from raw samples.
- Field names differ across firmware; if a metric looks empty, run `keys` then
  `query --key <key> --limit 3` and use `series` with the right `--field`.
- Health data is personal: keep it local and don't send it to outside services.
