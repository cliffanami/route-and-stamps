// Standard OSM raster tiles bake place labels into the image in the local
// script (e.g. 東京都 rather than Tokyo) — there's no accept-language header
// that can fix this, since tiles are pre-rendered PNGs cached by URL and
// can't vary per requester (confirmed Wikimedia's "osm-intl" style doesn't
// either, for the same caching reason).
//
// Was CARTO's Voyager basemap (romanized labels, keyless) until CARTO
// started gating every basemap style behind a required API key —
// confirmed live: the tile URL now returns HTTP 200 with a baked-in
// "API KEY REQUIRED" placeholder image instead of an error, so this broke
// silently rather than loudly (live-usage feedback: "the map says api key
// needed"). Esri's World Street Map is the replacement — still free and
// keyless (no account, no token), and its labels are bilingual rather
// than purely romanized (e.g. "Setagaya-Daita Sta. / 世田谷代田駅"),
// confirmed by directly fetching a tile over Tokyo, which is arguably
// more useful than Voyager's Latin-only labels for a trip like this one.
// Note the tile path order: Esri's REST tile service is {z}/{y}/{x}, the
// reverse of the {z}/{x}/{y} convention CARTO/OSM use — and it has no
// {s} subdomain sharding (single host), unlike CARTO's a/b/c/d.
export const TILE_LAYER_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}";
export const TILE_LAYER_SUBDOMAINS = "";
export const TILE_LAYER_ATTRIBUTION =
  'Tiles &copy; <a href="https://www.esri.com/">Esri</a> — Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom';
