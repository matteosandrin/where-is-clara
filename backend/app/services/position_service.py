import asyncio
import logging
import random
import struct
from datetime import datetime, timezone
from typing import Any

import requests
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import Position
from ..config import get_settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
settings = get_settings()

# VesselFinder API constants
VESSELFINDER_DOMAIN = "https://www.vesselfinder.com"
VESSELFINDER_SERVICE = "/api/pub"
COORD_FACTOR = 600000
XOR32 = 0x55555555
XOR16 = 0x5555

POLL_INTERVAL_SECONDS = 60 * 5


def _to_int32(x: int) -> int:
    """Interpret x (0..2^32-1) as signed 32-bit."""
    x &= 0xFFFFFFFF
    return x - 0x100000000 if x & 0x80000000 else x


def fetch_vessel_track(mmsi: str) -> list[dict[str, Any]]:
    """
    Fetch track data from VesselFinder API.

    Returns: list of dicts with keys:
        timestamp, longitude, latitude, course_over_ground, speed_over_ground
    """
    logger.info(f"Fetching track data for MMSI {mmsi}")
    url = f"{VESSELFINDER_DOMAIN}{VESSELFINDER_SERVICE}/track/{mmsi}"
    session = requests.Session()
    session.headers.update(
        {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/143.0.0.0 Safari/537.36"
        }
    )

    r = session.get(url)
    r.raise_for_status()

    data = r.content
    if len(data) < 16:
        return []

    # Ignore any trailing bytes if not a multiple of 16
    n = len(data) - (len(data) % 16)
    out: list[dict[str, Any]] = []

    # Record layout (big-endian):
    #   u32 ts
    #   i32 lon_enc
    #   i32 lat_enc
    #   u16 cog_enc
    #   u16 sog_enc
    for off in range(0, n, 16):
        ts, lon_enc, lat_enc, cog_enc, sog_enc = struct.unpack_from(">IiiHH", data, off)

        lon_x = _to_int32(lon_enc ^ XOR32)
        lat_x = _to_int32(lat_enc ^ XOR32)

        lon = lon_x / COORD_FACTOR
        lat = lat_x / COORD_FACTOR

        cog = (cog_enc ^ XOR16) / 10.0
        sog = (sog_enc ^ XOR16) / 10.0

        out.append(
            {
                "timestamp": datetime.fromtimestamp(ts, timezone.utc),
                "longitude": lon,
                "latitude": lat,
                "course_over_ground": cog,
                "speed_over_ground": sog,
            }
        )

    return out


class PositionService:
    """Service that polls VesselFinder API and stores new positions in DB."""

    def __init__(self, mmsi: str):
        self.mmsi = mmsi
        self._poll_task: asyncio.Task | None = None
        self._running = False

    async def start(self):
        if self._running:
            return
        self._running = True
        self._poll_task = asyncio.create_task(self._poll_loop())
        logger.info(f"PositionService started for MMSI {self.mmsi}")

    async def stop(self):
        self._running = False
        if self._poll_task:
            self._poll_task.cancel()
            try:
                await self._poll_task
            except asyncio.CancelledError:
                pass
        logger.info(f"PositionService stopped for MMSI {self.mmsi}")

    async def _poll_loop(self):
        while self._running:
            try:
                await self._poll_and_store()
            except Exception as e:
                logger.error(f"Error polling VesselFinder: {e}")

            await asyncio.sleep(POLL_INTERVAL_SECONDS + random.random() * 60)

    async def _poll_and_store(self):
        """Fetch track from VesselFinder and store new positions."""
        # Run the blocking HTTP request in a thread pool
        loop = asyncio.get_event_loop()
        track_points = await loop.run_in_executor(None, fetch_vessel_track, self.mmsi)

        if not track_points:
            logger.debug(f"No track points returned for MMSI {self.mmsi}")
            return

        # Get the last stored position timestamp from DB
        db: Session = SessionLocal()
        try:
            last_position = (
                db.query(Position)
                .filter(Position.mmsi == self.mmsi)
                .order_by(Position.timestamp.desc())
                .first()
            )
            last_timestamp = last_position.timestamp if last_position else None

            # Filter to only new positions (after the last stored one)
            new_points = [
                p
                for p in track_points
                if last_timestamp is None or p["timestamp"] > last_timestamp
            ]

            if not new_points:
                logger.debug(f"No new positions to store for MMSI {self.mmsi}")
                return

            new_points.sort(key=lambda p: p["timestamp"])

            for point in new_points:
                position = Position(
                    mmsi=self.mmsi,
                    latitude=point["latitude"],
                    longitude=point["longitude"],
                    timestamp=point["timestamp"],
                    speed_over_ground=point["speed_over_ground"],
                    course_over_ground=point["course_over_ground"],
                )
                db.add(position)

            db.commit()
            logger.info(
                f"Stored {len(new_points)} new position(s) for MMSI {self.mmsi}"
            )

        finally:
            db.close()


_position_service: PositionService | None = None


def get_position_service() -> PositionService:
    """Get the singleton PositionService instance."""
    global _position_service
    if _position_service is None:
        _position_service = PositionService(settings.vessel_mmsi)
    return _position_service
