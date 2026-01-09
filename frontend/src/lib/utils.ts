import distance from "@turf/distance";
import type { Port, Position } from "../types/types";

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
