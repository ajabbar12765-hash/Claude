"""Projects: a project is one SQLite database of imported Mi Fitness data.

A project can be given as a file path (``my.db``) or as a profile name
(``me``), which lives at ``$MIFITNESS_HOME/profiles/<name>.db``. The default
project is ``$MIFITNESS_HOME/mifitness.db``.
"""

from __future__ import annotations

import os
from pathlib import Path

from .store import Store, default_db, default_home

PROFILE_DIR = "profiles"


def resolve(project: str | os.PathLike | None) -> Path:
    """Map a project argument (path, profile name or None) to a database path."""
    if not project:
        return default_db()
    p = Path(project).expanduser()
    if p.suffix in (".db", ".sqlite", ".sqlite3") or p.parent != Path("."):
        return p.resolve()
    return default_home() / PROFILE_DIR / f"{p.name}.db"


def create(project: str | os.PathLike, exist_ok: bool = False) -> dict:
    """Create an empty project database."""
    path = resolve(project)
    if path.exists() and not exist_ok:
        raise FileExistsError(f"Project already exists: {path}")
    with Store(path):
        pass
    return info(path)


def open_project(project: str | os.PathLike | None) -> Store:
    """Open an existing project (raises if missing, except the default)."""
    path = resolve(project)
    if project and not path.exists():
        raise FileNotFoundError(f"Project not found: {path}. Create it with `project new`.")
    return Store(path)


def save(store: Store) -> dict:
    """SQLite commits on every write; this only flushes and reports."""
    store.conn.commit()
    return info(store.path)


def info(project: str | os.PathLike | None) -> dict:
    """Summary of a project database."""
    path = resolve(project)
    if not path.exists():
        return {"project": str(path), "exists": False}
    with Store(path) as st:
        s = st.status()
    return {"project": str(path), "exists": True, "size_bytes": path.stat().st_size,
            "records": s["records"], "first_ts": s["first_ts"], "last_ts": s["last_ts"],
            "imports": len(s["imports"])}


def list_profiles() -> list[dict]:
    """All named profiles plus the default project."""
    out = []
    d = default_db()
    if d.exists():
        out.append({"name": "(default)", "path": str(d), "size_bytes": d.stat().st_size})
    pdir = default_home() / PROFILE_DIR
    if pdir.is_dir():
        for f in sorted(pdir.glob("*.db")):
            out.append({"name": f.stem, "path": str(f), "size_bytes": f.stat().st_size})
    return out
