import distance from "@turf/distance";
import nearestPointOnLine from "@turf/nearest-point-on-line";
import lineSlice from "@turf/line-slice";
import along from "@turf/along";
import length from "@turf/length";
import type { LineString, Feature, Point } from "geojson";
import type { Port, Position } from "../types/types";

export interface PredictedPath {
  path: Feature<LineString>;
  endPosition: Position;
}

// Create an arrow icon as a data URL
export function createArrowIcon(
  fillColor: string,
  strokeColor: string | null,
): HTMLImageElement {
  const size = 48;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  // Draw arrow pointing up (0 degrees = north)
  ctx.fillStyle = fillColor;
  if (strokeColor) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1;
  }

  ctx.beginPath();
  ctx.moveTo(size / 2, 4); // Top point
  ctx.lineTo(size - 10, size - 6); // Bottom right
  ctx.lineTo(size / 2, size - 16); // Bottom center notch
  ctx.lineTo(10, size - 6); // Bottom left
  ctx.closePath();

  ctx.fill();
  if (strokeColor) {
    ctx.stroke();
  }

  const img = new Image(size, size);
  img.src = canvas.toDataURL();
  return img;
}

export function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

export function getNextPort(
  ports: Port[],
  currentPosition: Position,
): Port | null {
  const nextPorts = ports.filter((port) => {
    const dep = new Date(port.dep_datetime);
    const current = new Date(currentPosition.timestamp);
    return dep.getTime() > current.getTime();
  });
  if (!nextPorts.length) {
    return null;
  }
  return nextPorts[0];
}

export function getClosestPort(
  ports: Port[],
  currentPosition: Position,
): Port | null {
  const closestPort = ports
    .map((port) => {
      return {
        ...port,
        distance: distance(
          [currentPosition.longitude, currentPosition.latitude],
          [port.lon, port.lat],
          { units: "meters" },
        ),
      };
    })
    .sort((a, b) => a.distance - b.distance)[0];
  return closestPort;
}

export function isInPort(ports: Port[], currentPosition: Position): boolean {
  if (ports.length === 0) {
    return false;
  }
  const closestPort = ports
    .map((port) => {
      return {
        ...port,
        distance: distance(
          [currentPosition.longitude, currentPosition.latitude],
          [port.lon, port.lat],
          { units: "meters" },
        ),
      };
    })
    .sort((a, b) => a.distance - b.distance)[0];
  return closestPort.distance < 1000;
}

export function predictPath(
  position: Position,
  cruisePath: LineString,
): PredictedPath | null {
  const { latitude, longitude, speed_over_ground } = position;
  const elapsedMs =
    new Date().getTime() - new Date(position.timestamp).getTime();

  // Convert elapsed time from milliseconds to hours
  const elapsedHours = elapsedMs / (1000 * 60 * 60);
  // 1 nautical mile = 1.852 km
  const distanceNm = speed_over_ground * elapsedHours;
  const distanceKm = distanceNm * 1.852;
  const lineFeature: Feature<LineString> = {
    type: "Feature",
    properties: {},
    geometry: cruisePath,
  };
  const currentPoint: Feature<Point> = {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Point",
      coordinates: [longitude, latitude],
    },
  };

  const nearestPoint = nearestPointOnLine(lineFeature, currentPoint);
  const startDistance = nearestPoint.properties.location ?? 0;
  const endDistance = startDistance + distanceKm;
  const totalLength = length(lineFeature, { units: "kilometers" });
  const clampedEndDistance = Math.min(endDistance, totalLength);
  const endPoint = along(lineFeature, clampedEndDistance, {
    units: "kilometers",
  });
  const pathSegment = lineSlice(nearestPoint, endPoint, lineFeature);
  const endCoords = endPoint.geometry.coordinates;
  const predictedEndPosition: Position = {
    ...position,
    id: position.id + "-predicted",
    timestamp: new Date().toISOString(),
    latitude: endCoords[1],
    longitude: endCoords[0],
    is_predicted: true,
  };
  return {
    path: pathSegment,
    endPosition: predictedEndPosition,
  };
}

export function shouldPredictPosition(
  ports: Port[],
  lastPosition: Position,
): boolean {
  const timeSinceLastPosition =
    new Date().getTime() - new Date(lastPosition.timestamp).getTime();
  return (
    !isInPort(ports, lastPosition) && timeSinceLastPosition > 1000 * 60 * 5
  );
}

export function getFlagEmoji(countryCode: string): string {
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

export function formatDateInTimezone(
  isoDateString: string,
  timezone?: string,
): string {
  const date = new Date(isoDateString);
  const clientTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return date.toLocaleString("en-GB", {
    timeZone: timezone || clientTimeZone,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}
