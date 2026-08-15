import L from "leaflet";

// Plain colored circles via DivIcon, not Leaflet's default pin graphic —
// avoids the marker-image asset-path config Leaflet needs under Next.js
// bundling, and reads as Broadsheet rather than generic-map-library.
// Shared between the trip overview map and single-location map so both
// marker types (stop vs. place) look identical everywhere they appear.
export function circleIcon(diameter: number, filled: boolean) {
  return L.divIcon({
    className: "",
    html: `<div style="width:${diameter}px;height:${diameter}px;border-radius:50%;background:${
      filled ? "var(--color-accent)" : "var(--color-bg)"
    };border:2px solid var(--color-accent);box-shadow:var(--shadow-sm);"></div>`,
    iconSize: [diameter, diameter],
    iconAnchor: [diameter / 2, diameter / 2],
  });
}
