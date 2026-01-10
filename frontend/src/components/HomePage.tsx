import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import Map, { Source, Layer, Marker } from "react-map-gl/mapbox";
import type { MapRef } from "react-map-gl/mapbox";
import { PortPin } from "./PortPin";
import "mapbox-gl/dist/mapbox-gl.css";
import distance from "@turf/distance";
import { positionApi, settingsApi } from "../lib/client";
import type { Port, Position, Settings } from "../types/types";
import { PositionModal } from "./PositionModal";
import { CurrentPositionPanel } from "./CurrentPositionPanel";
import { PortsListPanel } from "./PortsListPanel";
import cruiseData from "../data/cruise.json";
import splitGeoJSON from "geojson-antimeridian-cut";
import { PortModal } from "./PortModal";
import {
  getNextPort,
  isInPort,
  predictPosition,
  createArrowIcon,
  shouldPredictPosition,
} from "../lib/utils";
import { DARK_BLUE, GREEN, YELLOW } from "../lib/colors";
import {
  cruisePathLayerStyle,
  lineLayerStyle,
  lineToNextPortLayerStyle,
  latestArrowLayerStyle,
  lineToPredictedPositionLayerStyle,
  predictedArrowLayerStyle,
  arrowLayerStyle,
} from "../lib/layer-styles";
import { useSettings } from "../hooks/settings";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

const ports = cruiseData.ports.map((port) => port as Port);

export function HomePage() {
  const mapRef = useRef<MapRef>(null);
  const { settings } = useSettings();

  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(
    null,
  );
  const [selectedPort, setSelectedPort] = useState<Port | null>(null);
  const [predictedPosition, setPredictedPosition] = useState<Position | null>(
    null,
  );

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
      const MIN_DISTANCE_METERS = 25;
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
        const predictedPosition = predictPosition(lastPosition);
        setPredictedPosition(predictedPosition);
      }
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
    if (!settings) return;
    fetchPositions();
    // Fetch positions every 60 seconds
    const interval = setInterval(() => fetchPositions(), 1000 * 60);
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

  const predictedPointGeojson = useMemo(() => {
    if (!predictedPosition) return null;
    return {
      type: "Feature" as const,
      properties: {
        course: predictedPosition.course_over_ground,
        id: predictedPosition.id,
      },
      geometry: {
        type: "Point" as const,
        coordinates: [predictedPosition.longitude, predictedPosition.latitude],
      },
    };
  }, [predictedPosition]);

  const lineToPredictedPositionGeojson = useMemo(() => {
    if (positions.length === 0 || !predictedPosition) return null;
    return {
      type: "Feature" as const,
      properties: {},
      geometry: {
        type: "LineString" as const,
        coordinates: [
          [
            positions[positions.length - 1].longitude,
            positions[positions.length - 1].latitude,
          ],
          [predictedPosition.longitude, predictedPosition.latitude],
        ],
      },
    };
  }, [positions, predictedPosition]);

  const lineToNextPortGeojson = useMemo(() => {
    if (
      positions.length === 0 ||
      isInPort(ports, positions[positions.length - 1])
    )
      return null;
    const nextPort = getNextPort(ports, positions[positions.length - 1]);
    if (!nextPort) return null;
    return {
      type: "Feature" as const,
      properties: {},
      geometry: {
        type: "LineString" as const,
        coordinates: [
          [
            predictedPosition
              ? predictedPosition.longitude
              : positions[positions.length - 1].longitude,
            predictedPosition
              ? predictedPosition.latitude
              : positions[positions.length - 1].latitude,
          ],
          [nextPort.lon, nextPort.lat],
        ],
      },
    };
  }, [positions, predictedPosition, ports]);

  const cruisePathGeojson = useMemo(() => {
    const lineString = {
      type: "LineString" as const,
      coordinates: cruiseData.points,
    };
    return splitGeoJSON(lineString);
  }, []);

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
        }
      };
      loadArrowIcon("direction-arrow", DARK_BLUE, null);
      loadArrowIcon("direction-arrow-green", GREEN, "#ffffff");
      loadArrowIcon("direction-arrow-yellow", YELLOW, "#ffffff");
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
      const matchingPosition = [...positions, predictedPosition].find(
        (p) => p && p.id === clickedFeature.properties.id,
      );
      if (!matchingPosition) {
        return;
      }
      setSelectedPosition(matchingPosition);
    },
    [positions, predictedPosition],
  );

  const handleClosePositionModal = useCallback(() => {
    setSelectedPosition(null);
  }, []);

  const handleClosePortModal = useCallback(() => {
    setSelectedPort(null);
  }, []);

  const handlePortListClick = useCallback((port: Port) => {
    mapRef.current?.flyTo({
      center: [port.lon, port.lat],
      zoom: 8,
      duration: 1500,
    });
  }, []);

  const initialViewState = useMemo(() => {
    if (positions.length === 0) {
      return { longitude: 0, latitude: 0, zoom: 2 };
    }
    // Center on the most recent position
    const latest = predictedPosition
      ? predictedPosition
      : positions[positions.length - 1];
    return {
      longitude: latest.longitude,
      latitude: latest.latitude,
      zoom: 6,
    };
  }, [positions, predictedPosition]);

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-sky-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-100 text-lg tracking-wide">
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
        ref={mapRef}
        initialViewState={initialViewState}
        mapStyle="mapbox://styles/mapbox/outdoors-v12"
        mapboxAccessToken={MAPBOX_TOKEN}
        attributionControl={false}
        dragRotate={false}
        style={{ width: "100%", height: "100%" }}
        onLoad={onMapLoad}
        onClick={onPointClick}
        interactiveLayerIds={["arrows", "latest-arrow", "predicted-arrow"]}
        projection={"mercator"}
      >
        <Source id="cruise-path" type="geojson" data={cruisePathGeojson}>
          <Layer {...cruisePathLayerStyle} />
        </Source>
        {lineGeojson && (
          <Source id="route" type="geojson" data={lineGeojson}>
            <Layer {...lineLayerStyle} />
          </Source>
        )}
        {lineToNextPortGeojson && (
          <Source
            id="line-to-next-port"
            type="geojson"
            data={lineToNextPortGeojson}
          >
            <Layer {...lineToNextPortLayerStyle} />
          </Source>
        )}
        {ports.map((port, index) => (
          <Marker
            key={port.id}
            longitude={port.lon}
            latitude={port.lat}
            anchor="bottom"
            onClick={() => setSelectedPort(port)}
          >
            <PortPin number={index + 1} />
          </Marker>
        ))}
        {lineToPredictedPositionGeojson && (
          <Source
            id="line-to-predicted-position"
            type="geojson"
            data={lineToPredictedPositionGeojson}
          >
            <Layer {...lineToPredictedPositionLayerStyle} />
          </Source>
        )}
        {pointsGeojson && (
          <Source id="arrows" type="geojson" data={pointsGeojson}>
            <Layer {...arrowLayerStyle} />
          </Source>
        )}
        {latestPointGeojson && !predictedPosition && (
          <Source id="latest-arrow" type="geojson" data={latestPointGeojson}>
            <Layer {...latestArrowLayerStyle} />
          </Source>
        )}
        {predictedPointGeojson && (
          <Source
            id="predicted-arrow"
            type="geojson"
            data={predictedPointGeojson}
          >
            <Layer {...predictedArrowLayerStyle} />
          </Source>
        )}
        {selectedPosition && (
          <PositionModal
            position={selectedPosition}
            title={settings?.vessel_name || ""}
            isOpen={true}
            onClose={handleClosePositionModal}
          />
        )}
        {selectedPort && (
          <PortModal
            port={selectedPort}
            isOpen={true}
            onClose={handleClosePortModal}
          />
        )}
      </Map>

      {positions.length > 0 && (
        <>
          <CurrentPositionPanel
            position={positions[positions.length - 1]}
            title={settings?.vessel_name || ""}
            isPredicted={predictedPosition !== null}
          />

          <PortsListPanel
            ports={ports}
            currentPosition={positions[positions.length - 1]}
            onPortClick={handlePortListClick}
          />

          {/* Position Count Badge */}
          <div className="panel absolute bottom-2 right-2 md:bottom-4 md:right-4 py-2!">
            <p className="text-slate-100 text-sm">
              <span className="font-semibold">{positions.length}</span>{" "}
              positions
            </p>
          </div>
        </>
      )}
    </div>
  );
}
