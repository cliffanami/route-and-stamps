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

// ROADMAP.md "Push notifications" — the actual mechanism that reaches the
// OS tray with the app closed. send-push (the Edge Function, migration
// 0021's trigger) sends {title, body, url} as the push message body.
self.addEventListener("push", (event) => {
  if (!event.data) return;

  const { title, body, url } = event.data.json() as {
    title: string;
    body: string;
    url: string;
  };

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/icons/icon-192.png",
      data: { url },
    }),
  );
});

// Focuses an already-open tab on the notification's target route rather
// than always opening a new one — falls back to opening fresh if no
// window is currently open.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data as { url?: string } | undefined)?.url ?? "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => "focus" in client);
      if (existing) {
        existing.navigate(url);
        return existing.focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});
