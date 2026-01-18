from datetime import datetime
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.database import get_db
from app.models import Position
from app.config import get_settings
from app.services.position_cache_service import get_position_cache_service


POSITION_COLUMNS = [Position.id,Position.latitude, Position.longitude, Position.timestamp, Position.speed_over_ground, Position.course_over_ground]

settings = get_settings()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/position",
    tags=["position"],
)

position_cache_service = get_position_cache_service()


@router.get(f"/latest")
async def get_latest_position_default_vessel(db: Session = Depends(get_db)):
    return await get_latest_position(settings.vessel_mmsi, db)


@router.get("/latest/{mmsi}")
async def get_latest_position(mmsi: str, db: Session = Depends(get_db)):
    if mmsi == settings.vessel_mmsi:
        positions = position_cache_service.get_positions()
        if not positions:
            raise HTTPException(status_code=404, detail="Position not found")
        return positions[-1]
    stmt = (
        select(Position)
        .where(Position.mmsi == mmsi)
        .order_by(Position.timestamp.desc())
        .limit(1)
    )
    position = db.execute(stmt).scalars().first()
    if not position:
        raise HTTPException(status_code=404, detail="Position not found")
    return position


@router.get(f"/range")
async def get_positions_in_range_default_vessel(
    from_ts: datetime | None = None,
    to_ts: datetime | None = None,
    db: Session = Depends(get_db),
):
    return await get_positions_in_range(settings.vessel_mmsi, from_ts, to_ts, db)


@router.get("/range/{mmsi}")
async def get_positions_in_range(
    mmsi: str,
    from_ts: datetime | None = None,
    to_ts: datetime | None = None,
    db: Session = Depends(get_db),
):
    if mmsi == settings.vessel_mmsi:
        if to_ts is None and await position_cache_service.is_in_cache(from_ts):
            logger.info(f"Positions are in cache for {mmsi} from {from_ts}")
            positions = await position_cache_service.get_positions(from_ts)
            if not positions:
                raise HTTPException(status_code=404, detail="Positions not found")
            return positions
    logger.info(f"Bypassing cache for {mmsi} from {from_ts} to {to_ts}")
    stmt = (
        select(Position)
        .where(Position.mmsi == mmsi)
        .where(Position.timestamp >= from_ts if from_ts else True)
        .where(Position.timestamp <= to_ts if to_ts else True)
        .order_by(Position.timestamp.asc())
    )
    positions = db.execute(stmt).scalars().all()
    if not positions:
        raise HTTPException(status_code=404, detail="Positions not found")
    return positions
