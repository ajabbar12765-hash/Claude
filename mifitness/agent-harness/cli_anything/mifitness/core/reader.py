"""Read Xiaomi Mi Fitness data exports into normalized records.

Mi Fitness has no public API. The supported way to get data out is the
account data export (Mi Fitness app > Profile > Settings > Privacy >
Export data, or https://account.xiaomi.com > Privacy). Xiaomi emails an
AES-encrypted ZIP plus a separate password. Inside are CSV files such as::

    <date>_<uid>_MiFitness_hlth_center_fitness_data.csv
        Uid,Sid,Key,Time,Value,UpdateTime            (raw samples)
    <date>_<uid>_MiFitness_hlth_center_aggregated_fitness_data.csv
        Uid,Sid,Tag,Key,Time,Value,UpdateTime        (daily/weekly reports)
    <date>_<uid>_MiFitness_hlth_center_sport_record.csv
        Uid,Sid,Key,Time,Category,Value,UpdateTime   (workouts)

``Value`` is a JSON object. ``Time`` is a Unix timestamp in seconds.

The older Mi Fit / Zepp Life export (folders ACTIVITY/, SLEEP/,
HEARTRATE_AUTO/, SPORT/ ...) is also accepted: each row becomes a record
whose key is the folder name in lower case.
"""

from __future__ import annotations

import csv
import io
import json
import os
import zipfile
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable, Iterator

csv.field_size_limit(min(2**31 - 1, 1 << 30))


@dataclass
class Record:
    source: str          # "fitness", "aggregated", "sport", "profile", "legacy", ...
    key: str             # e.g. "steps", "heart_rate", "watch_night_sleep"
    ts: int              # unix seconds (UTC)
    value: dict = field(default_factory=dict)
    tag: str = ""        # aggregated: "daily_report" etc.
    category: str = ""   # sport: category column

    def to_dict(self) -> dict:
        return {"source": self.source, "tag": self.tag, "key": self.key,
                "ts": self.ts, "category": self.category, "value": self.value}


LEGACY_DIRS = {"ACTIVITY", "ACTIVITY_MINUTE", "ACTIVITY_STAGE", "SLEEP",
               "HEARTRATE", "HEARTRATE_AUTO", "SPORT", "BODY", "USER"}


def classify(name: str) -> str | None:
    """Return the record source for a CSV file name, or None to skip it."""
    base = os.path.basename(name).lower()
    if not base.endswith(".csv"):
        return None
    if "aggregated_fitness_data" in base:
        return "aggregated"
    if "fitness_data" in base:
        return "fitness"
    if "sport_record" in base:
        return "sport"
    if "member_profile" in base or "user_profile" in base:
        return "profile"
    parts = [p.upper() for p in Path(name).parts]
    if any(p in LEGACY_DIRS for p in parts[:-1]):
        return "legacy"
    if "mifitness" in base or "hlth_center" in base:
        return "other"
    return None


def _parse_value(raw: str):
    raw = (raw or "").strip()
    if not raw:
        return {}
    try:
        v = json.loads(raw)
    except (ValueError, TypeError):
        return {"raw": raw}
    return v if isinstance(v, dict) else {"value": v}


def _parse_time(raw: str) -> int | None:
    raw = (raw or "").strip()
    if not raw:
        return None
    try:
        t = float(raw)
        if t > 1e12:          # milliseconds
            t /= 1000.0
        return int(t)
    except ValueError:
        pass
    for fmt in ("%Y-%m-%d %H:%M:%S%z", "%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S%z",
                "%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%d"):
        try:
            dt = datetime.strptime(raw, fmt)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return int(dt.timestamp())
        except ValueError:
            continue
    return None


def _num(v):
    try:
        f = float(v)
        return int(f) if f.is_integer() else f
    except (TypeError, ValueError):
        return v


def parse_csv(text: str, source: str, name: str = "") -> Iterator[Record]:
    reader = csv.DictReader(io.StringIO(text.lstrip("﻿")))
    if source == "legacy":
        folder = next((p for p in Path(name).parts[:-1] if p.upper() in LEGACY_DIRS), "legacy")
        key = folder.lower()
        for row in reader:
            row = {k.strip(): (v or "").strip() for k, v in row.items() if k}
            tcol = next((c for c in ("time", "timestamp", "startTime", "start", "date") if row.get(c)), None)
            ts = _parse_time(row.get(tcol, "")) if tcol else None
            if ts is None and row.get("date"):
                ts = _parse_time(row["date"] + (" " + row["time"] if row.get("time") else ""))
            if ts is None:
                continue
            yield Record("legacy", key, ts, {k: _num(v) for k, v in row.items()})
        return
    for row in reader:
        row = {(k or "").strip(): v for k, v in row.items()}
        ts = _parse_time(row.get("Time", ""))
        if source == "profile":
            yield Record("profile", "profile", ts or 0, {k: v for k, v in row.items() if k})
            continue
        if ts is None:
            continue
        yield Record(source, (row.get("Key") or "").strip() or "unknown", ts,
                     _parse_value(row.get("Value", "")),
                     tag=(row.get("Tag") or "").strip(),
                     category=(row.get("Category") or "").strip())


def _iter_zip(path: Path, password: str | None) -> Iterator[tuple[str, str]]:
    pwd = password.encode() if password else None
    try:
        import pyzipper  # AES-encrypted ZIPs (what Xiaomi sends)
        zf = pyzipper.AESZipFile(path)
    except ImportError:
        zf = zipfile.ZipFile(path)
    with zf:
        if pwd:
            zf.setpassword(pwd)
        for info in zf.infolist():
            if info.is_dir():
                continue
            name = info.filename
            if name.lower().endswith(".zip"):
                # nested zip: extract to memory and recurse
                data = zf.read(info)
                import tempfile
                with tempfile.NamedTemporaryFile(suffix=".zip", delete=False) as tmp:
                    tmp.write(data)
                try:
                    for sub, text in _iter_zip(Path(tmp.name), password):
                        yield f"{name}/{sub}", text
                finally:
                    os.unlink(tmp.name)
                continue
            if classify(name) is None:
                continue
            try:
                data = zf.read(info)
            except RuntimeError as e:
                msg = str(e).lower()
                if "password" in msg or "encrypted" in msg:
                    raise PasswordError(
                        "This export is encrypted. Pass the password Xiaomi emailed you "
                        "with --password (or set MIFITNESS_ZIP_PASSWORD).") from e
                raise
            yield name, data.decode("utf-8-sig", errors="replace")


class PasswordError(RuntimeError):
    pass


def iter_files(path: str | os.PathLike, password: str | None = None) -> Iterator[tuple[str, str, str]]:
    """Yield (name, source, text) for each recognised CSV in a zip, folder or file."""
    p = Path(path).expanduser()
    if not p.exists():
        raise FileNotFoundError(f"No such file or folder: {p}")
    if p.is_file() and zipfile.is_zipfile(p):
        for name, text in _iter_zip(p, password):
            src = classify(name)
            if src:
                yield name, src, text
    elif p.is_file():
        src = classify(p.name) or "other"
        yield p.name, src, p.read_text("utf-8-sig", errors="replace")
    else:
        for f in sorted(p.rglob("*")):
            if f.is_file() and zipfile.is_zipfile(f):
                yield from iter_files(f, password)
                continue
            rel = str(f.relative_to(p))
            src = classify(rel) if f.is_file() else None
            if src:
                yield rel, src, f.read_text("utf-8-sig", errors="replace")


def read_export(path, password: str | None = None) -> tuple[list[Record], list[dict]]:
    """Parse an export. Returns (records, file_summaries)."""
    records: list[Record] = []
    files: list[dict] = []
    for name, src, text in iter_files(path, password):
        recs = list(parse_csv(text, src, name))
        records.extend(recs)
        files.append({"file": name, "source": src, "records": len(recs)})
    return records, files


def iter_records(paths: Iterable[str], password: str | None = None) -> Iterator[Record]:
    for p in paths:
        recs, _ = read_export(p, password)
        yield from recs
