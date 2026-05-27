"""
seed.py — Sensor data generator.

1. On startup: generate SEED_HISTORY_HOURS of historical data so
   charts have something to show immediately.
2. Every SEED_INTERVAL_SECONDS: insert a fresh reading for every
   asset+metric, simulating a live plant.

Uses a simple random walk with per-metric baselines so
readings look realistic and continuously changing.
"""

import logging
import math
import random
import threading
import time
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import Asset, SensorReading
from app.config import settings

logger = logging.getLogger(__name__)

# ------------------------------------------------------------------
# Metric definitions per asset type.
# Each entry: (metric_name, unit, base_value, noise_amplitude)
# The seeder generates values as:  base + noise * sin(t) + random
# ------------------------------------------------------------------
METRICS_BY_TYPE: dict[str, list[tuple[str, str, float, float]]] = {
    "turbine": [
        ("temperature",  "°C",       540.0,  15.0),
        ("pressure",     "bar",       80.0,   5.0),
        ("power",        "kW",      5000.0, 300.0),
        ("output",       "units/hr", 120.0,  10.0),
    ],
    "boiler": [
        ("temperature",  "°C",       350.0,  20.0),
        ("pressure",     "bar",      120.0,   8.0),
        ("power",        "kW",      2000.0, 150.0),
    ],
    "pump": [
        ("pressure",     "bar",       10.0,   1.5),
        ("power",        "kW",        75.0,  10.0),
    ],
    "reactor": [
        ("temperature",  "°C",       280.0,  25.0),
        ("pressure",     "bar",       60.0,   6.0),
        ("power",        "kW",      1500.0, 100.0),
        ("output",       "units/hr",  80.0,   8.0),
    ],
    "compressor": [
        ("pressure",     "bar",       45.0,   4.0),
        ("power",        "kW",       800.0,  60.0),
    ],
    "exchanger": [
        ("temperature",  "°C",        90.0,  10.0),
        ("pressure",     "bar",        5.0,   0.5),
    ],
    "assembly": [
        ("power",        "kW",       350.0,  40.0),
        ("output",       "units/hr", 200.0,  20.0),
    ],
    "cnc": [
        ("temperature",  "°C",        65.0,   8.0),
        ("power",        "kW",       120.0,  15.0),
        ("output",       "units/hr",  30.0,   5.0),
    ],
    "finishing": [
        ("temperature",  "°C",        80.0,  10.0),
        ("power",        "kW",       200.0,  25.0),
        ("output",       "units/hr",  50.0,   8.0),
    ],
}


def _generate_value(base: float, amplitude: float, t: float) -> float:
    """
    Realistic-looking sensor value using a sine wave + noise.
    t is seconds since epoch — makes values slowly oscillate.
    """
    # Slow sine wave (period ~30 min) + fast noise
    slow_wave = amplitude * 0.6 * math.sin(t / 1800)
    noise     = amplitude * 0.4 * random.gauss(0, 1)
    return round(base + slow_wave + noise, 2)


def seed_history(db: Session) -> None:
    """
    Insert historical readings for the past SEED_HISTORY_HOURS.
    Called once at startup. Skips if data already exists.
    """
    from sqlalchemy import text
    existing = db.execute(text("SELECT COUNT(*) FROM sensor_readings")).scalar()
    if existing and existing > 0:
        logger.info("Historical data already present (%d rows) — skipping seed.", existing)
        return

    logger.info("Seeding %d hours of historical data…", settings.seed_history_hours)

    assets: list[Asset] = db.query(Asset).all()
    now    = datetime.now(timezone.utc)
    start  = now - timedelta(hours=settings.seed_history_hours)

    # One reading every 2 minutes = 30 per hour per asset/metric
    interval_seconds = 120
    rows = []

    for asset in assets:
        metrics = METRICS_BY_TYPE.get(asset.asset_type, [])
        t = start
        while t <= now:
            ts = t.timestamp()
            for metric_name, unit, base, amplitude in metrics:
                rows.append(SensorReading(
                    asset_id    = asset.id,
                    metric_name = metric_name,
                    value       = _generate_value(base, amplitude, ts),
                    unit        = unit,
                    recorded_at = t,
                ))
            t += timedelta(seconds=interval_seconds)

    db.bulk_save_objects(rows)
    db.commit()
    logger.info("Seeded %d historical readings.", len(rows))


def _insert_live_readings(db: Session) -> None:
    """Insert one fresh reading per asset per metric (simulates now)."""
    assets: list[Asset] = db.query(Asset).all()
    now = datetime.now(timezone.utc)
    ts  = now.timestamp()

    rows = []
    for asset in assets:
        metrics = METRICS_BY_TYPE.get(asset.asset_type, [])
        for metric_name, unit, base, amplitude in metrics:
            rows.append(SensorReading(
                asset_id    = asset.id,
                metric_name = metric_name,
                value       = _generate_value(base, amplitude, ts),
                unit        = unit,
                recorded_at = now,
            ))

    db.bulk_save_objects(rows)
    db.commit()
    logger.debug("Inserted %d live readings.", len(rows))


def start_live_seeder() -> None:
    """
    Starts a background thread that inserts new sensor readings
    every SEED_INTERVAL_SECONDS. This runs for the lifetime of
    the process.

    Why a thread and not asyncio?
    - SQLAlchemy sync sessions are not safe to use in async context.
    - A daemon thread is the simplest safe pattern here.
    - In production, replace with a dedicated time-series ingestion
      service (e.g. MQTT broker → Kafka → writer service).
    """
    def _loop():
        logger.info(
            "Live seeder started — inserting readings every %ds.",
            settings.seed_interval_seconds,
        )
        while True:
            try:
                db = SessionLocal()
                _insert_live_readings(db)
            except Exception as exc:
                logger.error("Seeder error: %s", exc)
            finally:
                db.close()
            time.sleep(settings.seed_interval_seconds)

    thread = threading.Thread(target=_loop, daemon=True, name="live-seeder")
    thread.start()