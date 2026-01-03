import { useEffect, useState, useMemo, useCallback } from "react";
import Map, { Source, Layer, NavigationControl } from "react-map-gl/mapbox";
import type { LayerProps, MapRef } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { positionApi } from "../client";
import type { Position } from "../types";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

const DARK_BLUE = "#193cb8";

const lineLayerStyle: LayerProps = {
  id: "route-line",
  type: "line",
  paint: {
    "line-color": DARK_BLUE,
    "line-width": 3,
    "line-opacity": 0.85,
  },
};

const arrowLayerStyle: LayerProps = {
  id: "arrows",
  type: "symbol",
  layout: {
    "icon-image": "direction-arrow",
    "icon-size": 0.6,
    "icon-rotate": ["get", "course"],
    "icon-rotation-alignment": "map",
    "icon-allow-overlap": true,
    "icon-ignore-placement": true,
  },
  minzoom: 9,
};

const pointLayerStyle: LayerProps = {
  id: "points",
  type: "circle",
  paint: {
    "circle-color": DARK_BLUE,
    "circle-radius": 5,
  },
  maxzoom: 9,
};

// Create an arrow icon as a data URL
function createArrowIcon(): HTMLImageElement {
  const size = 48;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  // Draw arrow pointing up (0 degrees = north)
  ctx.fillStyle = DARK_BLUE;

  ctx.beginPath();
  ctx.moveTo(size / 2, 4); // Top point
  ctx.lineTo(size - 10, size - 6); // Bottom right
  ctx.lineTo(size / 2, size - 16); // Bottom center notch
  ctx.lineTo(10, size - 6); // Bottom left
  ctx.closePath();

  ctx.fill();

  const img = new Image(size, size);
  img.src = canvas.toDataURL();
  return img;
}

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

  const lineGeojson = useMemo(() => {
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

  const pointsGeojson = useMemo(() => {
    if (positions.length === 0) return null;
    return {
      type: "FeatureCollection" as const,
      features: positions.map((p) => ({
        type: "Feature" as const,
        properties: {
          course: p.course_over_ground,
        },
        geometry: {
          type: "Point" as const,
          coordinates: [p.longitude, p.latitude],
        },
      })),
    };
  }, [positions]);

  const onMapLoad = useCallback(
    (evt: { target: MapRef["getMap"] extends () => infer R ? R : never }) => {
      const map = evt.target;
      if (!map.hasImage("direction-arrow")) {
        const arrowImg = createArrowIcon();
        arrowImg.onload = () => {
          if (!map.hasImage("direction-arrow")) {
            map.addImage("direction-arrow", arrowImg);
          }
        };
        // If already loaded (data URL), add immediately
        if (arrowImg.complete) {
          map.addImage("direction-arrow", arrowImg);
        }
      }
    },
    [],
  );

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
        mapStyle="mapbox://styles/mapbox/navigation-day-v1"
        mapboxAccessToken={MAPBOX_TOKEN}
        attributionControl={false}
        style={{ width: "100%", height: "100%" }}
        onLoad={onMapLoad}
      >
        <NavigationControl position="top-right" />
        {lineGeojson && (
          <Source id="route" type="geojson" data={lineGeojson}>
            <Layer {...lineLayerStyle} />
          </Source>
        )}
        {pointsGeojson && (
          <Source id="arrows" type="geojson" data={pointsGeojson}>
            <Layer {...arrowLayerStyle} />
          </Source>
        )}
        {pointsGeojson && (
          <Source id="points" type="geojson" data={pointsGeojson}>
            <Layer {...pointLayerStyle} />
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
