"""cli-anything-mifitness: agent-native CLI for Xiaomi Mi Fitness data exports."""

from __future__ import annotations

import csv
import io
import json
import os
import shlex
import sys
from datetime import datetime

import click

from cli_anything.mifitness import __version__
from cli_anything.mifitness.core import metrics as M
from cli_anything.mifitness.core.reader import PasswordError, read_export
from cli_anything.mifitness.core.store import Store

EXPORT_HELP = (
    "No data imported yet. Get your export: Mi Fitness app > Profile > Settings > "
    "Privacy (or 'About' > 'User agreement & privacy') > Export data / Delete account "
    "page > 'Export data', or https://account.xiaomi.com > Privacy > Manage your data. "
    "Xiaomi emails a ZIP link and a password. Then run: "
    "cli-anything-mifitness import <export.zip> --password <password>")


class Ctx:
    def __init__(self, json_out: bool, db: str | None, tz: str):
        self.json = json_out
        self.db = db
        self.tz = M.get_tz(tz)
        self.tz_name = tz

    def store(self) -> Store:
        return Store(self.db)


def emit(ctx: Ctx, data, columns: list[str] | None = None, title: str | None = None):
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


def _fmt(v):
    return "" if v is None else str(v)


def _need_data(ctx: Ctx, store: Store):
    if store.status()["records"] == 0:
        raise click.ClickException(EXPORT_HELP)


date_opts = [
    click.option("--from", "start", help="Start date YYYY-MM-DD, or Nd for the last N days (e.g. 7d)."),
    click.option("--to", "end", help="End date YYYY-MM-DD (inclusive)."),
]


def with_dates(f):
    for o in reversed(date_opts):
        f = o(f)
    return f


@click.group(invoke_without_command=True)
@click.option("--json", "json_out", is_flag=True, help="Machine-readable JSON output.")
@click.option("--db", envvar="MIFITNESS_DB", help="SQLite database path (default ~/.cli-anything-mifitness/mifitness.db).")
@click.option("--tz", default=lambda: os.environ.get("MIFITNESS_TZ", "local"), show_default="local",
              help="Time zone for day boundaries, e.g. Asia/Karachi.")
@click.version_option(__version__)
@click.pass_context
def cli(ctx, json_out, db, tz):
    """Read Xiaomi Mi Fitness (Mi Band / Xiaomi Watch) health data from your account export."""
    ctx.obj = Ctx(json_out, db, tz)
    if ctx.invoked_subcommand is None:
        ctx.invoke(repl)


@cli.command("import")
@click.argument("path", type=click.Path(exists=True))
@click.option("--password", envvar="MIFITNESS_ZIP_PASSWORD", help="ZIP password from Xiaomi's email.")
@click.option("--dry-run", is_flag=True, help="Parse and report without saving.")
@click.pass_obj
def import_cmd(ctx: Ctx, path, password, dry_run):
    """Import a Mi Fitness export ZIP, folder or CSV (idempotent)."""
    try:
        records, files = read_export(path, password)
    except PasswordError as e:
        raise click.ClickException(str(e))
    except RuntimeError as e:
        if "password" in str(e).lower():
            raise click.ClickException("Wrong ZIP password. Use the password from Xiaomi's email.")
        raise
    if not files:
        raise click.ClickException(f"No Mi Fitness CSV files found in {path}.")
    result = {"path": str(path), "files": files, "parsed": len(records), "dry_run": dry_run}
    if not dry_run:
        with ctx.store() as st:
            result.update(st.add(records, path=str(path), files=len(files)))
            result["db"] = str(st.path)
    if ctx.json:
        emit(ctx, result)
    else:
        emit(ctx, files, ["file", "source", "records"], title="Files")
        click.echo()
        click.echo(f"Parsed {result['parsed']} records" +
                   ("" if dry_run else f", added {result['added']} new ({result['duplicates']} already stored)."))


@cli.command()
@click.pass_obj
def status(ctx: Ctx):
    """Show database location, record count and date range."""
    with ctx.store() as st:
        s = st.status()
    s["first"] = M.iso(s.pop("first_ts"), ctx.tz)
    s["last"] = M.iso(s.pop("last_ts"), ctx.tz)
    s["timezone"] = ctx.tz_name
    if not ctx.json:
        s["imports"] = len(s["imports"])
        if s["records"] == 0:
            s["hint"] = EXPORT_HELP
    emit(ctx, s)


@cli.command()
@click.pass_obj
def keys(ctx: Ctx):
    """List every data type (key) in the export with counts and date ranges."""
    with ctx.store() as st:
        rows = st.keys()
    for r in rows:
        r["first"], r["last"] = M.iso(r.pop("first"), ctx.tz), M.iso(r.pop("last"), ctx.tz)
    emit(ctx, rows, ["source", "tag", "key", "n", "first", "last"])


def _metric_cmd(name, fn, cols, summary_fields, doc):
    @cli.command(name, help=doc)
    @with_dates
    @click.option("--summary", is_flag=True, help="Only print averages/min/max over the range.")
    @click.pass_obj
    def _cmd(ctx: Ctx, start, end, summary):
        with ctx.store() as st:
            _need_data(ctx, st)
            rows = fn(st, ctx.tz, start, end)
        emit(ctx, M.summary(rows, summary_fields) if summary else rows, None if summary else cols)
    return _cmd


_metric_cmd("steps", M.steps, ["date", "steps", "distance_m", "calories_kcal", "basis"],
            ["steps", "distance_m", "calories_kcal"], "Daily steps, distance and calories.")
_metric_cmd("heart-rate", M.heart_rate, ["date", "avg", "min", "max", "samples", "basis"],
            ["avg", "min", "max"], "Daily heart rate (bpm).")
_metric_cmd("resting-hr", M.resting_heart_rate, ["date", "avg", "min", "max", "samples", "basis"],
            ["avg"], "Daily resting heart rate (bpm).")
_metric_cmd("spo2", M.spo2, ["date", "avg", "min", "max", "samples", "basis"],
            ["avg", "min", "max"], "Daily blood oxygen (SpO2 %).")
_metric_cmd("stress", M.stress, ["date", "avg", "min", "max", "samples", "basis"],
            ["avg", "min", "max"], "Daily stress score (0-100).")
_metric_cmd("sleep", M.sleep, ["date", "type", "bedtime", "wake_time", "total_min", "deep_min",
                               "light_min", "rem_min", "awake_min", "score"],
            ["total_min", "deep_min", "light_min", "rem_min", "score"], "Sleep sessions and stages (minutes).")
_metric_cmd("workouts", M.workouts, ["start", "type", "duration_min", "distance_m", "calories_kcal",
                                     "avg_hr", "max_hr"],
            ["duration_min", "distance_m", "calories_kcal", "avg_hr"], "Recorded workouts.")
_metric_cmd("daily", M.daily, ["date", "steps", "calories_kcal", "hr_avg", "resting_hr", "spo2_avg",
                               "stress_avg", "sleep_min", "sleep_score", "workouts"],
            ["steps", "calories_kcal", "hr_avg", "resting_hr", "spo2_avg", "stress_avg", "sleep_min"],
            "One row per day combining every metric.")


@cli.command()
@click.argument("key")
@click.option("--field", help="JSON field inside Value to read (default: the only numeric field).")
@click.option("--agg", type=click.Choice(["none", "sum", "avg", "min", "max", "count"]), default="none")
@click.option("--source", type=click.Choice(["fitness", "aggregated", "sport", "legacy", "other"]))
@with_dates
@click.pass_obj
def series(ctx: Ctx, key, field, agg, source, start, end):
    """Time series for any KEY (see `keys`), optionally aggregated per day."""
    with ctx.store() as st:
        _need_data(ctx, st)
        emit(ctx, M.series(st, ctx.tz, key, field, start, end, agg, source))


@cli.command()
@click.option("--key")
@click.option("--source", type=click.Choice(["fitness", "aggregated", "sport", "legacy", "profile", "other"]))
@click.option("--limit", type=int, default=50, show_default=True)
@with_dates
@click.pass_obj
def query(ctx: Ctx, key, source, limit, start, end):
    """Raw records with their full JSON values."""
    with ctx.store() as st:
        _need_data(ctx, st)
        s, e = M.day_range(start, end, ctx.tz)
        rows = [{**r.to_dict(), "time": M.iso(r.ts, ctx.tz)}
                for r in st.query(key=key, source=source, start=s, end=e, limit=limit)]
    if ctx.json:
        emit(ctx, rows)
    else:
        for r in rows:
            click.echo(f"{r['time']}  {r['source']}/{r['tag'] or '-'}/{r['key']}  {json.dumps(r['value'])}")


@cli.command()
@click.option("--what", type=click.Choice(["daily", "steps", "sleep", "heart-rate", "spo2", "stress",
                                           "workouts", "raw"]), default="daily", show_default=True)
@click.option("--format", "fmt", type=click.Choice(["csv", "json"]), default="csv", show_default=True)
@click.option("-o", "--output", type=click.Path(dir_okay=False), required=True)
@with_dates
@click.pass_obj
def export(ctx: Ctx, what, fmt, output, start, end):
    """Write a table to CSV or JSON."""
    fns = {"daily": M.daily, "steps": M.steps, "sleep": M.sleep, "heart-rate": M.heart_rate,
           "spo2": M.spo2, "stress": M.stress, "workouts": M.workouts}
    with ctx.store() as st:
        _need_data(ctx, st)
        if what == "raw":
            s, e = M.day_range(start, end, ctx.tz)
            rows = [{**r.to_dict(), "time": M.iso(r.ts, ctx.tz),
                     "value": json.dumps(r.value)} for r in st.query(start=s, end=e)]
        else:
            rows = fns[what](st, ctx.tz, start, end)
    if fmt == "json":
        with open(output, "w", encoding="utf-8") as f:
            json.dump(rows, f, indent=2, default=str)
    else:
        cols = list({k: None for r in rows for k in r})
        with open(output, "w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=cols)
            w.writeheader()
            w.writerows(rows)
    emit(ctx, {"output": os.path.abspath(output), "rows": len(rows), "format": fmt, "what": what})


@cli.command()
@click.option("--yes", is_flag=True, help="Confirm deletion.")
@click.pass_obj
def reset(ctx: Ctx, yes):
    """Delete all imported data from the local database."""
    if not yes:
        raise click.ClickException("This deletes all imported records. Re-run with --yes.")
    with ctx.store() as st:
        st.reset()
        emit(ctx, {"reset": True, "db": str(st.path)})


@cli.command()
@click.pass_context
def repl(click_ctx):
    """Interactive mode (default when no command is given)."""
    from cli_anything.mifitness.utils.repl_skin import ReplSkin
    skin = ReplSkin("mifitness", version=__version__)
    skin.print_banner()
    session = skin.create_prompt_session()
    obj: Ctx = click_ctx.obj
    cmds = {n: (c.help or "").split("\n")[0] for n, c in cli.commands.items() if n != "repl"}
    while True:
        try:
            line = skin.get_input(session, project_name="mifitness")
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
        try:
            cli.main(args=args, standalone_mode=False, obj=None)
        except click.ClickException as e:
            skin.error(e.format_message())
        except SystemExit:
            pass
        except Exception as e:  # keep the REPL alive
            skin.error(f"{type(e).__name__}: {e}")
    skin.print_goodbye()


def main():
    cli()


if __name__ == "__main__":
    main()
