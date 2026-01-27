import { useEffect, useState, useCallback } from "react";
import { positionApi } from "../lib/client";
import type { Port, Position, Settings } from "../types/types";
import {
  shouldPredictPosition,
  predictPath,
  type PredictedPath,
} from "../lib/utils";
import cruiseData from "../data/cruise.json";

const FETCH_INTERVAL_MS = 60 * 1000;

// Create the cruise path LineString from the cruise data
const cruisePath = {
  type: "LineString" as const,
  coordinates: cruiseData.points,
};

export function usePositions(settings: Settings | null, ports: Port[]) {
  const [positions, setPositions] = useState<Position[]>([]);
  const [predictedPath, setPredictedPath] = useState<PredictedPath | null>(
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
        const sortedPositions = data.sort(
          (a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
        );
        // Predict path if last position is older than 5 minutes
        const lastPosition = sortedPositions[sortedPositions.length - 1];
        if (shouldPredictPosition(ports, lastPosition)) {
          const predicted = predictPath(lastPosition, cruisePath);
          setPredictedPath(predicted);
        } else {
          setPredictedPath(null);
        }
        setPositions(sortedPositions);
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
  return { positions, predictedPath, loading, error };
}
