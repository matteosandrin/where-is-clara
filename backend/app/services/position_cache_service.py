import asyncio
from datetime import datetime, timezone, timedelta
import logging

from sqlalchemy.orm import Session
from app.config import get_settings
from app.database import SessionLocal
from app.models import Position

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

settings = get_settings()
CACHE_DURATION_HOURS = 48
MMSI = settings.vessel_mmsi


class PositionCacheService:
    def __init__(self):
        self._cache: list[Position] = []
        self._cache_lock = asyncio.Lock()
        asyncio.create_task(self.refresh_cache())

    async def refresh_cache(self):
        cutoff = datetime.now(timezone.utc) - timedelta(hours=CACHE_DURATION_HOURS)

        def _load_from_db():
            db: Session = SessionLocal()
            try:
                positions = (
                    db.query(Position)
                    .filter(Position.mmsi == MMSI)
                    .filter(Position.timestamp >= cutoff)
                    .order_by(Position.timestamp.asc())
                    .all()
                )
                # Detach from session so they can be used outside
                for p in positions:
                    db.expunge(p)
                return positions
            finally:
                db.close()

        loop = asyncio.get_event_loop()
        async with self._cache_lock:
            self._cache = await loop.run_in_executor(None, _load_from_db)
        logger.info(f"Cache refreshed with {len(self._cache)} positions")

    async def is_in_cache(self, from_ts: datetime | None = None) -> bool:
        if from_ts is None:
            return False
        async with self._cache_lock:
            if len(self._cache) == 0:
                return False
            # cache[0] = oldest, cache[-1] = newest (sorted asc by timestamp)
            return self._cache[0].timestamp <= from_ts

    async def get_positions(self, from_ts: datetime | None = None) -> list[Position]:
        async with self._cache_lock:
            return [
                p for p in self._cache if (from_ts is None or p.timestamp >= from_ts)
            ]


_position_cache_service: PositionCacheService | None = None


def get_position_cache_service() -> PositionCacheService:
    """Get the singleton PositionCacheService instance."""
    global _position_cache_service
    if _position_cache_service is None:
        _position_cache_service = PositionCacheService()
    return _position_cache_service
