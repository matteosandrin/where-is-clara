import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import Map, { Source, Layer, Marker } from "react-map-gl/mapbox";
import type { MapRef } from "react-map-gl/mapbox";
import { PortPin } from "./PortPin";
import "mapbox-gl/dist/mapbox-gl.css";
import type { Port, Position } from "../types/types";
import { PositionModal } from "./PositionModal";
import { CurrentPositionPanel } from "./CurrentPositionPanel";
import { PortsListPanel } from "./PortsListPanel";
import cruiseData from "../data/cruise.json";
import splitGeoJSON from "geojson-antimeridian-cut";
import { PortModal } from "./PortModal";
import { PositionMarker } from "./PositionMarker";
import { getNextPort, isInPort, createArrowIcon } from "../lib/utils";
import { DARK_BLUE, GREEN, YELLOW } from "../lib/colors";
import {
  cruisePathLayerStyle,
  lineLayerStyle,
  lineToNextPortLayerStyle,
  lineToPredictedPositionLayerStyle,
  arrowLayerStyle,
} from "../lib/layer-styles";
import { useSettings } from "../hooks/settings";
import { usePositions } from "../hooks/usePositions";
import mapboxgl from "mapbox-gl";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

const ports = cruiseData.ports.map((port) => port as Port);

export function HomePage() {
  const mapRef = useRef<MapRef>(null);
  const { settings } = useSettings();
  const { positions, predictedPath, loading, error } = usePositions(
    settings,
    ports,
  );

  const [selectedPosition, setSelectedPosition] = useState<Position | null>(
    null,
  );
  const [selectedPort, setSelectedPort] = useState<Port | null>(null);

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

  const lineToPredictedPositionGeojson = useMemo(() => {
    if (positions.length === 0 || !predictedPath) return null;
    // Use the path that follows the cruise route
    return predictedPath.path;
  }, [positions, predictedPath]);

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
            predictedPath
              ? predictedPath.endPosition.longitude
              : positions[positions.length - 1].longitude,
            predictedPath
              ? predictedPath.endPosition.latitude
              : positions[positions.length - 1].latitude,
          ],
          [nextPort.lon, nextPort.lat],
        ],
      },
    };
  }, [positions, predictedPath, ports]);

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
      const matchingPosition = [...positions, predictedPath?.endPosition].find(
        (p) => p && p.id === clickedFeature.properties.id,
      );
      if (!matchingPosition) {
        return;
      }
      setSelectedPosition(matchingPosition);
    },
    [positions, predictedPath],
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
    const latest = predictedPath
      ? predictedPath.endPosition
      : positions[positions.length - 1];
    return {
      longitude: latest.longitude,
      latitude: latest.latitude,
      zoom: 6,
    };
  }, [positions, predictedPath]);

  useEffect(() => {
    if (!positions || positions.length === 0) return;
    console.log(positions);
    const latest = predictedPath
      ? predictedPath.endPosition
      : positions[positions.length - 1];
    const nextPort = getNextPort(ports, latest);
    if (!isInPort(ports, latest) && nextPort) {
      const bounds = new mapboxgl.LngLatBounds();
      bounds.extend([latest.longitude, latest.latitude]);
      bounds.extend([nextPort.lon, nextPort.lat]);
      const isMobile = window.innerWidth <= 768;
      setTimeout(() => {
        mapRef.current?.fitBounds(bounds, { padding: isMobile ? 75 : 300 });
      }, 100);
    }
  }, [positions, predictedPath]);

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
        interactiveLayerIds={["arrows"]}
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
        {/* Position marker for latest/predicted position */}
        {positions.length > 0 && (
          <Marker
            longitude={
              predictedPath
                ? predictedPath.endPosition.longitude
                : positions[positions.length - 1].longitude
            }
            latitude={
              predictedPath
                ? predictedPath.endPosition.latitude
                : positions[positions.length - 1].latitude
            }
            anchor="center"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              setSelectedPosition(
                predictedPath?.endPosition || positions[positions.length - 1],
              );
            }}
          >
            <PositionMarker isPredicted={predictedPath !== null} />
          </Marker>
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
            isPredicted={predictedPath !== null}
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
