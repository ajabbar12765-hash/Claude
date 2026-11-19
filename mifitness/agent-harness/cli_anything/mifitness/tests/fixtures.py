"""Build a realistic synthetic Mi Fitness export (same layout/columns as Xiaomi's)."""
import csv
import io
import json
from datetime import datetime, timedelta, timezone

import pyzipper

UID = "1234567890"
TZ = timezone.utc
START = datetime(2026, 11, 1, tzinfo=TZ)
DAYS = 7
DAILY_STEPS = [8000 + 500 * i for i in range(DAYS)]


def _csv(header, rows):
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(header)
    w.writerows(rows)
    return buf.getvalue()


def build_files():
    fitness, agg, sport = [], [], []
    for d in range(DAYS):
        day = START + timedelta(days=d)
        ts0 = int(day.timestamp())
        # raw step samples: 4 chunks summing to daily total
        for i in range(4):
            t = ts0 + 8 * 3600 + i * 3600
            fitness.append([UID, "sid", "steps", t, json.dumps(
                {"time": t, "steps": DAILY_STEPS[d] // 4, "distance": 700, "calories": 40}), t])
        for i, bpm in enumerate([60, 72, 90, 110]):
            t = ts0 + 9 * 3600 + i * 600
            fitness.append([UID, "sid", "heart_rate", t, json.dumps({"time": t, "bpm": bpm}), t])
        fitness.append([UID, "sid", "spo2", ts0 + 3 * 3600, json.dumps({"spo2": 96 + d % 3}), ts0])
        fitness.append([UID, "sid", "stress", ts0 + 14 * 3600, json.dumps({"stress": 30 + d}), ts0])
        bed = ts0 - 2 * 3600  # 22:00 previous day
        wake = ts0 + 6 * 3600
        fitness.append([UID, "sid", "watch_night_sleep", wake, json.dumps({
            "bedtime": bed, "wake_up_time": wake, "duration": 480,
            "sleep_deep_duration": 100, "sleep_light_duration": 280,
            "sleep_rem_duration": 100, "sleep_awake_duration": 10,
            "awake_count": 2, "sleep_score": 80 + d}), wake])
        agg.append([UID, "sid", "daily_report", "steps", ts0, json.dumps(
            {"time": ts0, "steps": DAILY_STEPS[d], "distance": 6000, "calories": 300}), ts0])
        agg.append([UID, "sid", "daily_report", "resting_heart_rate", ts0,
                    json.dumps({"avg_rhr": 58 + d % 2}), ts0])
        if d % 2 == 0:
            st = ts0 + 18 * 3600
            sport.append([UID, "sid", "outdoor_running", st, "outdoor_running", json.dumps({
                "start_time": st, "end_time": st + 1800, "duration": 1800, "distance": 5000,
                "calories": 350, "avg_hrm": 150, "max_hrm": 172, "steps": 5200}), st])
    p = f"20261108_{UID}_MiFitness_"
    return {
        f"{p}hlth_center_fitness_data.csv":
            _csv(["Uid", "Sid", "Key", "Time", "Value", "UpdateTime"], fitness),
        f"{p}hlth_center_aggregated_fitness_data.csv":
            _csv(["Uid", "Sid", "Tag", "Key", "Time", "Value", "UpdateTime"], agg),
        f"{p}hlth_center_sport_record.csv":
            _csv(["Uid", "Sid", "Key", "Time", "Category", "Value", "UpdateTime"], sport),
        f"{p}user_member_profile.csv": _csv(["Uid", "Height", "Weight"], [[UID, 175, 70]]),
    }


def write_zip(path, password="s3cret"):
    with pyzipper.AESZipFile(path, "w", compression=pyzipper.ZIP_DEFLATED,
                             encryption=pyzipper.WZ_AES) as zf:
        zf.setpassword(password.encode())
        for name, text in build_files().items():
            zf.writestr(name, text)
    return path
