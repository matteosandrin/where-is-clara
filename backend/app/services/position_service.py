import asyncio
from datetime import datetime, timezone
from sqlalchemy.orm import Session
import websockets
import json

from app.database import SessionLocal
from app.models import NavigationStatus, Position
from ..config import get_settings


settings = get_settings()

INITIAL_RECONNECT_DELAY = 1.0
MAX_RECONNECT_DELAY = 60.0
RECONNECT_BACKOFF_FACTOR = 2.0
CONNECTION_TIMEOUT = 60.0


class AISStreamService:
    def __init__(self, mmsi: str):
        self.websocket = None
        self.mmsi = mmsi
        self._receive_task: asyncio.Task | None = None
        self._running = False
        self._reconnect_delay = INITIAL_RECONNECT_DELAY

    async def start(self):
        if self._running:
            return
        self._running = True
        self._receive_task = asyncio.create_task(self._run())
        print(f"[AISStreamService] AIS stream started for MMSI {self.mmsi}")

    async def stop(self):
        self._running = False
        if self.websocket:
            await self.websocket.close()
        if self._receive_task:
            self._receive_task.cancel()
            try:
                await self._receive_task
            except asyncio.CancelledError:
                pass
        print(f"[AISStreamService] AIS stream stopped for MMSI {self.mmsi}")

    async def _run(self):
        """Main loop that handles connection and reconnection."""
        while self._running:
            try:
                await self._connect()
                self._reconnect_delay = (
                    INITIAL_RECONNECT_DELAY  # Reset on successful connection
                )
                await self._receive()
            except websockets.ConnectionClosed as e:
                print(
                    f"[AISStreamService] Connection closed: {e}. Reconnecting in {self._reconnect_delay}s..."
                )
            except websockets.WebSocketException as e:
                print(
                    f"[AISStreamService] WebSocket error: {e}. Reconnecting in {self._reconnect_delay}s..."
                )
            except Exception as e:
                print(
                    f"[AISStreamService] Unexpected error: {e}. Reconnecting in {self._reconnect_delay}s..."
                )

            if self._running:
                await asyncio.sleep(self._reconnect_delay)
                self._reconnect_delay = min(
                    self._reconnect_delay * RECONNECT_BACKOFF_FACTOR,
                    MAX_RECONNECT_DELAY,
                )

    async def _connect(self):
        print(f"[AISStreamService] Connecting to AIS stream...")
        self.websocket = await websockets.connect(settings.aisstream_url)
        subscribe_message = {
            "APIKey": settings.aisstream_api_key,
            "BoundingBoxes": [[[-90, -180], [90, 180]]],
            "FiltersShipMMSI": [self.mmsi],
        }
        await self.websocket.send(json.dumps(subscribe_message))
        print(f"[AISStreamService] Connected and subscribed for MMSI {self.mmsi}")

    async def _receive(self):
        while True:
            try:
                message_json = await asyncio.wait_for(
                    self.websocket.recv(), timeout=CONNECTION_TIMEOUT
                )
            except asyncio.TimeoutError:
                print(
                    f"[AISStreamService] No message received in {CONNECTION_TIMEOUT}s, reconnecting..."
                )
                await self.websocket.close()
                return
            print(f"[AISStreamService] Received message: {message_json}")
            message = json.loads(message_json)
            message_type = message["MessageType"]
            if message_type == "PositionReport":
                self._store_position(message)

    def _store_position(self, message: dict):
        db: Session = SessionLocal()
        report = message["Message"]["PositionReport"]
        metadata = message["MetaData"]
        position = Position(
            mmsi=metadata["MMSI"],
            latitude=report["Latitude"],
            longitude=report["Longitude"],
            timestamp=self._parse_timestamp(metadata["time_utc"]),
            navigation_status=NavigationStatus(report["NavigationalStatus"]),
            speed_over_ground=report["Sog"],
            course_over_ground=report["Cog"],
            heading=report["TrueHeading"],
        )
        db.add(position)
        db.commit()
        db.refresh(position)
        return position

    def _parse_timestamp(self, datetime_str: int):
        datetime_str = datetime_str[:19]
        return datetime.strptime(datetime_str, "%Y-%m-%d %H:%M:%S").replace(
            tzinfo=timezone.utc
        )


_aisstream_service: AISStreamService | None = None


def get_aisstream_service():
    global _aisstream_service
    if _aisstream_service is None:
        _aisstream_service = AISStreamService(settings.vessel_mmsi)
    return _aisstream_service
