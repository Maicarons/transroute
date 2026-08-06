// 统一地理编码服务：把「地名」解析为真实经纬度。
// 数据源：OSM Nominatim（浏览器端直连，免 Key，CORS 可用）或 高德（需 Key，JSONP）。
// 另提供真实城市库本地检索（src/data/cities.ts）。

import { REAL_CITIES } from "@/data/cities";
import { amapGeocode } from "@/lib/amap";

export interface GeoResult {
  name: string;
  lng: number;
  lat: number;
  source: "osm" | "amap" | "catalog";
}

export const OSM_ATTRIBUTION = "© OpenStreetMap contributors";

const cache = new Map<string, GeoResult[]>();

/** OSM Nominatim 地理编码（实时、真实坐标，WGS84）。注意：公共实例限速 1 次/秒，需带 Referer（浏览器自动附带）。 */
export async function geocodeOSM(
  query: string,
  signal?: AbortSignal
): Promise<GeoResult[]> {
  const q = query.trim();
  if (!q) return [];
  const key = "osm:" + q.toLowerCase();
  if (cache.has(key)) return cache.get(key)!;
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&accept-language=zh-CN&q=${encodeURIComponent(
    q
  )}`;
  const res = await fetch(url, {
    signal,
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  const data = (await res.json()) as {
    display_name: string;
    lon: string;
    lat: string;
  }[];
  const out: GeoResult[] = data.map((d) => ({
    name: d.display_name,
    lng: parseFloat(d.lon),
    lat: parseFloat(d.lat),
    source: "osm",
  }));
  cache.set(key, out);
  return out;
}

/** 本地真实城市库检索（离线、真实坐标）。 */
export function searchCatalog(query: string): GeoResult[] {
  const q = query.trim();
  const list = q
    ? REAL_CITIES.filter((c) => c.name.includes(q))
    : REAL_CITIES;
  return list.map((c) => ({
    name: c.name,
    lng: c.lng,
    lat: c.lat,
    source: "catalog" as const,
  }));
}

/** 统一入口：按设置选择数据源。 */
export async function geocode(
  query: string,
  opts: { provider: "osm" | "amap"; amapKey: string },
  signal?: AbortSignal
): Promise<GeoResult[]> {
  if (opts.provider === "amap" && opts.amapKey) {
    const r = await amapGeocode(query, opts.amapKey);
    return r.map((x) => ({ ...x, source: "amap" as const }));
  }
  return geocodeOSM(query, signal);
}
