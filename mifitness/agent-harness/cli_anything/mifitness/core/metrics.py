"""Turn stored records into per-day health summaries.

Field names in Xiaomi exports vary between firmware/app versions, so each
metric looks through a list of candidate field names and falls back to
any single numeric field. Use ``series`` for anything not covered here.
"""

from __future__ import annotations

from collections import defaultdict
from datetime import date, datetime, timedelta, timezone, tzinfo
from statistics import mean
from zoneinfo import ZoneInfo

from .reader import Record
from .store import Store

IGNORE_FIELDS = {"time", "ts", "timestamp", "date", "uid", "sid", "zone_offset",
                 "zoneOffset", "timezone", "updatetime", "start_time", "end_time"}


def get_tz(name: str | None) -> tzinfo:
    if not name or name == "local":
        return datetime.now().astimezone().tzinfo
    if name.upper() == "UTC":
        return timezone.utc
    return ZoneInfo(name)


def day_of(ts: int, tz: tzinfo) -> str:
    return datetime.fromtimestamp(ts, tz).date().isoformat()


def iso(ts: int | None, tz: tzinfo) -> str | None:
    if ts is None:
        return None
    return datetime.fromtimestamp(ts, tz).isoformat(timespec="minutes")


def day_range(start: str | None, end: str | None, tz: tzinfo) -> tuple[int | None, int | None]:
    """Convert inclusive YYYY-MM-DD dates (or 'Nd' = last N days) to [start_ts, end_ts)."""
    def to_ts(d: date) -> int:
        return int(datetime(d.year, d.month, d.day, tzinfo=tz).timestamp())
    s = e = None
    if start:
        if start.endswith("d") and start[:-1].isdigit():
            today = datetime.now(tz).date()
            s = to_ts(today - timedelta(days=int(start[:-1]) - 1))
        else:
            s = to_ts(date.fromisoformat(start))
    if end:
        e = to_ts(date.fromisoformat(end) + timedelta(days=1))
    return s, e


def num(value: dict, *names):
    for n in names:
        v = value.get(n)
        if isinstance(v, bool):
            continue
        if isinstance(v, (int, float)):
            return v
        if isinstance(v, str):
            try:
                return float(v)
            except ValueError:
                pass
    return None


def only_numeric(value: dict):
    nums = [v for k, v in value.items()
            if k not in IGNORE_FIELDS and isinstance(v, (int, float)) and not isinstance(v, bool)]
    return nums[0] if len(nums) == 1 else None


def _r(x, nd=1):
    if x is None:
        return None
    x = round(x, nd)
    return int(x) if float(x).is_integer() else x


def _daily_reports(store, key, s, e):
    return [r for r in store.query(key=key, start=s, end=e, source="aggregated")
            if r.tag in ("", "daily_report", "days", "day")]


# ---------------------------------------------------------------- steps
def steps(store: Store, tz, start=None, end=None) -> list[dict]:
    s, e = day_range(start, end, tz)
    out: dict[str, dict] = {}
    for r in store.query(key="steps", start=s, end=e, source="fitness"):
        d = out.setdefault(day_of(r.ts, tz), {"date": day_of(r.ts, tz), "steps": 0,
                                              "distance_m": 0, "calories_kcal": 0, "basis": "samples"})
        d["steps"] += num(r.value, "steps", "step") or 0
        d["distance_m"] += num(r.value, "distance") or 0
        d["calories_kcal"] += num(r.value, "calories", "calorie") or 0
    for r in store.query(key="activity", start=s, end=e, source="legacy"):
        out[day_of(r.ts, tz)] = {"date": day_of(r.ts, tz), "steps": num(r.value, "steps") or 0,
                                 "distance_m": num(r.value, "distance") or 0,
                                 "calories_kcal": num(r.value, "calories") or 0, "basis": "legacy"}
    for r in _daily_reports(store, "steps", s, e):  # daily totals win
        out[day_of(r.ts, tz)] = {"date": day_of(r.ts, tz),
                                 "steps": num(r.value, "steps", "step") or 0,
                                 "distance_m": num(r.value, "distance") or 0,
                                 "calories_kcal": num(r.value, "calories", "calorie") or 0,
                                 "basis": "daily_report"}
    return [{**v, "distance_m": _r(v["distance_m"]), "calories_kcal": _r(v["calories_kcal"])}
            for _, v in sorted(out.items())]


# ---------------------------------------------------------------- generic sampled vitals
def _vital(store, tz, start, end, keys, sample_fields, report_fields, legacy_key=None,
           legacy_fields=()):
    s, e = day_range(start, end, tz)
    samples: dict[str, list] = defaultdict(list)
    for k in keys:
        for r in store.query(key=k, start=s, end=e, source="fitness"):
            v = num(r.value, *sample_fields)
            if v is None:
                v = only_numeric(r.value)
            if v is not None and v > 0:
                samples[day_of(r.ts, tz)].append(v)
    if legacy_key:
        for r in store.query(key=legacy_key, start=s, end=e, source="legacy"):
            v = num(r.value, *legacy_fields)
            if v is not None and v > 0:
                samples[day_of(r.ts, tz)].append(v)
    out = {d: {"date": d, "avg": _r(mean(v)), "min": _r(min(v)), "max": _r(max(v)),
               "samples": len(v), "basis": "samples"} for d, v in samples.items()}
    avg_f, min_f, max_f = report_fields
    for k in keys:
        for r in _daily_reports(store, k, s, e):
            d = day_of(r.ts, tz)
            row = out.get(d, {"date": d, "samples": 0})
            row.update({"avg": _r(num(r.value, *avg_f)) if num(r.value, *avg_f) is not None else row.get("avg"),
                        "min": _r(num(r.value, *min_f)) if num(r.value, *min_f) is not None else row.get("min"),
                        "max": _r(num(r.value, *max_f)) if num(r.value, *max_f) is not None else row.get("max"),
                        "basis": "daily_report"})
            extra = {kk: vv for kk, vv in r.value.items()
                     if kk not in IGNORE_FIELDS and isinstance(vv, (int, float))
                     and kk not in (*avg_f, *min_f, *max_f)}
            row.update(extra)
            out[d] = row
    return [out[d] for d in sorted(out)]


def heart_rate(store, tz, start=None, end=None):
    return _vital(store, tz, start, end, ["heart_rate", "heartrate"],
                  ("bpm", "heart_rate", "hr", "value"),
                  (("avg_hr", "avg_heart_rate", "avg"), ("min_hr", "min_heart_rate", "min"),
                   ("max_hr", "max_heart_rate", "max")),
                  legacy_key="heartrate_auto", legacy_fields=("heartRate", "heart_rate"))


def spo2(store, tz, start=None, end=None):
    return _vital(store, tz, start, end, ["spo2", "blood_oxygen"], ("spo2", "value"),
                  (("avg_spo2", "avg"), ("min_spo2", "min"), ("max_spo2", "max")))


def stress(store, tz, start=None, end=None):
    return _vital(store, tz, start, end, ["stress"], ("stress", "value"),
                  (("avg_stress", "avg"), ("min_stress", "min"), ("max_stress", "max")))


def resting_heart_rate(store, tz, start=None, end=None):
    return _vital(store, tz, start, end, ["resting_heart_rate", "rhr"],
                  ("bpm", "resting_heart_rate", "rhr", "value"),
                  (("avg_rhr", "avg"), ("min_rhr", "min"), ("max_rhr", "max")))


# ---------------------------------------------------------------- sleep
def sleep(store, tz, start=None, end=None) -> list[dict]:
    s, e = day_range(start, end, tz)
    out = []
    recs = [r for r in store.query(start=s, end=e)
            if "sleep" in r.key.lower() and r.source in ("fitness", "aggregated")]
    seen = set()
    for r in recs:
        v = r.value
        bed = num(v, "bedtime", "bed_time", "start_time", "sleep_start")
        wake = num(v, "wake_up_time", "wakeup_time", "end_time", "sleep_end")
        deep = num(v, "sleep_deep_duration", "deep_duration", "deep_sleep")
        light = num(v, "sleep_light_duration", "light_duration", "light_sleep")
        rem = num(v, "sleep_rem_duration", "rem_duration", "rem")
        awake = num(v, "sleep_awake_duration", "awake_duration", "awake")
        total = num(v, "duration", "total_duration", "sleep_duration", "total")
        if total is None and any(x is not None for x in (deep, light, rem)):
            total = sum(x or 0 for x in (deep, light, rem))
        if total is None and bed and wake:
            total = (wake - bed) / 60
        if total is None:
            continue
        night = day_of(int(wake or r.ts), tz)
        sig = (night, r.key, bed, wake, total)
        if sig in seen:
            continue
        seen.add(sig)
        out.append({"date": night, "type": r.key, "source": r.source,
                    "bedtime": iso(int(bed), tz) if bed else None,
                    "wake_time": iso(int(wake), tz) if wake else None,
                    "total_min": _r(total), "deep_min": _r(deep), "light_min": _r(light),
                    "rem_min": _r(rem), "awake_min": _r(awake),
                    "awake_count": num(v, "awake_count", "wake_count"),
                    "score": num(v, "sleep_score", "score"),
                    "avg_hr": num(v, "avg_hr", "avg_heart_rate")})
    for r in store.query(key="sleep", start=s, end=e, source="legacy"):
        v = r.value
        deep, light, rem = num(v, "deepSleepTime"), num(v, "shallowSleepTime"), num(v, "REMTime")
        total = sum(x or 0 for x in (deep, light, rem))
        if not total:
            continue
        out.append({"date": day_of(r.ts, tz), "type": "sleep", "source": "legacy",
                    "bedtime": iso(int(num(v, "start")), tz) if num(v, "start") else None,
                    "wake_time": iso(int(num(v, "stop")), tz) if num(v, "stop") else None,
                    "total_min": total, "deep_min": deep, "light_min": light, "rem_min": rem,
                    "awake_min": num(v, "wakeTime"), "awake_count": None, "score": None,
                    "avg_hr": None})
    out.sort(key=lambda x: (x["date"], x["bedtime"] or ""))
    return out


# ---------------------------------------------------------------- workouts
def workouts(store, tz, start=None, end=None) -> list[dict]:
    s, e = day_range(start, end, tz)
    out = []
    for r in store.query(start=s, end=e, source="sport") + \
            store.query(key="sport", start=s, end=e, source="legacy"):
        v = r.value
        st = num(v, "start_time", "startTime", "time") or r.ts
        en = num(v, "end_time", "endTime")
        dur = num(v, "duration", "sport_time", "runTime", "total_time")
        if dur is None and en:
            dur = en - st
        out.append({"date": day_of(int(st), tz), "start": iso(int(st), tz),
                    "type": str(v.get("type", "sport")) if r.source == "legacy"
                    else (r.key or r.category),
                    "category": r.category or None,
                    "duration_min": _r(dur / 60) if dur else None,
                    "distance_m": num(v, "distance", "dis"),
                    "calories_kcal": num(v, "calories", "calorie"),
                    "steps": num(v, "steps", "step"),
                    "avg_hr": num(v, "avg_hrm", "avg_heart_rate", "avg_hr", "avgHeartRate"),
                    "max_hr": num(v, "max_hrm", "max_heart_rate", "max_hr", "maxHeartRate"),
                    "avg_pace_s_per_km": num(v, "avg_pace", "pace"),
                    "training_effect": num(v, "train_effect", "training_effect")})
    out.sort(key=lambda x: x["start"] or "")
    return out


# ---------------------------------------------------------------- combined
def daily(store, tz, start=None, end=None) -> list[dict]:
    days: dict[str, dict] = defaultdict(dict)
    for row in steps(store, tz, start, end):
        days[row["date"]].update(steps=row["steps"], distance_m=row["distance_m"],
                                 calories_kcal=row["calories_kcal"])
    for name, fn in (("hr", heart_rate), ("spo2", spo2), ("stress", stress)):
        for row in fn(store, tz, start, end):
            days[row["date"]].update({f"{name}_avg": row.get("avg"), f"{name}_min": row.get("min"),
                                      f"{name}_max": row.get("max")})
    for row in resting_heart_rate(store, tz, start, end):
        days[row["date"]]["resting_hr"] = row.get("avg")
    for row in sleep(store, tz, start, end):
        d = days[row["date"]]
        d["sleep_min"] = (d.get("sleep_min") or 0) + (row["total_min"] or 0)
        for k in ("deep_min", "light_min", "rem_min", "score"):
            if row.get(k) is not None:
                d[f"sleep_{k}" if not k.startswith("score") else "sleep_score"] = row[k]
    for row in workouts(store, tz, start, end):
        d = days[row["date"]]
        d["workouts"] = d.get("workouts", 0) + 1
        d["workout_min"] = _r((d.get("workout_min") or 0) + (row["duration_min"] or 0))
    return [{"date": d, **days[d]} for d in sorted(days)]


def series(store, tz, key, field=None, start=None, end=None, agg="none", source=None):
    s, e = day_range(start, end, tz)
    pts = []
    for r in store.query(key=key, start=s, end=e, source=source):
        v = num(r.value, field) if field else only_numeric(r.value)
        if v is not None:
            pts.append((r.ts, v))
    if agg == "none":
        return [{"time": iso(t, tz), "value": v} for t, v in pts]
    by = defaultdict(list)
    for t, v in pts:
        by[day_of(t, tz)].append(v)
    fn = {"sum": sum, "avg": mean, "min": min, "max": max, "count": len}[agg]
    return [{"date": d, agg: _r(fn(v))} for d, v in sorted(by.items())]


def summary(rows: list[dict], fields: list[str]) -> dict:
    out = {"days": len(rows)}
    for f in fields:
        vals = [r[f] for r in rows if isinstance(r.get(f), (int, float))]
        if vals:
            out[f] = {"avg": _r(mean(vals)), "min": _r(min(vals)), "max": _r(max(vals))}
    return out
