import enum
from sqlalchemy import Column, Integer, String, Float, DateTime, Enum, func
from ..database import Base


class NavigationStatus(enum.Enum):
    UNDERWAY_USING_ENGINE = 0
    AT_ANCHOR = 1
    NOT_UNDER_COMMAND = 2
    RESTRICTED_MANEUVERABILITY = 3
    CONSTRAINED_BY_HER_DRAUGHT = 4
    MOORED = 5
    AGROUND = 6
    ENGAGED_IN_FISHING = 7
    UNDER_WAY_SAILING = 8
    RESERVED_1 = 9
    RESERVED_2 = 10
    POWER_DRIVEN_VESSEL_TOWING_ASTERN = 11
    POWER_DRIVEN_VESSEL_PUSHING_AHEAD = 12
    RESERVED_3 = 13
    AIS_SART = 14
    UNDEFINED = 15


class Position(Base):
    __tablename__ = "positions"

    id = Column(Integer, primary_key=True)
    mmsi = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    timestamp = Column(DateTime(timezone=True), nullable=False)  # in UTC
    navigation_status = Column(
        Enum(NavigationStatus), nullable=False, default=NavigationStatus.UNDEFINED
    )
    speed_over_ground = Column(Float, nullable=False)  # in knots
    course_over_ground = Column(Float, nullable=False)  # in degrees
    heading = Column(Float, nullable=False)
    created_at = Column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
