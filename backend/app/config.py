from pathlib import Path
from pydantic_settings import BaseSettings
from functools import lru_cache

_THIS_DIR = Path(__file__).resolve().parent
_ENV_FILE = _THIS_DIR.parent / ".env"


class Settings(BaseSettings):
    database_url: str  # required
    vessel_mmsi: str  # required
    aisstream_api_key: str  # required
    aisstream_url: str = "wss://stream.aisstream.io/v0/stream"
    debug: bool = True

    class Config:
        env_file = _ENV_FILE
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
