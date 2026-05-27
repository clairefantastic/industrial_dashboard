# Industrial Dashboard

A real-time plant monitoring dashboard for industrial facilities — power stations, chemical plants, and manufacturing floors.

Built with **FastAPI · PostgreSQL · React · Ant Design · Recharts**.

---

## Quick Start

**Prerequisites:** Docker and Docker Compose installed.

```bash
git clone https://github.com/YOUR_USERNAME/industrial_dashboard.git
cd industrial_dashboard
docker compose up --build
```

Then open:

| Service  | URL                          |
|----------|------------------------------|
| Dashboard | http://localhost:5173        |
| API docs  | http://localhost:8000/docs   |
| API health| http://localhost:8000/health |

On first startup the backend automatically seeds **24 hours of historical data** and begins inserting live readings every 30 seconds. The dashboard auto-refreshes every 30 seconds without a page reload.

---

## Running Without Docker

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Start a local Postgres instance first, then:
cp .env.example .env             # edit DATABASE_URL if needed
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

> If running without Docker, update `VITE_API_URL` in `frontend/.env`:
> ```
> VITE_API_URL=http://localhost:8000
> ```

---

## Project Structure

```
industrial_dashboard/
├── docker-compose.yml
├── backend/
│   ├── migrations/
│   │   └── init.sql          # schema — runs automatically on first DB start
│   ├── app/
│   │   ├── main.py           # FastAPI app, CORS, lifespan
│   │   ├── config.py         # environment variables (pydantic-settings)
│   │   ├── database.py       # SQLAlchemy engine + session
│   │   ├── models.py         # ORM models
│   │   ├── schemas.py        # Pydantic request/response types
│   │   ├── seed.py           # historical + live data generator
│   │   └── routers/
│   │       ├── facilities.py # GET /facilities, /{id}, /{id}/summary
│   │       └── readings.py   # GET /sensor-readings
│   └── requirements.txt
└── frontend/
    └── src/
        ├── api/client.ts         # Axios instance + TypeScript types
        ├── hooks/
        │   ├── useFacility.ts    # React Query hooks for facility data
        │   └── useReadings.ts    # React Query hook for time-series data
        └── components/
            ├── KPIGrid.tsx        # 4 metric KPI cards
            ├── TimeSeriesChart.tsx# Recharts line chart with time range selector
            └── AssetTable.tsx     # Per-asset latest readings table
```

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/facilities/` | List all facilities |
| GET | `/facilities/{id}` | Facility detail + assets |
| GET | `/facilities/{id}/summary` | Current KPI snapshot (dashboard primary endpoint) |
| GET | `/sensor-readings/` | Filtered, paginated sensor readings |
| GET | `/health` | Health check |

### Sensor Readings Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `facility_id` | int | Filter by facility |
| `asset_id` | int | Filter by asset |
| `metric_name` | string | `temperature` \| `pressure` \| `power` \| `output` |
| `from_time` | ISO 8601 | Start of time range (default: 2 hours ago) |
| `to_time` | ISO 8601 | End of time range (default: now) |
| `limit` | int | Max rows, 1–2000 (default: 500) |
| `offset` | int | Pagination offset |

Full interactive docs available at **http://localhost:8000/docs**.

---

## Sample Data

Three pre-seeded facilities:

| Facility | Location | Assets |
|----------|----------|--------|
| Northgate Power Station | Manchester, UK | Turbine 1, Turbine 2, Boiler A, Cooling Pump |
| Delta Chemical Plant | Houston, TX | Reactor R-1, Reactor R-2, Compressor C1, Heat Exchanger |
| Sunrise Manufacturing | Osaka, Japan | Assembly Line 1, Assembly Line 2, CNC Machine 1, Paint Station |

Metrics reported per asset type:

| Asset Type | Metrics |
|------------|---------|
| turbine | temperature, pressure, power, output |
| boiler | temperature, pressure, power |
| pump | pressure, power |
| reactor | temperature, pressure, power, output |
| assembly | power, output |
| cnc | temperature, power, output |

---

## Known Limitations & Production Improvements

| Area | Current | Production path |
|------|---------|-----------------|
| Real-time updates | 30s polling | WebSockets or SSE |
| Time-series storage | PostgreSQL + indexes | TimescaleDB hypertables |
| Auth | None | JWT + role-based access |
| DB sessions | Synchronous SQLAlchemy | asyncpg for high concurrency |
| CORS | Allow all origins | Restrict to frontend domain |
| Data retention | Unlimited growth | Rolling window + archival policy |