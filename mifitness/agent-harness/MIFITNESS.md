# Mi Fitness — harness SOP

Method: `cli-anything-plugin/HARNESS.md` in HKUDS/CLI-Anything (not duplicated here).

## Architecture analysis
- **Software:** Xiaomi Mi Fitness (Android/iOS app for Mi Smart Band and Xiaomi/Redmi
  watches). Closed source; data syncs to Xiaomi cloud.
- **Backend:** there is no public API, SDK or desktop app. The only official, stable
  data path is the **account data export** (GDPR/PIPL): an AES-encrypted ZIP of CSVs,
  emailed with a separate password. That export is the backend this harness drives.
- **Data model:** CSV rows `Uid,Sid,[Tag,]Key,Time,[Category,]Value,UpdateTime`; `Value`
  is a JSON object, `Time` is Unix seconds. Files: `*_hlth_center_fitness_data.csv`
  (raw samples), `*_hlth_center_aggregated_fitness_data.csv` (daily reports, `Tag`),
  `*_hlth_center_sport_record.csv` (workouts), `*_user_member_profile.csv`. The legacy
  Mi Fit / Zepp Life export (ACTIVITY/, SLEEP/, HEARTRATE_AUTO/, SPORT/) is also read.
- **State:** a project = SQLite DB (`records`, `imports`, `undone_records`); session =
  `session.json` (current project, undo/redo stacks), written with `fcntl` locking.

## Command map (app → CLI)
| Mi Fitness app | CLI |
|---|---|
| Profile > Privacy > Export data | `data import <zip> --password` |
| Home dashboard (today/week) | `health daily --from 7d` |
| Steps card | `health steps` |
| Sleep card / sleep details | `health sleep` |
| Heart rate card, resting HR | `health heart-rate`, `health resting-hr` |
| Blood oxygen card | `health spo2` |
| Stress card | `health stress` |
| Workout records | `health workouts` |
| Any other card (PAI, stand, weight, ...) | `data keys` → `health series <key>` |
| Share / export | `export render <preset> -o FILE` |

## Rendering gap assessment
- **Not live.** Data is as fresh as the latest export; the user must request a new
  export to update (re-import is idempotent).
- **No write-back.** Exports are read-only; the CLI cannot change goals, alarms or the band.
- **Field drift.** Xiaomi renames JSON fields across firmware. Metrics search candidate
  names and fall back to the single numeric field; `series --field` covers the rest.
  The fixture mirrors the documented layout but has not been checked against every
  firmware version.
- **Unofficial cloud API** (reverse-engineered login) was deliberately not used: it is
  unsupported, can break or flag accounts, and needs the user's Xiaomi password.
