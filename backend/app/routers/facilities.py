"""
routers/facilities.py

Endpoints:
  GET /facilities              → list all facilities
  GET /facilities/{id}         → facility detail + its assets
  GET /facilities/{id}/summary → KPI snapshot for dashboard
"""

from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import Asset, Facility, SensorReading
from app.schemas import (
    AssetLatestReading,
    FacilityDetail,
    FacilityList,
    FacilitySummary,
    MetricSummary,
)

router = APIRouter(prefix="/facilities", tags=["facilities"])


# ------------------------------------------------------------------
# GET /facilities
# ------------------------------------------------------------------
@router.get("/", response_model=list[FacilityList])
def list_facilities(db: Session = Depends(get_db)):
    """
    Returns all facilities with basic info without nested assets.
    Used to populate the facility selector dropdown in the UI.
    """
    return db.query(Facility).order_by(Facility.id).all()


# ------------------------------------------------------------------
# GET /facilities/{facility_id}
# ------------------------------------------------------------------
@router.get("/{facility_id}", response_model=FacilityDetail)
def get_facility(facility_id: int, db: Session = Depends(get_db)):
    """
    Returns a single facility with its full asset list.

    joinedload: tells SQLAlchemy to fetch assets in the same query
    (JOIN) instead of a separate SELECT. This avoids the N+1 query problem.
    """
    facility = (
        db.query(Facility)
        .options(joinedload(Facility.assets))
        .filter(Facility.id == facility_id)
        .first()
    )
    if not facility:
        raise HTTPException(status_code=404, detail="Facility not found")
    return facility


# ------------------------------------------------------------------
# GET /facilities/{facility_id}/summary
# ------------------------------------------------------------------
@router.get("/{facility_id}/summary", response_model=FacilitySummary)
def get_facility_summary(facility_id: int, db: Session = Depends(get_db)):
    """
    Returns the current KPI snapshot for a facility:
    - Latest value per asset per metric
    - Aggregated totals/averages per metric across all assets

    This is the primary endpoint for the dashboard KPI cards.

    Query strategy:
    Uses DISTINCT ON (PostgreSQL-specific) to get the latest
    reading per (asset_id, metric_name) in a single query.
    This is more efficient than a subquery or window function
    for this access pattern.
    """
    # 1. Verify facility exists
    facility = db.query(Facility).filter(Facility.id == facility_id).first()
    if not facility:
        raise HTTPException(status_code=404, detail="Facility not found")

    # 2. Get all asset IDs belonging to this facility
    assets: list[Asset] = (
        db.query(Asset)
        .filter(Asset.facility_id == facility_id)
        .all()
    )
    if not assets:
        return FacilitySummary(
            facility_id=facility_id,
            facility_name=facility.name,
            as_of=datetime.now(timezone.utc),
            metrics=[],
            asset_readings=[],
        )

    asset_ids = [a.id for a in assets]
    asset_map  = {a.id: a for a in assets}

    # 3. DISTINCT ON query — latest reading per (asset_id, metric_name)
    # DISTINCT ON is PostgreSQL-specific and not natively supported
    # by SQLAlchemy's ORM layer without verbose workarounds.
    # Raw SQL is clearer and easier to maintain for this pattern.
    sql = text("""
        SELECT DISTINCT ON (asset_id, metric_name)
            id, asset_id, metric_name, value, unit, recorded_at
        FROM sensor_readings
        WHERE asset_id = ANY(:asset_ids)
        ORDER BY asset_id, metric_name, recorded_at DESC
    """)

    rows = db.execute(sql, {"asset_ids": asset_ids}).fetchall()

    # 4. Build per-asset readings list
    asset_readings: list[AssetLatestReading] = []
    for row in rows:
        asset = asset_map[row.asset_id]
        asset_readings.append(AssetLatestReading(
            asset_id    = row.asset_id,
            asset_name  = asset.name,
            asset_type  = asset.asset_type,
            metric_name = row.metric_name,
            value       = row.value,
            unit        = row.unit,
            recorded_at = row.recorded_at,
        ))

    # 5. Aggregate per metric across all assets
    #    Group readings by metric_name, then compute stats
    from collections import defaultdict
    metric_groups: dict[str, list[Any]] = defaultdict(list)
    for row in rows:
        metric_groups[row.metric_name].append(row)

    metrics: list[MetricSummary] = []
    for metric_name, metric_rows in metric_groups.items():
        values = [r.value for r in metric_rows]
        latest_ts = max(r.recorded_at for r in metric_rows)
        unit = metric_rows[0].unit

        metrics.append(MetricSummary(
            metric_name  = metric_name,
            unit         = unit,
            total        = round(sum(values), 2),
            average      = round(sum(values) / len(values), 2),
            min          = round(min(values), 2),
            max          = round(max(values), 2),
            asset_count  = len(values),
            recorded_at  = latest_ts,
        ))

    # Sort metrics consistently: power, output, temperature, pressure
    order = {"power": 0, "output": 1, "temperature": 2, "pressure": 3}
    metrics.sort(key=lambda m: order.get(m.metric_name, 99))

    return FacilitySummary(
        facility_id    = facility_id,
        facility_name  = facility.name,
        as_of          = datetime.now(timezone.utc),
        metrics        = metrics,
        asset_readings = asset_readings,
    )