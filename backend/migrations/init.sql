-- =============================================================
-- industrial_dashboard — database schema
-- This script runs automatically when the Postgres container
-- first starts (mounted at /docker-entrypoint-initdb.d/).
-- =============================================================

-- ----------------------------------------------------------------
-- 1. FACILITIES
--    A facility is a physical plant: power station, chemical plant,
--    manufacturing floor, etc.
-- ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS facilities (
    id          SERIAL PRIMARY KEY,
    name        TEXT        NOT NULL,
    location    TEXT,
    timezone    TEXT        NOT NULL DEFAULT 'UTC',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------
-- 2. ASSETS
--    An asset is a piece of equipment inside a facility.
--    e.g. "Turbine 1", "Boiler A", "Pump 3"
-- ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS assets (
    id          SERIAL PRIMARY KEY,
    facility_id INTEGER     NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    name        TEXT        NOT NULL,
    asset_type  TEXT        NOT NULL,   -- 'turbine' | 'boiler' | 'pump' | 'generator'
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for faster lookups of assets by facility
CREATE INDEX IF NOT EXISTS idx_assets_facility
    ON assets (facility_id);

-- ----------------------------------------------------------------
-- 3. SENSOR READINGS
--    EAV (Entity-Attribute-Value) design: one type of attribute per reading.
--
--    Why EAV?
--    - Industrial facilities add new sensor types over time.
--      A fixed-column schema would require ALTER TABLE migrations
--      every time a new metric appears.
--    - Readings are write-heavy (thousands per minute in real systems).
--      Narrow rows are faster to insert and index.
--
--    Trade-off:
--    - Querying multiple metrics at once requires a PIVOT or
--      multiple joins. Acceptable for a dashboard read pattern.
-- ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS sensor_readings (
    id          BIGSERIAL   PRIMARY KEY,
    asset_id    INTEGER     NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    metric_name TEXT        NOT NULL,   -- 'temperature' | 'pressure' | 'power' | 'output'
    value       DOUBLE PRECISION NOT NULL,
    unit        TEXT        NOT NULL,   -- '°C' | 'bar' | 'kW' | 'units/hr'
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------
-- INDEXES on sensor_readings
--
-- Every dashboard query filters by (asset_id, metric_name) and
-- orders/filters by recorded_at.  Use this index to optimize query speed 
-- and avoid full table scans.
-- ----------------------------------------------------------------
 
-- Primary query pattern: "give me readings for asset X, metric Y,
-- in the last 2 hours" — covers all dashboard and chart queries.
CREATE INDEX IF NOT EXISTS idx_readings_asset_metric_time
    ON sensor_readings (asset_id, metric_name, recorded_at DESC);
 
-- Used by the facility-level summary endpoint which joins across
-- all assets belonging to a facility.
CREATE INDEX IF NOT EXISTS idx_readings_recorded_at
    ON sensor_readings (recorded_at DESC);

-- ----------------------------------------------------------------
-- 4. SEED DATA — Facilities & Assets
--    Actual sensor readings are generated dynamically by the
--    backend seed process (see backend/app/seed.py), so that
--    the dashboard shows live-changing data.
-- ----------------------------------------------------------------

INSERT INTO facilities (name, location, timezone) VALUES
    ('Northgate Power Station',  'Manchester, UK',    'Europe/London'),
    ('Delta Chemical Plant',     'Houston, TX, USA',  'America/Chicago'),
    ('Sunrise Manufacturing',    'Osaka, Japan',      'Asia/Tokyo')
ON CONFLICT DO NOTHING;

-- Northgate Power Station assets
INSERT INTO assets (facility_id, name, asset_type, description) VALUES
    (1, 'Turbine 1',   'turbine',   'Primary steam turbine — 120 MW capacity'),
    (1, 'Turbine 2',   'turbine',   'Secondary steam turbine — 120 MW capacity'),
    (1, 'Boiler A',    'boiler',    'Main boiler unit — feeds Turbines 1 & 2'),
    (1, 'Cooling Pump','pump',      'Cooling water circulation pump')
ON CONFLICT DO NOTHING;

-- Delta Chemical Plant assets
INSERT INTO assets (facility_id, name, asset_type, description) VALUES
    (2, 'Reactor R-1',  'reactor',   'Primary chemical reactor'),
    (2, 'Reactor R-2',  'reactor',   'Secondary chemical reactor'),
    (2, 'Compressor C1','compressor','Feed gas compressor'),
    (2, 'Heat Exchanger','exchanger','Product cooling heat exchanger')
ON CONFLICT DO NOTHING;

-- Sunrise Manufacturing assets
INSERT INTO assets (facility_id, name, asset_type, description) VALUES
    (3, 'Assembly Line 1', 'assembly', 'Main product assembly line'),
    (3, 'Assembly Line 2', 'assembly', 'Secondary assembly line'),
    (3, 'CNC Machine 1',   'cnc',      'High-precision CNC machining unit'),
    (3, 'Paint Station',   'finishing','Automated paint & finishing station')
ON CONFLICT DO NOTHING;