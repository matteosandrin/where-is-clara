from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Position
from app.config import get_settings

settings = get_settings()

router = APIRouter(
    prefix="/position",
    tags=["position"],
)


@router.get(f"/latest")
async def get_latest_position_default_vessel(db: Session = Depends(get_db)):
    return await get_latest_position(settings.vessel_mmsi, db)


@router.get(f"/latest/<mmsi>")
async def get_latest_position(mmsi: str, db: Session = Depends(get_db)):
    position = (
        db.query(Position)
        .filter(Position.mmsi == mmsi)
        .order_by(Position.timestamp.desc())
        .first()
    )
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


@router.get(f"/range/<mmsi>")
async def get_positions_in_range(
    mmsi: str,
    from_ts: datetime | None = None,
    to_ts: datetime | None = None,
    db: Session = Depends(get_db),
):
    positions = (
        db.query(Position)
        .filter(Position.mmsi == mmsi)
        .filter(Position.timestamp >= from_ts if from_ts else True)
        .filter(Position.timestamp <= to_ts if to_ts else True)
        .order_by(Position.timestamp.desc())
        .all()
    )
    if not positions:
        raise HTTPException(status_code=404, detail="Positions not found")
    return positions
