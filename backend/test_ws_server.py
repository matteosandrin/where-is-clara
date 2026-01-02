#!/usr/bin/env python3
"""
Test WebSocket server that mimics the AISStream service.
Run this locally to test the AISStreamService without connecting to the real API.

Usage:
    python test_ws_server.py

Then update your code to connect to ws://localhost:8765 instead of the real endpoint.
"""

import asyncio
import json
import random
from datetime import datetime, timezone
import websockets


# Base position data (from ws_example.json)
BASE_LATITUDE = 41.25713
BASE_LONGITUDE = 2.9844166666666667
BASE_COG = 89.3
BASE_SOG = 12.9
BASE_HEADING = 86
MMSI = 352594000
SHIP_NAME = "MSC MAGNIFICA"

# How often to send position updates (seconds)
UPDATE_INTERVAL = 5.0


def generate_position_message() -> dict:
    """Generate a position report with slightly varied data."""
    # Vary position slightly (simulate movement)
    latitude = BASE_LATITUDE + random.uniform(-0.01, 0.01)
    longitude = BASE_LONGITUDE + random.uniform(-0.01, 0.01)

    # Vary speed and course
    cog = (BASE_COG + random.uniform(-5, 5)) % 360
    sog = max(0, BASE_SOG + random.uniform(-2, 2))
    heading = int((BASE_HEADING + random.uniform(-3, 3)) % 360)

    # Vary other fields
    rate_of_turn = random.randint(-10, 10)
    nav_status = random.choice([0, 0, 0, 0, 1, 5])  # Mostly "underway using engine"
    timestamp_seconds = random.randint(0, 59)

    now = datetime.now(timezone.utc)
    time_utc = (
        now.strftime("%Y-%m-%d %H:%M:%S.") + f"{now.microsecond:06d}000 +0000 UTC"
    )

    return {
        "Message": {
            "PositionReport": {
                "Cog": round(cog, 1),
                "CommunicationState": random.randint(100000, 200000),
                "Latitude": latitude,
                "Longitude": longitude,
                "MessageID": random.choice([1, 2, 3]),
                "NavigationalStatus": nav_status,
                "PositionAccuracy": random.choice([True, False]),
                "Raim": random.choice([True, False]),
                "RateOfTurn": rate_of_turn,
                "RepeatIndicator": 0,
                "Sog": round(sog, 1),
                "Spare": random.randint(0, 3),
                "SpecialManoeuvreIndicator": 0,
                "Timestamp": timestamp_seconds,
                "TrueHeading": heading,
                "UserID": MMSI,
                "Valid": True,
            }
        },
        "MessageType": "PositionReport",
        "MetaData": {
            "MMSI": MMSI,
            "MMSI_String": MMSI,
            "ShipName": SHIP_NAME,
            "latitude": latitude,
            "longitude": longitude,
            "time_utc": time_utc,
        },
    }


async def handle_client(websocket):
    """Handle a single WebSocket client connection."""
    client_addr = websocket.remote_address
    print(f"[TestWSServer] Client connected from {client_addr}")

    try:
        # Wait for subscription message
        subscription_raw = await websocket.recv()
        subscription = json.loads(subscription_raw)
        print(
            f"[TestWSServer] Received subscription: {json.dumps(subscription, indent=2)}"
        )

        # Extract MMSI filter if provided
        mmsi_filter = subscription.get("FiltersShipMMSI", [])
        print(f"[TestWSServer] MMSI filter: {mmsi_filter}")

        # Send position updates periodically
        message_count = 0
        while True:
            message = generate_position_message()
            message_json = json.dumps(message)
            await websocket.send(message_json)
            message_count += 1
            print(
                f"[TestWSServer] Sent message #{message_count}: lat={message['MetaData']['latitude']:.5f}, lon={message['MetaData']['longitude']:.5f}, sog={message['Message']['PositionReport']['Sog']}"
            )

            await asyncio.sleep(UPDATE_INTERVAL)

    except websockets.ConnectionClosed:
        print(f"[TestWSServer] Client {client_addr} disconnected")
    except Exception as e:
        print(f"[TestWSServer] Error handling client {client_addr}: {e}")


async def main():
    host = "localhost"
    port = 8765

    print(f"[TestWSServer] Starting test WebSocket server on ws://{host}:{port}")
    print(f"[TestWSServer] Position updates every {UPDATE_INTERVAL} seconds")
    print(f"[TestWSServer] Press Ctrl+C to stop\n")

    async with websockets.serve(handle_client, host, port):
        await asyncio.Future()  # Run forever


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n[TestWSServer] Shutting down...")
