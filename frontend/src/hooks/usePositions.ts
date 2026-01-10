import { useEffect, useState, useCallback } from "react";
import distance from "@turf/distance";
import { positionApi } from "../lib/client";
import type { Port, Position, Settings } from "../types/types";
import { shouldPredictPosition, predictPosition } from "../lib/utils";

const MIN_DISTANCE_METERS = 25;
const FETCH_INTERVAL_MS = 60 * 1000;

export function usePositions(settings: Settings | null, ports: Port[]) {
  const [positions, setPositions] = useState<Position[]>([]);
  const [predictedPosition, setPredictedPosition] = useState<Position | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPositions = useCallback(async () => {
    console.log("fetching positions");
    try {
      const fromTs = settings?.cruise_start_date || null;
      const data = await positionApi.getRange(
        settings?.vessel_mmsi || null,
        fromTs,
        null,
      );
      // Sort by timestamp ascending for proper line drawing
      const sorted = data.sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );
      // Only keep points that are at least 25 meters apart
      const filtered = sorted.filter((p, i, arr) => {
        if (i === 0) return true;
        if (i === arr.length - 1) return true;
        const prev = arr[i - 1];
        const dist = distance(
          [prev.longitude, prev.latitude],
          [p.longitude, p.latitude],
          { units: "meters" },
        );
        return dist > MIN_DISTANCE_METERS;
      });
      // Predict position if last position is older than 5 minutes
      const lastPosition = filtered[filtered.length - 1];
      if (shouldPredictPosition(ports, lastPosition)) {
        const predicted = predictPosition(lastPosition);
        setPredictedPosition(predicted);
      } else {
        setPredictedPosition(null);
      }
      setPositions(filtered);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch positions",
      );
    } finally {
      setLoading(false);
    }
  }, [settings, ports]);

  useEffect(() => {
    if (!settings) return;
    fetchPositions();
    // Fetch positions every 60 seconds
    const interval = setInterval(() => fetchPositions(), FETCH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [settings, fetchPositions]);

  return { positions, predictedPosition, loading, error };
}
