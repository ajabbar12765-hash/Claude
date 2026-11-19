"""Session state: current project and undo/redo history of imports.

Saved to ``$MIFITNESS_HOME/session.json`` with exclusive file locking so
parallel CLI calls cannot corrupt it. Undo moves the records of the last
import aside (they are kept, not destroyed); redo restores them.
"""

from __future__ import annotations

import json
import os
import time
from pathlib import Path

from .store import Store, default_home


def _locked_save_json(path, data, **dump_kwargs) -> None:
    """Atomically write JSON with exclusive file locking."""
    try:
        f = open(path, "r+")
    except FileNotFoundError:
        os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
        f = open(path, "w")
    with f:
        _locked = False
        try:
            import fcntl
            fcntl.flock(f.fileno(), fcntl.LOCK_EX)
            _locked = True
        except (ImportError, OSError):
            pass
        try:
            f.seek(0)
            f.truncate()
            json.dump(data, f, **dump_kwargs)
            f.flush()
        finally:
            if _locked:
                fcntl.flock(f.fileno(), fcntl.LOCK_UN)


class Session:
    """Per-user session: which project is open plus undo/redo stacks per project."""

    def __init__(self, path: str | os.PathLike | None = None):
        self.path = Path(path) if path else default_home() / "session.json"
        self.data: dict = {"project": None, "history": {}}
        if self.path.exists():
            try:
                self.data.update(json.loads(self.path.read_text() or "{}"))
            except ValueError:
                pass

    def save(self) -> None:
        _locked_save_json(self.path, self.data, indent=2)

    # current project
    @property
    def project(self) -> str | None:
        return self.data.get("project")

    def set_project(self, project: str | None) -> None:
        self.data["project"] = project
        self.save()

    def _stacks(self, db: str) -> dict:
        return self.data["history"].setdefault(db, {"undo": [], "redo": []})

    def snapshot(self, store: Store, action: str, import_id: int, detail: dict | None = None) -> None:
        """Record an import so it can be undone."""
        st = self._stacks(str(store.path))
        st["undo"].append({"import_id": import_id, "action": action, "at": int(time.time()),
                           **(detail or {})})
        st["redo"].clear()
        self.save()

    def undo(self, store: Store) -> dict:
        st = self._stacks(str(store.path))
        if not st["undo"]:
            raise ValueError("Nothing to undo.")
        entry = st["undo"].pop()
        entry["records"] = store.undo_import(entry["import_id"])
        st["redo"].append(entry)
        self.save()
        return {"undone": entry}

    def redo(self, store: Store) -> dict:
        st = self._stacks(str(store.path))
        if not st["redo"]:
            raise ValueError("Nothing to redo.")
        entry = st["redo"].pop()
        entry["records"] = store.redo_import(entry["import_id"])
        st["undo"].append(entry)
        self.save()
        return {"redone": entry}

    def history(self, store: Store) -> dict:
        st = self._stacks(str(store.path))
        return {"project": str(store.path), "undo": list(st["undo"]), "redo": list(st["redo"])}

    def clear(self, store: Store) -> None:
        self.data["history"].pop(str(store.path), None)
        self.save()
