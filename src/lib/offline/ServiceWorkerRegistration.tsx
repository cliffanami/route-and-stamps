"use client";

import { useEffect } from "react";

// @serwist/next only generates public/sw.js at build time — nothing
// installs it in the browser without an explicit register() call
// (ROADMAP.md M6). Mounted once at the app root (providers.tsx).
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Registration failure (unsupported browser, blocked by an
      // extension, etc.) shouldn't break the app — it just means this
      // session runs without offline support.
    });
  }, []);

  return null;
}
