# cli-anything-mifitness

Agent-native CLI for **Xiaomi Mi Fitness** (Mi Smart Band, Xiaomi/Redmi Watch) data.
It reads the official account data export, so Claude and other agents can answer
questions about your steps, sleep, heart rate, SpO2, stress and workouts.

## Install

```bash
pip install -e .            # from this folder (Python 3.10+)
```

## Get your data
1. Mi Fitness app > Profile > Settings > Privacy > **Export data**
   (or account.xiaomi.com > Privacy > Manage your data > Export).
2. Xiaomi emails a ZIP link and a separate password.
3. Import:
   ```bash
   export MIFITNESS_ZIP_PASSWORD='...'      # keeps it out of shell history
   cli-anything-mifitness import ~/Downloads/export.zip
   ```

## Usage

```bash
cli-anything-mifitness                     # interactive REPL
cli-anything-mifitness daily --from 7d     # one row per day, all metrics
cli-anything-mifitness sleep --from 30d --summary
cli-anything-mifitness --json workouts     # JSON for agents
cli-anything-mifitness export presets
cli-anything-mifitness export render report-md -o report.md
cli-anything-mifitness session undo        # revert the last import
```

## Command reference

| Group | Commands |
|---|---|
| `project` | `new NAME [--open]`, `open NAME`, `info`, `list` |
| `data` | `import PATH [--password] [--dry-run]`, `status`, `keys`, `query [--key]`, `reset --yes` |
| `health` | `daily`, `steps`, `sleep`, `heart-rate`, `resting-hr`, `spo2`, `stress`, `workouts`, `series KEY` |
| `export` | `presets`, `render PRESET -o FILE` |
| `session` | `status`, `undo`, `redo`, `history` |

Global options: `--json`, `--project/-p NAME|PATH`, `--tz ZONE`. Health commands take
`--from` / `--to` (`YYYY-MM-DD` or `30d`) and `--summary`.

Environment: `MIFITNESS_HOME` (data folder, default `~/.cli-anything-mifitness`),
`MIFITNESS_PROJECT`, `MIFITNESS_TZ`, `MIFITNESS_ZIP_PASSWORD`.

## Tests

```bash
CLI_ANYTHING_FORCE_INSTALLED=1 python -m pytest -v cli_anything/mifitness/tests
```

They use a generated, realistic AES-encrypted export. No real health data is in the repo.
See `MIFITNESS.md` for architecture and limitations.
