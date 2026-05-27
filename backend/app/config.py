"""
config.py — Application settings loaded from environment variables.

Pydantic-settings automatically reads from:
  1. Environment variables
  2. A .env file in the working directory

"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql://postgres:postgres@localhost:5432/industrial_dashboard" 
    seed_interval_seconds: int = 30   # how often the background seeder inserts new readings
    seed_history_hours: int = 24      # how many hours of history to generate on startup

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
    )


settings = Settings()