"""
schemas.py — Pydantic models for API request validation and response serialization.
"""

from datetime import datetime
from pydantic import BaseModel, ConfigDict


# ------------------------------------------------------------------
# Base config: from_attributes=True lets Pydantic read SQLAlchemy
# ORM objects directly (instead of requiring plain dicts).
# ------------------------------------------------------------------
class OrmBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ------------------------------------------------------------------
# ASSET schemas
# ------------------------------------------------------------------
class AssetBase(OrmBase):
    id:          int
    facility_id: int
    name:        str
    asset_type:  str
    description: str | None = None
    created_at:  datetime


class AssetList(OrmBase):
    id:         int
    name:       str
    asset_type: str
    description: str | None = None


# ------------------------------------------------------------------
# FACILITY schemas
# ------------------------------------------------------------------
class FacilityBase(OrmBase):
    id:         int
    name:       str
    location:   str | None = None
    timezone:   str
    created_at: datetime


class FacilityList(OrmBase):
    """Returned by GET /facilities — no nested assets (keeps payload small)."""
    id:       int
    name:     str
    location: str | None = None
    timezone: str


class FacilityDetail(OrmBase):
    """Returned by GET /facilities/{id} — includes full asset list."""
    id:         int
    name:       str
    location:   str | None = None
    timezone:   str
    created_at: datetime
    assets:     list[AssetList] = []


# ------------------------------------------------------------------
# SENSOR READING schemas
# ------------------------------------------------------------------
class SensorReadingOut(OrmBase):
    """Single reading row returned by GET /sensor-readings."""
    id:          int
    asset_id:    int
    metric_name: str
    value:       float
    unit:        str
    recorded_at: datetime


class SensorReadingsResponse(BaseModel):
    """
    Paginated wrapper around sensor readings.
    total lets the frontend know how many rows exist without
    fetching them all.
    """
    total:  int
    limit:  int
    offset: int
    data:   list[SensorReadingOut]


# ------------------------------------------------------------------
# SUMMARY / DASHBOARD schemas
# ------------------------------------------------------------------
class MetricSummary(BaseModel):
    """Latest value for one metric across all assets in a facility."""
    metric_name: str
    unit:        str
    total:       float        # sum across all assets (e.g. total kW)
    average:     float        # mean across all assets
    min:         float
    max:         float
    asset_count: int          # how many assets report this metric
    recorded_at: datetime     # timestamp of the most recent reading


class AssetLatestReading(BaseModel):
    """Latest reading for one asset+metric pair — used in asset table."""
    asset_id:    int
    asset_name:  str
    asset_type:  str
    metric_name: str
    value:       float
    unit:        str
    recorded_at: datetime


class FacilitySummary(BaseModel):
    """
    Returned by GET /facilities/{id}/summary.
    This is the primary payload for the dashboard KPI cards.
    """
    facility_id:   int
    facility_name: str
    as_of:         datetime           # when this snapshot was computed
    metrics:       list[MetricSummary]
    asset_readings: list[AssetLatestReading]  # per-asset latest values