import { useEffect, useState, useMemo, useCallback } from "react";
import Map, { Source, Layer, NavigationControl } from "react-map-gl/mapbox";
import type { LayerProps, MapRef } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import distance from "@turf/distance";
import { positionApi, settingsApi } from "../client";
import type { Position, Settings } from "../types";
import { PositionModal } from "./PositionModal";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

const DARK_BLUE = "#193cb8";
const GREEN = "#7CDD66";

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

const latestArrowLayerStyle: LayerProps = {
  id: "latest-arrow",
  type: "symbol",
  layout: {
    "icon-image": "direction-arrow-green",
    "icon-size": 0.8,
    "icon-rotate": ["get", "course"],
    "icon-rotation-alignment": "map",
    "icon-allow-overlap": true,
    "icon-ignore-placement": true,
  },
};

// Create an arrow icon as a data URL
function createArrowIcon(
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

function formatTimeUntilNow(timestamp: string) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diff / 1000 / 60);

  if (diffMinutes < 60) {
    return `${diffMinutes}min ago`;
  }

  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;

  if (minutes === 0) {
    return `${hours}hr ago`;
  }

  return `${hours}hr ${minutes}min ago`;
}

export function HomePage() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(
    null,
  );
  const [settings, setSettings] = useState<Settings | null>(null);

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
      // Only keep points that are at least 10 meters apart
      const MIN_DISTANCE_METERS = 10;
      const filtered = sorted.filter((p, i, arr) => {
        if (i === 0) return true;
        const prev = arr[i - 1];
        const dist = distance(
          [prev.longitude, prev.latitude],
          [p.longitude, p.latitude],
          { units: "meters" },
        );
        return dist > MIN_DISTANCE_METERS;
      });
      setPositions(filtered);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch positions",
      );
    } finally {
      setLoading(false);
    }
  }, [settings]);

  useEffect(() => {
    async function fetchSettings() {
      const data = await settingsApi.getSettings();
      setSettings(data);
    }
    fetchSettings();
  }, []);

  useEffect(() => {
    if (!settings) return;
    fetchPositions();
    // Fetch positions every 10 seconds
    const interval = setInterval(() => fetchPositions(), 10000);
    return () => clearInterval(interval);
  }, [settings, fetchPositions]);

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
          id: p.id,
        },
        geometry: {
          type: "Point" as const,
          coordinates: [p.longitude, p.latitude],
        },
      })),
    };
  }, [positions]);

  const latestPointGeojson = useMemo(() => {
    if (positions.length === 0) return null;
    const latest = positions[positions.length - 1];
    return {
      type: "Feature" as const,
      properties: {
        course: latest.course_over_ground,
        id: latest.id,
      },
      geometry: {
        type: "Point" as const,
        coordinates: [latest.longitude, latest.latitude],
      },
    };
  }, [positions]);

  const onMapLoad = useCallback(
    (evt: { target: MapRef["getMap"] extends () => infer R ? R : never }) => {
      const map = evt.target;
      const loadArrowIcon = (
        iconName: string,
        iconColor: string,
        strokeColor: string | null,
      ) => {
        if (!map.hasImage(iconName)) {
          const arrowImg = createArrowIcon(iconColor, strokeColor);
          arrowImg.onload = () => {
            if (!map.hasImage(iconName)) {
              map.addImage(iconName, arrowImg);
            }
          };
          if (arrowImg.complete) {
            map.addImage(iconName, arrowImg);
          }
        }
      };
      loadArrowIcon("direction-arrow", DARK_BLUE, null);
      loadArrowIcon("direction-arrow-green", GREEN, "#ffffff");
    },
    [],
  );

  const onPointClick = useCallback(
    (event: any) => {
      const features = event.features;
      if (!features || features.length === 0) {
        return;
      }

      const clickedFeature = features[0];
      const matchingPosition = positions.find(
        (p) => p.id === clickedFeature.properties.id,
      );
      if (!matchingPosition) {
        return;
      }
      setSelectedPosition(matchingPosition);
    },
    [positions],
  );

  const handleCloseModal = useCallback(() => {
    setSelectedPosition(null);
  }, []);

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
        onClick={onPointClick}
        interactiveLayerIds={["arrows", "latest-arrow"]}
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
        {latestPointGeojson && (
          <Source id="latest-arrow" type="geojson" data={latestPointGeojson}>
            <Layer {...latestArrowLayerStyle} />
          </Source>
        )}
        {selectedPosition && (
          <PositionModal
            position={selectedPosition}
            title={settings?.vessel_name || ""}
            isOpen={true}
            onClose={handleCloseModal}
          />
        )}
      </Map>

      {positions.length > 0 && (
        <>
          {/* Latest Position Info Panel */}
          <div className="absolute top-4 left-4 bg-slate-900/90 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4 shadow-2xl min-w-[260px]">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-700/50">
              <div
                className="w-3 h-3 rounded-full animate-pulse"
                style={{ backgroundColor: GREEN }}
              />
              <h3 className="text-slate-100 font-semibold text-sm tracking-wide">
                {settings?.vessel_name || "Latest Position"}
              </h3>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Last position</span>
                <span className="text-slate-200 font-mono text-xs">
                  {formatTimeUntilNow(
                    positions[positions.length - 1].timestamp,
                  )}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-400">Latitude</span>
                <span className="text-slate-200 font-mono">
                  {positions[positions.length - 1].latitude.toFixed(5)}°
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-400">Longitude</span>
                <span className="text-slate-200 font-mono">
                  {positions[positions.length - 1].longitude.toFixed(5)}°
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-400">Speed</span>
                <span className="text-slate-200 font-mono">
                  {positions[positions.length - 1].speed_over_ground.toFixed(1)}{" "}
                  kn
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-400">Course</span>
                <span className="text-slate-200 font-mono">
                  {positions[positions.length - 1].course_over_ground.toFixed(
                    0,
                  )}
                  °
                </span>
              </div>
            </div>
          </div>

          {/* Position Count Badge */}
          <div className="absolute bottom-6 right-6 bg-slate-900/90 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4 shadow-2xl">
            <p className="text-slate-300 text-sm">
              <span className="text-sky-400 font-semibold">
                {positions.length}
              </span>{" "}
              positions
            </p>
          </div>
        </>
      )}
    </div>
  );
}
