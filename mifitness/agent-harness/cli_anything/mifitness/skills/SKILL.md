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
export into a local SQLite project and answers questions from it.

## Install

```bash
pip install -e mifitness/agent-harness     # from the repo root
```

## Getting the data (one-time, done by the user on their phone)

1. Mi Fitness app > Profile > Settings > Privacy (wording varies by version:
   "User agreement & privacy" / "Manage data") > **Export data**, or sign in at
   account.xiaomi.com > Privacy > Manage your data > Export.
2. Xiaomi emails a download link and, separately, a ZIP password (can take hours).
3. `cli-anything-mifitness import export.zip` with the password in
   `MIFITNESS_ZIP_PASSWORD` (preferred: keeps it out of shell history) or `--password`.

Never print the password or write it to files. Re-importing a newer export is safe:
duplicates are skipped. A bad import can be reverted with `session undo`.

## Quick use (always pass `--json` when parsing output)

```bash
cli-anything-mifitness --json data status
cli-anything-mifitness --json health daily --from 7d          # one row/day, every metric
cli-anything-mifitness --json health sleep --from 30d --summary
cli-anything-mifitness export render report-md -o report.md   # Markdown health report
```

Top-level shortcuts work too: `import`, `status`, `daily`, `steps`, `sleep`,
`heart-rate`, `spo2`, `stress`, `workouts`, `undo`, `redo`.

Dates: `--from 2026-11-01 --to 2026-11-07`, or `--from 30d` for the last 30 days.
Day boundaries use `--tz` (default: local; e.g. `--tz Asia/Karachi`).
Multiple people/devices: `project new <name> --open`, or `--project <name>` per call.

## Command Groups

### project

Create, open and inspect project databases.

| Command | Description |
|---|---|
| `project new` | Create an empty project (path ending in .db, or a profile name). |
| `project open` | Make NAME the current project for later commands. |
| `project info` | Show the current project. |
| `project list` | List profiles. |

### data

Import and inspect raw data.

| Command | Description |
|---|---|
| `data import` | Import a Mi Fitness export ZIP, folder or CSV (idempotent, undoable). |
| `data status` | Show project location, record count and date range. |
| `data keys` | List every data type (key) with counts and date ranges. |
| `data query` | Raw records with their full JSON values. |
| `data reset` | Delete all imported data from the project (not undoable). |

### health

Per-day health summaries.

| Command | Description |
|---|---|
| `health daily` | One row per day combining every metric. |
| `health steps` | Daily steps, distance and calories. |
| `health sleep` | Sleep sessions and stages (minutes). |
| `health heart-rate` | Daily heart rate (bpm). |
| `health resting-hr` | Daily resting heart rate (bpm). |
| `health spo2` | Daily blood oxygen (SpO2 %). |
| `health stress` | Daily stress score (0-100). |
| `health workouts` | Recorded workouts. |
| `health series` | Time series for any KEY (see `data keys`), optionally aggregated per day. |

### export

Write tables and reports to files.

| Command | Description |
|---|---|
| `export presets` | List export presets. |
| `export render` | Render PRESET (see `export presets`) to OUTPUT. |

### session

Current project and undo/redo of imports.

| Command | Description |
|---|---|
| `session status` | Show the current project and session file. |
| `session undo` | Undo the last import (records are kept aside and can be redone). |
| `session redo` | Redo the last undone import. |
| `session history` | Show undo/redo stacks for the current project. |


## Notes for agents
- Units: distance metres, calories kcal, sleep minutes, HR bpm, SpO2 %.
- Sleep rows are dated by the morning you woke up.
- `basis` says whether a day came from Xiaomi's daily report or raw samples.
- Field names differ across firmware; if a metric is empty, run `data keys`, then
  `data query --key <key> --limit 3`, then `health series <key> --field <f> --agg avg`.
- Errors with `--json` print `{"error": ..., "type": ...}` and exit 1.
- Health data is personal: keep it local; don't send it to outside services.
