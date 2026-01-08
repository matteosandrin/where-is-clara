declare module "geojson-antimeridian-cut" {
  import type { GeoJSON } from "geojson";

  function splitGeoJSON<T extends GeoJSON>(object: T): T;
  export default splitGeoJSON;
}
