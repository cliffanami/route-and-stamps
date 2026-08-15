// Standard OSM raster tiles bake place labels into the image in the local
// script (e.g. 東京都 rather than Tokyo) — there's no accept-language header
// that can fix this, since tiles are pre-rendered PNGs cached by URL and
// can't vary per requester (confirmed Wikimedia's "osm-intl" style doesn't
// either, for the same caching reason). CARTO's Voyager basemap renders the
// same OSM data with labels already romanized at the tile level, and is
// still free and keyless. Shared by every Leaflet map in the app so they
// all render consistently.
export const TILE_LAYER_URL =
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png";
export const TILE_LAYER_SUBDOMAINS = "abcd";
export const TILE_LAYER_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';
