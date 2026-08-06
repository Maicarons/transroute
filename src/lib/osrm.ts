// 真实公路路由（基于 OpenStreetMap 路网，返回 WGS84 坐标，与 Carto/OSM 底图天然对齐，无需 GCJ-02 纠偏）。
//
// 提供两个内置源：
//  - OSRM 公共演示服务器（免 Key、CORS 开放，但速率受限，仅适合轻度使用）
//  - 本地自部署 OSRM（经 Vite 代理 /osrm 转发到 localhost:5000，可离线、可控、无速率限制）
// 另见 src/lib/amap.ts 的高德源（GCJ-02，需 Key）。
//
// 本地部署见仓库根目录 docker-compose.yml 与 scripts/setup-osrm.sh。

export interface OsrmRoute {
  /** 真实公路距离（公里） */
  distanceKm: number;
  /** 真实驾车耗时（小时） */
  durationHours: number;
  /** 道路折线，[经度, 纬度]（WGS84） */
  path: [number, number][];
}

export const OSRM_PUBLIC_BASE =
  "https://router.project-osrm.org/route/v1/driving";
// 本地 OSRM：经 Vite dev server 代理（vite.config.ts 中 /osrm -> localhost:5000），
// 因此走同源，规避 osrm-routed 默认不带 CORS 头的问题。
// 本地 OSRM：由 docker-compose 中的 nginx 网关暴露到 localhost:5000 并补 CORS 头，
// 因此前端可跨源直接访问（dev server 与 5000 不同端口也能用）。无需 Vite 代理。
export const OSRM_LOCAL_BASE = "http://localhost:5000/route/v1/driving";

export type OsrmSource = "public" | "local";

export async function osrmRoute(
  origin: [number, number],
  dest: [number, number],
  opts?: { baseUrl?: string; signal?: AbortSignal }
): Promise<OsrmRoute> {
  const base = opts?.baseUrl ?? OSRM_PUBLIC_BASE;
  const coord = (c: [number, number]) => `${c[0]},${c[1]}`;
  const url = `${base}/${coord(origin)};${coord(
    dest
  )}?overview=full&geometries=geojson`;
  const res = await fetch(url, { signal: opts?.signal });
  if (!res.ok) throw new Error(`OSRM 请求失败 (HTTP ${res.status})`);
  const data = (await res.json()) as {
    code: string;
    routes?: {
      distance: number;
      duration: number;
      geometry?: { coordinates: [number, number][] };
    }[];
  };
  if (data.code !== "Ok" || !data.routes?.length) {
    throw new Error("OSRM 未返回可行路线");
  }
  const route = data.routes[0];
  const path: [number, number][] = (route.geometry?.coordinates ?? []).map(
    (c) => [c[0], c[1]]
  );
  return {
    distanceKm: route.distance / 1000,
    durationHours: route.duration / 3600,
    path,
  };
}

export interface OsrmMetrics {
  /** 真实公路距离（公里） */
  distanceKm: number;
  /** 真实驾车耗时（小时） */
  durationHours: number;
}

/**
 * 仅取两点间的真实公路里程/耗时，不请求折线（overview=false），
 * 用于为「拓扑图的边」填充真实权重，比 osrmRoute 更轻量。
 */
export async function osrmMetrics(
  origin: [number, number],
  dest: [number, number],
  opts?: { baseUrl?: string; signal?: AbortSignal }
): Promise<OsrmMetrics> {
  const base = opts?.baseUrl ?? OSRM_PUBLIC_BASE;
  if (origin[0] === dest[0] && origin[1] === dest[1]) {
    return { distanceKm: 0, durationHours: 0 };
  }
  const coord = (c: [number, number]) => `${c[0]},${c[1]}`;
  const url = `${base}/${coord(origin)};${coord(dest)}?overview=false`;
  const res = await fetch(url, { signal: opts?.signal });
  if (!res.ok) throw new Error(`OSRM 请求失败 (HTTP ${res.status})`);
  const data = (await res.json()) as {
    code: string;
    routes?: { distance: number; duration: number }[];
  };
  if (data.code !== "Ok" || !data.routes?.length) {
    throw new Error("OSRM 未返回可行路线");
  }
  const r = data.routes[0];
  return { distanceKm: r.distance / 1000, durationHours: r.duration / 3600 };
}
