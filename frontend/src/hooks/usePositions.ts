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

  const fetchPositions = useCallback(
    async (fromTs: string | null, toTs: string | null) => {
      console.log("fetching positions");
      try {
        const data = await positionApi.getRange(
          settings?.vessel_mmsi || null,
          fromTs,
          toTs,
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
      }
    },
    [settings, ports],
  );

  useEffect(() => {
    if (!settings) return;
    const cruiseStartTs = settings?.cruise_start_date || null;
    const loadPositions = async () => {
      // Get fromTs as (current datetime minus one day) in ISO string
      const now = new Date();
      const fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const oneDayAgoTs = fromDate.toISOString();
      // Fetch positions from the last 24 hours first
      await fetchPositions(oneDayAgoTs, null);
      setLoading(false);
      // now fetch all positions
      fetchPositions(cruiseStartTs, null);
    };
    loadPositions();
    // Fetch positions every 60 seconds
    const interval = setInterval(
      () => fetchPositions(cruiseStartTs, null),
      FETCH_INTERVAL_MS,
    );
    return () => clearInterval(interval);
  }, [settings, fetchPositions]);
  return { positions, predictedPosition, loading, error };
}
