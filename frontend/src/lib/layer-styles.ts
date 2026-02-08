import type { LayerProps } from "react-map-gl/mapbox";
import { DARK_BLUE, YELLOW } from "./colors";

export const lineLayerStyle: LayerProps = {
  id: "route-line",
  type: "line",
  paint: {
    "line-color": DARK_BLUE,
    "line-width": 3,
    "line-opacity": 0.85,
  },
};

export const cruisePathLayerStyle: LayerProps = {
  id: "cruise-path",
  type: "line",
  paint: {
    "line-color": "#ffffff",
    "line-width": 2,
    "line-opacity": 0.1,
  },
};

export const arrowLayerStyle: LayerProps = {
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

export const latestArrowLayerStyle: LayerProps = {
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

export const predictedArrowLayerStyle: LayerProps = {
  id: "predicted-arrow",
  type: "symbol",
  layout: {
    "icon-image": "direction-arrow-yellow",
    "icon-size": 0.8,
    "icon-rotate": ["get", "course"],
    "icon-rotation-alignment": "map",
    "icon-allow-overlap": true,
    "icon-ignore-placement": true,
  },
};

export const lineToPredictedPositionLayerStyle: LayerProps = {
  id: "line-to-predicted-position",
  type: "line",
  paint: {
    "line-color": YELLOW,
    "line-width": 2,
  },
};
