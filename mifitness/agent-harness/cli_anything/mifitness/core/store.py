"""SQLite store for imported Mi Fitness records.

Location: $MIFITNESS_HOME/mifitness.db, default ~/.cli-anything-mifitness/.
Imports are idempotent: re-importing the same export adds nothing new.
"""

from __future__ import annotations

import hashlib
import json
import os
import sqlite3
import time
from pathlib import Path
from typing import Iterable

from .reader import Record

SCHEMA = """
CREATE TABLE IF NOT EXISTS records (
    id INTEGER PRIMARY KEY,
    source TEXT NOT NULL,
    tag TEXT NOT NULL DEFAULT '',
    key TEXT NOT NULL,
    ts INTEGER NOT NULL,
    category TEXT NOT NULL DEFAULT '',
    value TEXT NOT NULL,
    digest TEXT NOT NULL UNIQUE,
    import_id INTEGER
);
CREATE INDEX IF NOT EXISTS idx_key_ts ON records(key, ts);
CREATE TABLE IF NOT EXISTS imports (
    id INTEGER PRIMARY KEY,
    path TEXT NOT NULL,
    imported_at INTEGER NOT NULL,
    files INTEGER NOT NULL,
    parsed INTEGER NOT NULL,
    added INTEGER NOT NULL,
    undone INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS undone_records (
    import_id INTEGER NOT NULL,
    source TEXT, tag TEXT, key TEXT, ts INTEGER, category TEXT, value TEXT, digest TEXT
);
"""


def default_home() -> Path:
    return Path(os.environ.get("MIFITNESS_HOME", Path.home() / ".cli-anything-mifitness")).expanduser()


def default_db() -> Path:
    return default_home() / "mifitness.db"


class Store:
    def __init__(self, path: str | os.PathLike | None = None):
        self.path = Path(path).expanduser() if path else default_db()
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.conn = sqlite3.connect(self.path, timeout=30)
        self.conn.row_factory = sqlite3.Row
        self.conn.executescript(SCHEMA)
        self._migrate()

    def _migrate(self) -> None:
        cols = {r[1] for r in self.conn.execute("PRAGMA table_info(records)")}
        if "import_id" not in cols:
            self.conn.execute("ALTER TABLE records ADD COLUMN import_id INTEGER")
        cols = {r[1] for r in self.conn.execute("PRAGMA table_info(imports)")}
        if "undone" not in cols:
            self.conn.execute("ALTER TABLE imports ADD COLUMN undone INTEGER NOT NULL DEFAULT 0")
        self.conn.commit()

    def close(self):
        self.conn.close()

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        self.close()

    @staticmethod
    def _digest(r: Record) -> str:
        blob = json.dumps([r.source, r.tag, r.key, r.ts, r.category, r.value], sort_keys=True)
        return hashlib.sha1(blob.encode()).hexdigest()

    def add(self, records: Iterable[Record], path: str = "", files: int = 0) -> dict:
        """Insert records as one import batch. Returns counts and the import id."""
        parsed = added = 0
        with self.conn:
            cur = self.conn.execute(
                "INSERT INTO imports(path,imported_at,files,parsed,added) VALUES (?,?,?,?,?)",
                (str(path), int(time.time()), files, 0, 0))
            import_id = cur.lastrowid
            for r in records:
                parsed += 1
                cur = self.conn.execute(
                    "INSERT OR IGNORE INTO records(source,tag,key,ts,category,value,digest,import_id) "
                    "VALUES (?,?,?,?,?,?,?,?)",
                    (r.source, r.tag, r.key, r.ts, r.category,
                     json.dumps(r.value, sort_keys=True), self._digest(r), import_id))
                added += cur.rowcount
            self.conn.execute("UPDATE imports SET parsed=?, added=? WHERE id=?",
                              (parsed, added, import_id))
        return {"import_id": import_id, "parsed": parsed, "added": added,
                "duplicates": parsed - added}

    def undo_import(self, import_id: int) -> int:
        """Move an import's records aside (reversible). Returns rows moved."""
        with self.conn:
            self.conn.execute(
                "INSERT INTO undone_records SELECT import_id,source,tag,key,ts,category,value,digest "
                "FROM records WHERE import_id=?", (import_id,))
            n = self.conn.execute("DELETE FROM records WHERE import_id=?", (import_id,)).rowcount
            self.conn.execute("UPDATE imports SET undone=1 WHERE id=?", (import_id,))
        return n

    def redo_import(self, import_id: int) -> int:
        """Restore records moved aside by undo_import. Returns rows restored."""
        with self.conn:
            n = self.conn.execute(
                "INSERT OR IGNORE INTO records(import_id,source,tag,key,ts,category,value,digest) "
                "SELECT import_id,source,tag,key,ts,category,value,digest FROM undone_records "
                "WHERE import_id=?", (import_id,)).rowcount
            self.conn.execute("DELETE FROM undone_records WHERE import_id=?", (import_id,))
            self.conn.execute("UPDATE imports SET undone=0 WHERE id=?", (import_id,))
        return n

    def query(self, key: str | None = None, start: int | None = None, end: int | None = None,
              source: str | None = None, tag: str | None = None, limit: int | None = None,
              keys: list[str] | None = None) -> list[Record]:
        sql, args = "SELECT * FROM records WHERE 1=1", []
        if key:
            sql += " AND key = ?"; args.append(key)
        if keys:
            sql += f" AND key IN ({','.join('?' * len(keys))})"; args.extend(keys)
        if source:
            sql += " AND source = ?"; args.append(source)
        if tag is not None:
            sql += " AND tag = ?"; args.append(tag)
        if start is not None:
            sql += " AND ts >= ?"; args.append(start)
        if end is not None:
            sql += " AND ts < ?"; args.append(end)
        sql += " ORDER BY ts"
        if limit:
            sql += " LIMIT ?"; args.append(limit)
        return [Record(row["source"], row["key"], row["ts"], json.loads(row["value"]),
                       tag=row["tag"], category=row["category"])
                for row in self.conn.execute(sql, args)]

    def keys(self) -> list[dict]:
        rows = self.conn.execute(
            "SELECT source, tag, key, COUNT(*) n, MIN(ts) first, MAX(ts) last FROM records "
            "GROUP BY source, tag, key ORDER BY source, tag, key")
        return [dict(r) for r in rows]

    def status(self) -> dict:
        r = self.conn.execute("SELECT COUNT(*) n, MIN(ts) first, MAX(ts) last FROM records "
                              "WHERE source != 'profile'").fetchone()
        imports = [dict(x) for x in self.conn.execute(
            "SELECT id, path, imported_at, files, parsed, added, undone FROM imports ORDER BY id")]
        return {"db": str(self.path), "records": r["n"], "first_ts": r["first"],
                "last_ts": r["last"], "imports": imports}

    def reset(self):
        with self.conn:
            self.conn.execute("DELETE FROM records")
            self.conn.execute("DELETE FROM imports")
            self.conn.execute("DELETE FROM undone_records")
