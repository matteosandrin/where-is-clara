import enum
from sqlalchemy import Column, Integer, String, Float, DateTime, Enum, func
from ..database import Base


class Position(Base):
    __tablename__ = "positions"

    id = Column(Integer, primary_key=True)
    mmsi = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    timestamp = Column(DateTime(timezone=True), nullable=False)  # in UTC
    speed_over_ground = Column(Float, nullable=False)  # in knots
    course_over_ground = Column(Float, nullable=False)  # in degrees
    created_at = Column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
