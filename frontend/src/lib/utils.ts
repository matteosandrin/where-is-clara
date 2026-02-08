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

// Interpolate intermediate points along a great-circle arc between two coordinates
function interpolateGreatCircle(
  start: number[],
  end: number[],
  numSegments: number,
): number[][] {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;

  const [lon1, lat1] = [toRad(start[0]), toRad(start[1])];
  const [lon2, lat2] = [toRad(end[0]), toRad(end[1])];

  const d = Math.acos(
    Math.sin(lat1) * Math.sin(lat2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1),
  );
  if (d === 0) return [];

  const points: number[][] = [];
  for (let i = 1; i < numSegments; i++) {
    const f = i / numSegments;
    const a = Math.sin((1 - f) * d) / Math.sin(d);
    const b = Math.sin(f * d) / Math.sin(d);
    const x =
      a * Math.cos(lat1) * Math.cos(lon1) +
      b * Math.cos(lat2) * Math.cos(lon2);
    const y =
      a * Math.cos(lat1) * Math.sin(lon1) +
      b * Math.cos(lat2) * Math.sin(lon2);
    const z = a * Math.sin(lat1) + b * Math.sin(lat2);
    const lat = Math.atan2(z, Math.sqrt(x * x + y * y));
    const lon = Math.atan2(y, x);
    points.push([toDeg(lon), toDeg(lat)]);
  }
  return points;
}

// Add intermediate great-circle points to segments longer than maxSegmentKm
export function densifyLineString(
  coordinates: number[][],
  maxSegmentKm: number = 100,
): number[][] {
  const result: number[][] = [coordinates[0]];
  for (let i = 1; i < coordinates.length; i++) {
    const start = coordinates[i - 1];
    const end = coordinates[i];
    const segmentDist = distance(start, end, { units: "kilometers" });
    if (segmentDist > maxSegmentKm) {
      const numSegments = Math.ceil(segmentDist / maxSegmentKm);
      result.push(...interpolateGreatCircle(start, end, numSegments));
    }
    result.push(end);
  }
  return result;
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
  if (distanceKm <= 0) {
    return null;
  }
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
  const clampedEndDistance = Math.max(startDistance, Math.min(endDistance, totalLength));
  const endPoint = along(lineFeature, clampedEndDistance, {
    units: "kilometers",
  });
  const pathSegment = lineSlice(nearestPoint, endPoint, lineFeature);
  // Prepend the actual position so the predicted path connects to the real marker
  pathSegment.geometry.coordinates.unshift([longitude, latitude]);
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
