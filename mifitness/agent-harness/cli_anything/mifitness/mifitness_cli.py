"""cli-anything-mifitness: agent-native CLI for Xiaomi Mi Fitness data exports.

Command groups:
  project  new | open | info | list
  data     import | status | keys | query | reset
  health   daily | steps | sleep | heart-rate | resting-hr | spo2 | stress | workouts | series
  export   render | presets
  session  status | undo | redo | history
Common commands are also available at top level (e.g. `import`, `daily`, `sleep`).
"""

from __future__ import annotations

import copy
import functools
import json
import os
import shlex
import sqlite3
import sys
from typing import Callable

import click

from cli_anything.mifitness import __version__
from cli_anything.mifitness.core import export as X
from cli_anything.mifitness.core import metrics as M
from cli_anything.mifitness.core import project as P
from cli_anything.mifitness.core.reader import PasswordError, read_export
from cli_anything.mifitness.core.session import Session
from cli_anything.mifitness.core.store import Store

EXPORT_HELP = (
    "No data imported yet. Get your export: Mi Fitness app > Profile > Settings > "
    "Privacy > Export data (or https://account.xiaomi.com > Privacy > Manage your data). "
    "Xiaomi emails a ZIP link and a password. Then run: "
    "cli-anything-mifitness import <export.zip> --password <password>")


class Ctx:
    """Global CLI state shared by every command."""

    def __init__(self, json_out: bool, project: str | None, tz: str):
        self.json = json_out
        self.session = Session()
        self.project = project or os.environ.get("MIFITNESS_PROJECT") or self.session.project
        self.tz_name = tz
        self.tz = M.get_tz(tz)

    def store(self) -> Store:
        return P.open_project(self.project)


def handle_error(f: Callable) -> Callable:
    """Turn expected failures into clean messages (JSON when --json) and exit code 1."""
    @functools.wraps(f)
    def wrapper(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except click.ClickException:
            raise
        except (PasswordError, FileNotFoundError, FileExistsError, ValueError,
                sqlite3.Error, RuntimeError) as e:
            msg = str(e)
            if isinstance(e, RuntimeError) and "password" in msg.lower():
                msg = "Wrong ZIP password. Use the password from Xiaomi's email."
            ctx = click.get_current_context().find_object(Ctx)
            if ctx and ctx.json:
                click.echo(json.dumps({"error": msg, "type": type(e).__name__}))
                sys.exit(1)
            raise click.ClickException(msg)
    return wrapper


def emit(ctx: Ctx, data, columns: list[str] | None = None, title: str | None = None) -> None:
    if ctx.json:
        click.echo(json.dumps(data, indent=2, default=str, ensure_ascii=False))
        return
    if isinstance(data, list):
        if not data:
            click.echo("(no rows)")
            return
        cols = columns or list({k: None for row in data for k in row})
        widths = {c: max(len(c), *(len(_fmt(r.get(c))) for r in data)) for c in cols}
        if title:
            click.secho(title, bold=True)
        click.echo("  ".join(c.ljust(widths[c]) for c in cols))
        click.echo("  ".join("-" * widths[c] for c in cols))
        for r in data:
            click.echo("  ".join(_fmt(r.get(c)).ljust(widths[c]) for c in cols))
    elif isinstance(data, dict):
        for k, v in data.items():
            click.echo(f"{k}: {json.dumps(v, default=str) if isinstance(v, (dict, list)) else v}")
    else:
        click.echo(str(data))


def _fmt(v) -> str:
    return "" if v is None else str(v)


def _need_data(store: Store) -> None:
    if store.status()["records"] == 0:
        raise click.ClickException(EXPORT_HELP)


def with_dates(f: Callable) -> Callable:
    f = click.option("--to", "end", help="End date YYYY-MM-DD (inclusive).")(f)
    f = click.option("--from", "start",
                     help="Start date YYYY-MM-DD, or Nd for the last N days (e.g. 7d).")(f)
    return f


# ======================================================================= root
@click.group(invoke_without_command=True)
@click.option("--json", "json_out", is_flag=True, help="Machine-readable JSON output.")
@click.option("--project", "-p", "project", envvar="MIFITNESS_PROJECT",
              help="Project: a .db path or a profile name (default: current session project).")
@click.option("--db", "project_db", hidden=True, envvar="MIFITNESS_DB")
@click.option("--tz", default=lambda: os.environ.get("MIFITNESS_TZ", "local"), show_default="local",
              help="Time zone for day boundaries, e.g. Asia/Karachi.")
@click.version_option(__version__)
@click.pass_context
def cli(ctx, json_out, project, project_db, tz):
    """Read Xiaomi Mi Fitness (Mi Band / Xiaomi Watch) health data from your account export."""
    ctx.obj = Ctx(json_out, project or project_db, tz)
    if ctx.invoked_subcommand is None:
        ctx.invoke(repl)


# ======================================================================= project
@cli.group()
def project():
    """Create, open and inspect project databases."""


@project.command("new")
@click.argument("name")
@click.option("--open", "open_it", is_flag=True, help="Also make it the current project.")
@click.pass_obj
@handle_error
def project_new(ctx: Ctx, name, open_it):
    """Create an empty project (path ending in .db, or a profile name)."""
    info = P.create(name)
    if open_it:
        ctx.session.set_project(info["project"])
    emit(ctx, {**info, "current": open_it})


@project.command("open")
@click.argument("name")
@click.pass_obj
@handle_error
def project_open(ctx: Ctx, name):
    """Make NAME the current project for later commands."""
    path = P.resolve(name)
    if not path.exists():
        raise FileNotFoundError(f"Project not found: {path}. Create it with `project new`.")
    ctx.session.set_project(str(path))
    emit(ctx, {"current": str(path)})


@project.command("info")
@click.pass_obj
@handle_error
def project_info(ctx: Ctx):
    """Show the current project."""
    i = P.info(ctx.project)
    i["first"], i["last"] = M.iso(i.pop("first_ts", None), ctx.tz), M.iso(i.pop("last_ts", None), ctx.tz)
    emit(ctx, i)


@project.command("list")
@click.pass_obj
@handle_error
def project_list(ctx: Ctx):
    """List profiles."""
    emit(ctx, P.list_profiles(), ["name", "path", "size_bytes"])


# ======================================================================= data
@cli.group()
def data():
    """Import and inspect raw data."""


@data.command("import")
@click.argument("path", type=click.Path(exists=True))
@click.option("--password", envvar="MIFITNESS_ZIP_PASSWORD", help="ZIP password from Xiaomi's email.")
@click.option("--dry-run", is_flag=True, help="Parse and report without saving.")
@click.pass_obj
@handle_error
def import_cmd(ctx: Ctx, path, password, dry_run):
    """Import a Mi Fitness export ZIP, folder or CSV (idempotent, undoable)."""
    records, files = read_export(path, password)
    if not files:
        raise click.ClickException(f"No Mi Fitness CSV files found in {path}.")
    result = {"path": str(path), "files": files, "parsed": len(records), "dry_run": dry_run}
    if not dry_run:
        with ctx.store() as st:
            result.update(st.add(records, path=str(path), files=len(files)))
            result["project"] = str(st.path)
            ctx.session.snapshot(st, "import", result["import_id"],
                                 {"path": str(path), "added": result["added"]})
    if ctx.json:
        emit(ctx, result)
    else:
        emit(ctx, files, ["file", "source", "records"], title="Files")
        click.echo()
        click.echo(f"Parsed {result['parsed']} records" +
                   ("" if dry_run else
                    f", added {result['added']} new ({result['duplicates']} already stored)."))


@data.command()
@click.pass_obj
@handle_error
def status(ctx: Ctx):
    """Show project location, record count and date range."""
    with ctx.store() as st:
        s = st.status()
    s["project"] = s.pop("db")
    s["first"], s["last"] = M.iso(s.pop("first_ts"), ctx.tz), M.iso(s.pop("last_ts"), ctx.tz)
    s["timezone"] = ctx.tz_name
    if not ctx.json:
        s["imports"] = len(s["imports"])
    if s["records"] == 0:
        s["hint"] = EXPORT_HELP
    emit(ctx, s)


@data.command()
@click.pass_obj
@handle_error
def keys(ctx: Ctx):
    """List every data type (key) with counts and date ranges."""
    with ctx.store() as st:
        rows = st.keys()
    for r in rows:
        r["first"], r["last"] = M.iso(r.pop("first"), ctx.tz), M.iso(r.pop("last"), ctx.tz)
    emit(ctx, rows, ["source", "tag", "key", "n", "first", "last"])


@data.command()
@click.option("--key")
@click.option("--source", type=click.Choice(["fitness", "aggregated", "sport", "legacy", "profile", "other"]))
@click.option("--limit", type=int, default=50, show_default=True)
@with_dates
@click.pass_obj
@handle_error
def query(ctx: Ctx, key, source, limit, start, end):
    """Raw records with their full JSON values."""
    with ctx.store() as st:
        _need_data(st)
        s, e = M.day_range(start, end, ctx.tz)
        rows = [{**r.to_dict(), "time": M.iso(r.ts, ctx.tz)}
                for r in st.query(key=key, source=source, start=s, end=e, limit=limit)]
    if ctx.json:
        emit(ctx, rows)
    else:
        for r in rows:
            click.echo(f"{r['time']}  {r['source']}/{r['tag'] or '-'}/{r['key']}  {json.dumps(r['value'])}")


@data.command()
@click.option("--yes", is_flag=True, help="Confirm deletion.")
@click.pass_obj
@handle_error
def reset(ctx: Ctx, yes):
    """Delete all imported data from the project (not undoable)."""
    if not yes:
        raise click.ClickException("This deletes all imported records. Re-run with --yes.")
    with ctx.store() as st:
        st.reset()
        ctx.session.clear(st)
        emit(ctx, {"reset": True, "project": str(st.path)})


# ======================================================================= health
@cli.group()
def health():
    """Per-day health summaries."""


def _metric_cmd(name: str, fn: Callable, cols: list[str], summary_fields: list[str], doc: str):
    @health.command(name, help=doc)
    @with_dates
    @click.option("--summary", is_flag=True, help="Only print averages/min/max over the range.")
    @click.pass_obj
    @handle_error
    def _cmd(ctx: Ctx, start, end, summary):
        with ctx.store() as st:
            _need_data(st)
            rows = fn(st, ctx.tz, start, end)
        emit(ctx, M.summary(rows, summary_fields) if summary else rows, None if summary else cols)
    return _cmd


_metric_cmd("daily", M.daily, ["date", "steps", "calories_kcal", "hr_avg", "resting_hr", "spo2_avg",
                               "stress_avg", "sleep_min", "sleep_score", "workouts"],
            ["steps", "calories_kcal", "hr_avg", "resting_hr", "spo2_avg", "stress_avg", "sleep_min"],
            "One row per day combining every metric.")
_metric_cmd("steps", M.steps, ["date", "steps", "distance_m", "calories_kcal", "basis"],
            ["steps", "distance_m", "calories_kcal"], "Daily steps, distance and calories.")
_metric_cmd("sleep", M.sleep, ["date", "type", "bedtime", "wake_time", "total_min", "deep_min",
                               "light_min", "rem_min", "awake_min", "score"],
            ["total_min", "deep_min", "light_min", "rem_min", "score"], "Sleep sessions and stages (minutes).")
_metric_cmd("heart-rate", M.heart_rate, ["date", "avg", "min", "max", "samples", "basis"],
            ["avg", "min", "max"], "Daily heart rate (bpm).")
_metric_cmd("resting-hr", M.resting_heart_rate, ["date", "avg", "min", "max", "samples", "basis"],
            ["avg"], "Daily resting heart rate (bpm).")
_metric_cmd("spo2", M.spo2, ["date", "avg", "min", "max", "samples", "basis"],
            ["avg", "min", "max"], "Daily blood oxygen (SpO2 %).")
_metric_cmd("stress", M.stress, ["date", "avg", "min", "max", "samples", "basis"],
            ["avg", "min", "max"], "Daily stress score (0-100).")
_metric_cmd("workouts", M.workouts, ["start", "type", "duration_min", "distance_m", "calories_kcal",
                                     "avg_hr", "max_hr"],
            ["duration_min", "distance_m", "calories_kcal", "avg_hr"], "Recorded workouts.")


@health.command()
@click.argument("key")
@click.option("--field", help="JSON field inside Value to read (default: the only numeric field).")
@click.option("--agg", type=click.Choice(["none", "sum", "avg", "min", "max", "count"]), default="none")
@click.option("--source", type=click.Choice(["fitness", "aggregated", "sport", "legacy", "other"]))
@with_dates
@click.pass_obj
@handle_error
def series(ctx: Ctx, key, field, agg, source, start, end):
    """Time series for any KEY (see `data keys`), optionally aggregated per day."""
    with ctx.store() as st:
        _need_data(st)
        emit(ctx, M.series(st, ctx.tz, key, field, start, end, agg, source))


# ======================================================================= export
@cli.group("export")
def export_group():
    """Write tables and reports to files."""


@export_group.command("presets")
@click.pass_obj
def export_presets(ctx: Ctx):
    """List export presets."""
    emit(ctx, [{"preset": k, **v} for k, v in X.EXPORT_PRESETS.items()],
         ["preset", "format", "description"])


@export_group.command("render")
@click.argument("preset", type=click.Choice(list(X.EXPORT_PRESETS)))
@click.option("-o", "--output", type=click.Path(dir_okay=False), required=True)
@click.option("--overwrite/--no-overwrite", default=True, show_default=True)
@with_dates
@click.pass_obj
@handle_error
def export_render(ctx: Ctx, preset, output, overwrite, start, end):
    """Render PRESET (see `export presets`) to OUTPUT."""
    with ctx.store() as st:
        _need_data(st)
        emit(ctx, X.render(st, ctx.tz, preset, output, start, end, overwrite))


# ======================================================================= session
@cli.group()
def session():
    """Current project and undo/redo of imports."""


@session.command("status")
@click.pass_obj
def session_status(ctx: Ctx):
    """Show the current project and session file."""
    emit(ctx, {"session_file": str(ctx.session.path), "project": str(P.resolve(ctx.project)),
               "timezone": ctx.tz_name})


@session.command()
@click.pass_obj
@handle_error
def undo(ctx: Ctx):
    """Undo the last import (records are kept aside and can be redone)."""
    with ctx.store() as st:
        emit(ctx, ctx.session.undo(st))


@session.command()
@click.pass_obj
@handle_error
def redo(ctx: Ctx):
    """Redo the last undone import."""
    with ctx.store() as st:
        emit(ctx, ctx.session.redo(st))


@session.command()
@click.pass_obj
@handle_error
def history(ctx: Ctx):
    """Show undo/redo stacks for the current project."""
    with ctx.store() as st:
        emit(ctx, ctx.session.history(st))


# ======================================================================= shortcuts
def _shortcut(cmd: click.Command, name: str | None = None) -> None:
    c = copy.copy(cmd)
    c.hidden = True
    cli.add_command(c, name or cmd.name)


for _c in (import_cmd, status, keys, query, reset):
    _shortcut(_c)
for _n, _c in health.commands.items():
    _shortcut(_c, _n)
_shortcut(undo)
_shortcut(redo)


# ======================================================================= repl
@cli.command()
@click.pass_context
def repl(click_ctx):
    """Interactive mode (default when no command is given)."""
    from cli_anything.mifitness.utils.repl_skin import ReplSkin
    skin = ReplSkin("mifitness", version=__version__)
    skin.print_banner()
    pt = skin.create_prompt_session()
    obj: Ctx = click_ctx.obj
    cmds = {n: (c.help or "").split("\n")[0] for n, c in cli.commands.items()
            if not c.hidden and n != "repl"}
    while True:
        try:
            line = skin.get_input(pt, project_name=os.path.basename(str(P.resolve(obj.project))))
        except (EOFError, KeyboardInterrupt):
            break
        line = (line or "").strip()
        if not line:
            continue
        if line in ("exit", "quit", "q"):
            break
        if line in ("help", "?"):
            skin.help(cmds)
            continue
        args = shlex.split(line)
        if obj.json and "--json" not in args:
            args = ["--json"] + args
        if obj.project and "--project" not in args and "-p" not in args:
            args = ["--project", str(obj.project)] + args
        try:
            cli.main(args=args, standalone_mode=False)
        except click.ClickException as e:
            skin.error(e.format_message())
        except SystemExit:
            pass
        except Exception as e:  # keep the REPL alive
            skin.error(f"{type(e).__name__}: {e}")
    skin.print_goodbye()


def main() -> None:
    cli()


if __name__ == "__main__":
    main()
