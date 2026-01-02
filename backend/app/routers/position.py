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


@router.get(f"/")
async def get_latest_position_default_vessel(db: Session = Depends(get_db)):
    return await get_latest_position(settings.vessel_mmsi, db)


@router.get(f"/<mmsi>")
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
