"""
models.py — SQLAlchemy ORM models.

These Python classes map 1:1 to the database tables defined in
migrations/init.sql. SQLAlchemy uses them to build queries and
serialize results.
"""

from datetime import datetime
from sqlalchemy import (
    BigInteger, Double, ForeignKey, Integer,
    String, Text, DateTime, func
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Facility(Base):
    __tablename__ = "facilities"

    id:         Mapped[int]      = mapped_column(Integer, primary_key=True)
    name:       Mapped[str]      = mapped_column(Text, nullable=False)
    location:   Mapped[str]      = mapped_column(Text, nullable=True)
    timezone:   Mapped[str]      = mapped_column(Text, nullable=False, default="UTC")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # One facility → many assets
    assets: Mapped[list["Asset"]] = relationship("Asset", back_populates="facility")


class Asset(Base):
    __tablename__ = "assets"

    id:          Mapped[int]      = mapped_column(Integer, primary_key=True)
    facility_id: Mapped[int]      = mapped_column(Integer, ForeignKey("facilities.id"), nullable=False)
    name:        Mapped[str]      = mapped_column(Text, nullable=False)
    asset_type:  Mapped[str]      = mapped_column(Text, nullable=False)
    description: Mapped[str]      = mapped_column(Text, nullable=True)
    created_at:  Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    facility:  Mapped["Facility"]        = relationship("Facility", back_populates="assets")
    readings:  Mapped[list["SensorReading"]] = relationship("SensorReading", back_populates="asset")


class SensorReading(Base):
    __tablename__ = "sensor_readings"

    id:          Mapped[int]      = mapped_column(BigInteger, primary_key=True)
    asset_id:    Mapped[int]      = mapped_column(Integer, ForeignKey("assets.id"), nullable=False)
    metric_name: Mapped[str]      = mapped_column(Text, nullable=False)
    value:       Mapped[float]    = mapped_column(Double, nullable=False)
    unit:        Mapped[str]      = mapped_column(Text, nullable=False)
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationship
    asset: Mapped["Asset"] = relationship("Asset", back_populates="readings")