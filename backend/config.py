"""
PRAVAAH 3.0 — Configuration
All settings are loaded from environment variables or .env file.
"""
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # ── App ────────────────────────────────────────────────────────────────
    APP_NAME: str = "PRAVAAH 3.0"
    DEBUG: bool = False
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # ── CORS (set to your Netlify URL in production) ───────────────────────
    CORS_ORIGINS: str = "*"

    # ── Live Data Sources ──────────────────────────────────────────────────
    # Primary: NTES (National Train Enquiry System) — no key needed
    NTES_BASE_URL: str = "https://enquiry.indianrail.gov.in/mntes"
    # Secondary: erail.in — no key needed
    ERAIL_BASE_URL: str = "https://erail.in"
    # Tertiary: RapidAPI Indian Railways (optional — set to use paid API)
    RAPIDAPI_KEY: Optional[str] = None
    RAPIDAPI_HOST: str = "indianrailways.p.rapidapi.com"

    # ── Weather (OpenWeatherMap free tier — 1000 calls/day) ────────────────
    # Get free key at: https://openweathermap.org/api
    OPENWEATHER_API_KEY: Optional[str] = None
    OPENWEATHER_BASE_URL: str = "https://api.openweathermap.org/data/2.5"

    # ── Model ──────────────────────────────────────────────────────────────
    MODEL_PATH: str = "model/artifacts/xgb_model.pkl"
    PIPELINE_PATH: str = "model/artifacts/feature_pipeline.pkl"
    TRAIN_DATA_PATH: str = "model/artifacts/training_data.parquet"
    N_TRAINING_SAMPLES: int = 500_000

    # ── Cache ──────────────────────────────────────────────────────────────
    CACHE_TTL_TRAIN_STATUS: int = 60       # seconds — live train positions
    CACHE_TTL_WEATHER: int = 1800          # 30 min — weather data
    CACHE_TTL_SCHEDULE: int = 86400        # 24 hr — train schedules

    # ── Refresh ────────────────────────────────────────────────────────────
    LIVE_REFRESH_INTERVAL: int = 60        # seconds between background refreshes
    REQUEST_TIMEOUT: int = 15             # HTTP timeout seconds
    REQUEST_MAX_RETRIES: int = 3

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
