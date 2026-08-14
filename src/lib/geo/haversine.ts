const EARTH_RADIUS_KM = 6371;

// Mirrors public.haversine_km() in supabase/migrations/0001_init.sql — kept
// in TS too since the client needs it before a place has been saved (e.g.
// nearest-stop preview while filling out the Add form).
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

  return EARTH_RADIUS_KM * 2 * Math.asin(Math.sqrt(a));
}
