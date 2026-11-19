"""Export presets: write health tables to CSV, JSON or a Markdown report."""

from __future__ import annotations

import csv
import json
import os
from datetime import tzinfo

from . import metrics as M
from .store import Store

TABLES = {
    "daily": M.daily, "steps": M.steps, "sleep": M.sleep, "heart-rate": M.heart_rate,
    "resting-hr": M.resting_heart_rate, "spo2": M.spo2, "stress": M.stress,
    "workouts": M.workouts,
}

EXPORT_PRESETS: dict[str, dict] = {
    **{f"{t}-csv": {"table": t, "format": "csv", "ext": ".csv",
                    "description": f"{t} table as CSV"} for t in TABLES},
    **{f"{t}-json": {"table": t, "format": "json", "ext": ".json",
                     "description": f"{t} table as JSON"} for t in TABLES},
    "raw-json": {"table": "raw", "format": "json", "ext": ".json",
                 "description": "every imported record with its full JSON value"},
    "raw-csv": {"table": "raw", "format": "csv", "ext": ".csv",
                "description": "every imported record, value as a JSON string"},
    "report-md": {"table": "report", "format": "md", "ext": ".md",
                  "description": "Markdown health report: summary plus daily table"},
}


def rows_for(store: Store, tz: tzinfo, table: str, start=None, end=None) -> list[dict]:
    """Rows for a table name (any key of TABLES, or 'raw')."""
    if table == "raw":
        s, e = M.day_range(start, end, tz)
        return [{**r.to_dict(), "time": M.iso(r.ts, tz), "value": json.dumps(r.value)}
                for r in store.query(start=s, end=e)]
    return TABLES[table](store, tz, start, end)


def _report(store: Store, tz: tzinfo, start, end) -> str:
    days = M.daily(store, tz, start, end)
    fields = ["steps", "calories_kcal", "hr_avg", "resting_hr", "spo2_avg", "stress_avg",
              "sleep_min", "sleep_score", "workouts"]
    summ = M.summary(days, fields)
    span = f"{days[0]['date']} to {days[-1]['date']}" if days else "no data"
    lines = ["# Mi Fitness report", "", f"Period: {span} ({len(days)} days)", "",
             "## Averages", "", "| Metric | Avg | Min | Max |", "|---|---|---|---|"]
    for f in fields:
        if f in summ:
            v = summ[f]
            lines.append(f"| {f} | {v['avg']} | {v['min']} | {v['max']} |")
    lines += ["", "## Daily", "", "| " + " | ".join(["date", *fields]) + " |",
              "|" + "---|" * (len(fields) + 1)]
    for d in days:
        lines.append("| " + " | ".join(str(d.get(c, "")) if d.get(c) is not None else ""
                                       for c in ["date", *fields]) + " |")
    w = M.workouts(store, tz, start, end)
    if w:
        lines += ["", "## Workouts", "", "| start | type | min | distance_m | kcal | avg_hr |",
                  "|---|---|---|---|---|---|"]
        for x in w:
            lines.append(f"| {x['start']} | {x['type']} | {x['duration_min']} | "
                         f"{x['distance_m']} | {x['calories_kcal']} | {x['avg_hr']} |")
    return "\n".join(lines) + "\n"


def render(store: Store, tz: tzinfo, preset: str, output: str, start=None, end=None,
           overwrite: bool = True) -> dict:
    """Write ``preset`` to ``output``. Returns output path, row count and size."""
    if preset not in EXPORT_PRESETS:
        raise ValueError(f"Unknown preset {preset!r}. See `export presets`.")
    if os.path.exists(output) and not overwrite:
        raise FileExistsError(f"{output} exists (use --overwrite).")
    spec = EXPORT_PRESETS[preset]
    os.makedirs(os.path.dirname(os.path.abspath(output)), exist_ok=True)
    if spec["format"] == "md":
        text = _report(store, tz, start, end)
        with open(output, "w", encoding="utf-8") as f:
            f.write(text)
        n = text.count("\n")
    else:
        rows = rows_for(store, tz, spec["table"], start, end)
        n = len(rows)
        if spec["format"] == "json":
            with open(output, "w", encoding="utf-8") as f:
                json.dump(rows, f, indent=2, default=str)
        else:
            cols = list({k: None for r in rows for k in r})
            with open(output, "w", newline="", encoding="utf-8") as f:
                w = csv.DictWriter(f, fieldnames=cols)
                w.writeheader()
                w.writerows(rows)
    return {"output": os.path.abspath(output), "preset": preset, "format": spec["format"],
            "rows": n, "size_bytes": os.path.getsize(output)}
