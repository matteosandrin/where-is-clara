import { useEffect, useState, useMemo } from "react";
import Map, { Source, Layer, NavigationControl } from "react-map-gl/mapbox";
import type { LayerProps } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { positionApi } from "../client";
import type { Position } from "../types";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

const lineLayerStyle: LayerProps = {
  id: "route-line",
  type: "line",
  paint: {
    "line-color": "#0ea5e9",
    "line-width": 3,
    "line-opacity": 0.85,
  },
};

export function HomePage() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPositions() {
      try {
        const now = new Date();
        const thirtyDaysAgo = new Date(
          now.getTime() - 30 * 24 * 60 * 60 * 1000,
        );
        const data = await positionApi.getRange(
          null,
          thirtyDaysAgo.toISOString(),
          now.toISOString(),
        );
        // Sort by timestamp ascending for proper line drawing
        const sorted = data.sort(
          (a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
        );
        setPositions(sorted);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch positions",
        );
      } finally {
        setLoading(false);
      }
    }
    fetchPositions();
  }, []);

  const geojson = useMemo(() => {
    if (positions.length === 0) return null;
    return {
      type: "Feature" as const,
      properties: {},
      geometry: {
        type: "LineString" as const,
        coordinates: positions.map((p) => [p.longitude, p.latitude]),
      },
    };
  }, [positions]);

  const initialViewState = useMemo(() => {
    if (positions.length === 0) {
      return { longitude: 0, latitude: 0, zoom: 2 };
    }
    // Center on the most recent position
    const latest = positions[positions.length - 1];
    return {
      longitude: latest.longitude,
      latitude: latest.latitude,
      zoom: 8,
    };
  }, [positions]);

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-sky-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-300 text-lg tracking-wide">
            Loading positions...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-900">
        <div className="bg-red-900/40 border border-red-500/50 rounded-xl p-8 max-w-md">
          <h2 className="text-red-400 text-xl font-semibold mb-2">Error</h2>
          <p className="text-red-200">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0">
      <Map
        initialViewState={initialViewState}
        mapStyle="mapbox://styles/mapbox/navigation-night-v1"
        mapboxAccessToken={MAPBOX_TOKEN}
        attributionControl={false}
        style={{ width: "100%", height: "100%" }}
      >
        <NavigationControl position="top-right" />
        {geojson && (
          <Source id="route" type="geojson" data={geojson}>
            <Layer {...lineLayerStyle} />
          </Source>
        )}
      </Map>

      {positions.length > 0 && (
        <div className="absolute bottom-6 right-6 bg-slate-900/90 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4 shadow-2xl">
          <p className="text-slate-300 text-sm">
            <span className="text-sky-400 font-semibold">
              {positions.length}
            </span>{" "}
            positions
            <span className="text-slate-500 mx-2">•</span>
            Last 30 days
          </p>
        </div>
      )}
    </div>
  );
}
