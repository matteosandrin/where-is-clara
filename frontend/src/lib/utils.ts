import distance from "@turf/distance";
import type { Port, Position } from "../types/types";

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

export function predictPosition(position: Position): Position {
  const { latitude, longitude, course_over_ground, speed_over_ground } =
    position;
  const elapsedMs =
    new Date().getTime() - new Date(position.timestamp).getTime();

  // Convert elapsed time from milliseconds to hours
  const elapsedHours = elapsedMs / (1000 * 60 * 60);

  // Distance traveled in nautical miles
  const distanceNm = speed_over_ground * elapsedHours;

  // Convert course from degrees to radians
  const courseRad = (course_over_ground * Math.PI) / 180;
  const latRad = (latitude * Math.PI) / 180;

  // 1 nautical mile = 1 arc minute of latitude = 1/60 degree
  // Change in latitude (degrees)
  const deltaLat = (distanceNm * Math.cos(courseRad)) / 60;

  // Change in longitude (degrees) - adjusted for latitude
  // At higher latitudes, longitude lines converge, so we divide by cos(lat)
  const deltaLon = (distanceNm * Math.sin(courseRad)) / (60 * Math.cos(latRad));

  return {
    ...position,
    id: position.id + "-predicted",
    timestamp: new Date().toISOString(),
    latitude: latitude + deltaLat,
    longitude: longitude + deltaLon,
    is_predicted: true,
  } as Position;
}
