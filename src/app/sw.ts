/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import { CacheFirst, ExpirationPlugin, Serwist } from "serwist";
import type { PrecacheEntry, RuntimeCaching } from "serwist";

// __SW_MANIFEST is injected at build time by @serwist/next's webpack plugin
// (next.config.ts's swSrc/swDest) — not a real global, just the
// string-replacement injection point the InjectManifest plugin looks for.
declare const self: ServiceWorkerGlobalScope & {
  __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
};

// Runtime-cache map tiles (ROADMAP.md M6) — cache-as-you-go, not a
// proactive pre-fetch of the trip's whole bounding box. Since the trip
// only ever visits one geographic area, lazy caching ends up scoped to it
// naturally as people actually use the map. CacheFirst because tiles are
// immutable per z/x/y — freshness isn't a concern, availability is.
// CARTO Voyager, not stock OSM tiles — matches MapView/LocationMap's
// tile-layer-config.ts (ARCHITECTURE.md "Maps" row: OSM's stock tiles
// render labels in the local script with no way to request English).
const tileCache: RuntimeCaching = {
  matcher: /^https:\/\/[abcd]\.basemaps\.cartocdn\.com\/rastertiles\/voyager\/.*/,
  handler: new CacheFirst({
    cacheName: "osm-tiles",
    plugins: [
      new ExpirationPlugin({
        maxEntries: 500,
        maxAgeSeconds: 30 * 24 * 60 * 60,
      }),
    ],
  }),
};

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [tileCache, ...defaultCache] satisfies RuntimeCaching[],
});

serwist.addEventListeners();
