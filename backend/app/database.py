"""
database.py — SQLAlchemy engine, session factory, and Base.
 
- Synchronous SQLAlchemy for simplicity. In production
  with high concurrency, switch to asyncpg + SQLAlchemy async.
- Connection pool size 5 + 10 overflow: appropriate for a single
  FastAPI worker. Scale with workers in production.
- get_db() yields a session per request and always closes it,
  preventing connection leaks.
"""
 
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.config import settings
 
engine = create_engine(
    settings.database_url,
    pool_size=5,
    max_overflow=10,
    pool_pre_ping=True,   # reconnect silently after DB restart
    echo=False,           # set True to log all SQL (useful for debugging)
)
 
SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
)
 
class Base(DeclarativeBase):
    pass
 
 
def get_db():
    """FastAPI dependency — yields a DB session, always closes it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()