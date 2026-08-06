import { fmt } from "@/lib/utils";

const EARTH_RADIUS_KM = 6371.0088;

/** Great-circle (haversine) distance between two [lng, lat] points, in km. */
export function haversineKm(a: [number, number], b: [number, number]): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function formatDistance(km: number): string {
  if (!isFinite(km)) return "—";
  return `${fmt(km, 0)} km`;
}

export function formatCost(yuan: number): string {
  if (!isFinite(yuan)) return "—";
  if (Math.abs(yuan) >= 10000) return `¥${fmt(yuan / 10000, 2)} 万`;
  return `¥${fmt(yuan, 0)}`;
}

export function formatHours(h: number): string {
  if (!isFinite(h)) return "—";
  const days = Math.floor(h / 24);
  const hours = h - days * 24;
  if (days > 0) return `${days} 天 ${fmt(hours, 1)} 时`;
  return `${fmt(h, 1)} 小时`;
}
