from fastapi import APIRouter
from app.config import get_settings

settings = get_settings()

router = APIRouter(
    prefix="/settings",
    tags=["settings"],
)


@router.get(f"/")
async def get_settings():
    return {
        "vessel_mmsi": settings.vessel_mmsi,
        "vessel_name": "MSC Magnifica",
        "cruise_start_date": "2026-01-05T12:45:11-05:00",
    }
