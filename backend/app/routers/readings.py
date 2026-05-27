"""
routers/readings.py

Endpoints:
  GET /sensor-readings   → filtered, paginated sensor readings
                           Used by the time-series chart.

Query parameters:
  facility_id   int       filter by facility (joins through assets)
  asset_id      int       filter by specific asset
  metric_name   str       filter by metric ('temperature', 'power', etc.)
  from_time     datetime  start of time range (ISO 8601)
  to_time       datetime  end of time range (ISO 8601)
  limit         int       max rows returned (default 500, max 2000)
  offset        int       pagination offset (default 0)
"""

from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Asset, SensorReading
from app.schemas import SensorReadingsResponse, SensorReadingOut

router = APIRouter(prefix="/sensor-readings", tags=["sensor-readings"])


@router.get("/", response_model=SensorReadingsResponse)
def get_sensor_readings(
    # --- filters ---
    facility_id:  int | None = Query(None, description="Filter by facility"),
    asset_id:     int | None = Query(None, description="Filter by asset"),
    metric_name:  str | None = Query(None, description="e.g. temperature, pressure, power, output"),

    # --- time range (defaults to last 2 hours) ---
    from_time: datetime | None = Query(
        None,
        description="Start of time range (ISO 8601). Defaults to 2 hours ago."
    ),
    to_time: datetime | None = Query(
        None,
        description="End of time range (ISO 8601). Defaults to now."
    ),

    # --- pagination ---
    limit:  int = Query(500,  ge=1, le=2000, description="Max rows (1–2000)"),
    offset: int = Query(0,    ge=0,          description="Pagination offset"),

    db: Session = Depends(get_db),
):
    """
    Returns sensor readings with optional filtering.

    - Default time window is 2 hours.
    - Hard cap at 2000 rows to prevent accidentally dumping millions of
      time-series rows to the client.
    - facility_id filter works by joining through the assets table —
      sensor_readings doesn't store facility_id directly (normalized schema).
    - Ordered by recorded_at ASC so chart data is already in time order.
    """

    # Default time range: last 2 hours
    now = datetime.now(timezone.utc)
    if to_time is None:
        to_time = now
    if from_time is None:
        from_time = now - timedelta(hours=2)

    # Validate range
    if from_time >= to_time:
        raise HTTPException(
            status_code=400,
            detail="from_time must be earlier than to_time"
        )

    # Build query
    query = db.query(SensorReading)

    # facility_id requires a join through assets
    if facility_id is not None:
        query = (
            query
            .join(Asset, SensorReading.asset_id == Asset.id)
            .filter(Asset.facility_id == facility_id)
        )

    if asset_id is not None:
        query = query.filter(SensorReading.asset_id == asset_id)

    if metric_name is not None:
        query = query.filter(SensorReading.metric_name == metric_name)

    query = query.filter(
        SensorReading.recorded_at >= from_time,
        SensorReading.recorded_at <= to_time,
    )

    # Count total before pagination (for the response envelope)
    total = query.count()

    # Apply ordering + pagination
    readings = (
        query
        .order_by(SensorReading.recorded_at.asc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return SensorReadingsResponse(
        total  = total,
        limit  = limit,
        offset = offset,
        data   = readings,
    )