"use client";

import { NavigationArrow } from "@phosphor-icons/react";

interface OpenInGoogleMapsLinkProps {
  lat: number;
  lng: number;
}

// A plain deep-link to google.com/maps, not the Google Maps JS API — no key,
// no billing account, just a URL. On mobile this hands off to the native
// Google Maps app if it's installed, same as tapping a maps link anywhere
// else on the web.
export function OpenInGoogleMapsLink({ lat, lng }: OpenInGoogleMapsLinkProps) {
  const href = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
      <NavigationArrow weight="duotone" size={20} />
      Open in Google Maps
    </a>
  );
}
