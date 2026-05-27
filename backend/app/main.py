"""
main.py — FastAPI application entry point.

Responsibilities:
- Create the FastAPI app instance
- Register routers
- Configure CORS (Cross-Origin Resource Sharing)
- Start the background seeder on startup via lifespan context
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import SessionLocal
from app.routers import facilities, readings
from app.seed import seed_history, start_live_seeder

# ------------------------------------------------------------------
# Logging
# ------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


# ------------------------------------------------------------------
# Lifespan — runs startup/shutdown logic around the app.
#
# Why lifespan instead of @app.on_event("startup")?
# on_event is deprecated in FastAPI 0.93+. Lifespan is the modern
# pattern and is cleaner because startup and shutdown live together.
# ------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- STARTUP ---
    logger.info("Starting Industrial Dashboard API…")

    # Seed historical data (skips if data already exists)
    db = SessionLocal()
    try:
        seed_history(db)
    finally:
        db.close()

    # Start background live-data generator
    start_live_seeder()

    logger.info("API ready.")
    yield
    # --- SHUTDOWN ---
    logger.info("Shutting down…")


# ------------------------------------------------------------------
# App instance
# ------------------------------------------------------------------
app = FastAPI(
    title       = "Industrial Dashboard API",
    description = "REST API for plant monitoring — facilities, assets, and sensor readings.",
    version     = "1.0.0",
    lifespan    = lifespan,
)


# ------------------------------------------------------------------
# CORS
#
# Why do we need this?
# The React frontend (localhost:5173) makes requests to the FastAPI
# backend (localhost:8000). Browsers block cross-origin requests by
# default. CORS middleware adds the necessary headers to allow this.
#
# allow_origins=["*"] is fine for development. In production,
# replace with the specific frontend domain.
# ------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins     = ["*"],
    allow_credentials = True,
    allow_methods     = ["*"],
    allow_headers     = ["*"],
)


# ------------------------------------------------------------------
# Routers
# ------------------------------------------------------------------
app.include_router(facilities.router)
app.include_router(readings.router)


# ------------------------------------------------------------------
# Health check — used by Docker healthcheck and load balancers
# ------------------------------------------------------------------
@app.get("/health", tags=["meta"])
def health():
    return {"status": "ok"}


# ------------------------------------------------------------------
# Root — friendly message so hitting / isn't confusing
# ------------------------------------------------------------------
@app.get("/", tags=["meta"])
def root():
    return {
        "message": "Industrial Dashboard API",
        "docs":    "/docs",
        "health":  "/health",
    }