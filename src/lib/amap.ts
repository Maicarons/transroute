// 高德地图（AMap）Web服务接入：地理编码 + 路径规划。
// 坐标说明：高德返回的是 GCJ-02（火星坐标），而本系统的底图（Carto/OSM）使用 WGS84，
// 因此所有高德坐标在入库前都通过 gcj02ToWgs84 纠偏，保证在地图上与 OSM 底图对齐。
//
// 申请 Key：https://console.amap.com/ → 应用管理 → 创建应用 → 添加 Key（服务平台选「Web服务」）。
// 说明：高德 Web服务(restapi) 默认不允许浏览器跨域 fetch，这里用 JSONP 方式调用，无需后端代理。

const AMAP_GEOCODE = "https://restapi.amap.com/v3/geocode/geo";
const AMAP_DIRECTION = "https://restapi.amap.com/v3/direction";

// ---- GCJ-02 <-> WGS84 坐标转换（标准算法） ----
const PI = Math.PI;
const A = 6378245.0;
const EE = 0.00669342162296594323;

function outOfChina(lng: number, lat: number): boolean {
  return lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271;
}

function transformLat(lng: number, lat: number): number {
  let ret =
    -100 +
    2 * lng +
    3 * lat +
    0.2 * lat * lat +
    0.1 * lng * lat +
    0.2 * Math.sqrt(Math.abs(lng));
  ret += ((20 * Math.sin(6 * lng * PI) + 20 * Math.sin(2 * lng * PI)) * 2) / 3;
  ret += ((20 * Math.sin(lat * PI) + 40 * Math.sin((lat / 3) * PI)) * 2) / 3;
  ret +=
    ((160 * Math.sin((lat / 12) * PI) + 320 * Math.sin((lat * PI) / 30)) * 2) /
    3;
  return ret;
}

function transformLng(lng: number, lat: number): number {
  let ret =
    300 +
    lng +
    2 * lat +
    0.1 * lng * lng +
    0.1 * lng * lat +
    0.1 * Math.sqrt(Math.abs(lng));
  ret += ((20 * Math.sin(6 * lng * PI) + 20 * Math.sin(2 * lng * PI)) * 2) / 3;
  ret += ((20 * Math.sin(lng * PI) + 40 * Math.sin((lng / 3) * PI)) * 2) / 3;
  ret +=
    ((150 * Math.sin((lng / 12) * PI) + 300 * Math.sin((lng / 30) * PI)) * 2) /
    3;
  return ret;
}

/** GCJ-02 -> WGS84 */
export function gcj02ToWgs84(lng: number, lat: number): [number, number] {
  if (outOfChina(lng, lat)) return [lng, lat];
  let dLat = transformLat(lng - 105.0, lat - 35.0);
  let dLng = transformLng(lng - 105.0, lat - 35.0);
  const radLat = (lat / 180) * PI;
  let magic = Math.sin(radLat);
  magic = 1 - EE * magic * magic;
  const sqrtMagic = Math.sqrt(magic);
  dLat = (dLat * 180) / (((A * (1 - EE)) / (magic * sqrtMagic)) * PI);
  dLng = (dLng * 180) / ((A / sqrtMagic) * Math.cos(radLat) * PI);
  const mglat = lat + dLat;
  const mglng = lng + dLng;
  return [lng * 2 - mglng, lat * 2 - mglat];
}

/** WGS84 -> GCJ-02（请求高德接口前把坐标转回火星坐标） */
export function wgs84ToGcj02(lng: number, lat: number): [number, number] {
  if (outOfChina(lng, lat)) return [lng, lat];
  let dLat = transformLat(lng - 105.0, lat - 35.0);
  let dLng = transformLng(lng - 105.0, lat - 35.0);
  const radLat = (lat / 180) * PI;
  let magic = Math.sin(radLat);
  magic = 1 - EE * magic * magic;
  const sqrtMagic = Math.sqrt(magic);
  dLat = (dLat * 180) / (((A * (1 - EE)) / (magic * sqrtMagic)) * PI);
  dLng = (dLng * 180) / ((A / sqrtMagic) * Math.cos(radLat) * PI);
  return [lng + dLng, lat + dLat];
}

export interface AmapGeocodeResult {
  name: string;
  lng: number;
  lat: number;
}

/** JSONP 请求（规避高德 Web服务的浏览器跨域限制）。 */
function jsonp<T>(url: string, timeoutMs = 9000): Promise<T> {
  return new Promise((resolve, reject) => {
    const cb = "__amapcb_" + Date.now() + Math.floor(Math.random() * 1e6);
    const script = document.createElement("script");
    let timer: ReturnType<typeof setTimeout>;
    const cleanup = () => {
      clearTimeout(timer);
      delete (window as unknown as Record<string, unknown>)[cb];
      script.remove();
    };
    (window as unknown as Record<string, unknown>)[cb] = (data: T) => {
      cleanup();
      resolve(data);
    };
    timer = setTimeout(() => {
      cleanup();
      reject(new Error("高德请求超时"));
    }, timeoutMs);
    script.onerror = () => {
      cleanup();
      reject(new Error("高德网络错误"));
    };
    script.src = `${url}${url.includes("?") ? "&" : "?"}callback=${cb}`;
    document.head.appendChild(script);
  });
}

/** 地理编码：地址/地名 -> 真实经纬度（已纠偏为 WGS84）。 */
export async function amapGeocode(
  address: string,
  key: string
): Promise<AmapGeocodeResult[]> {
  const url = `${AMAP_GEOCODE}?key=${encodeURIComponent(
    key
  )}&address=${encodeURIComponent(address)}`;
  const data = (await jsonp<{
    status: string;
    info?: string;
    geocodes?: { formatted_address?: string; location: string }[];
  }>(url)) as {
    status: string;
    info?: string;
    geocodes?: { formatted_address?: string; location: string }[];
  };
  if (data.status !== "1") throw new Error(data.info || "高德地理编码失败");
  const geocodes = data.geocodes || [];
  return geocodes.map((g) => {
    const [lng, lat] = g.location.split(",").map(Number);
    const [wlon, wlat] = gcj02ToWgs84(lng, lat);
    return { name: g.formatted_address || address, lng: wlon, lat: wlat };
  });
}

export interface AmapRoute {
  distanceKm: number;
  durationHours: number;
  /** 真实道路折线（WGS84），用于地图绘制。 */
  path: [number, number][];
}

/** 路径规划：起点->终点 的真实道路距离/时长/折线（驾车或公交）。 */
export async function amapDirection(
  origin: [number, number],
  dest: [number, number],
  key: string,
  mode: "driving" | "transit" = "driving"
): Promise<AmapRoute> {
  const o = wgs84ToGcj02(origin[0], origin[1]);
  const d = wgs84ToGcj02(dest[0], dest[1]);
  const url = `${AMAP_DIRECTION}/${mode}?key=${encodeURIComponent(
    key
  )}&origin=${o[0]},${o[1]}&destination=${d[0]},${d[1]}&extensions=base`;
  const data = (await jsonp<{
    status: string;
    info?: string;
    route?: { paths?: { distance: string; duration: string; steps?: { polyline: string }[] }[] };
  }>(url)) as {
    status: string;
    info?: string;
    route?: { paths?: { distance: string; duration: string; steps?: { polyline: string }[] }[] };
  };
  if (data.status !== "1" || !data.route?.paths?.length)
    throw new Error(data.info || "高德路径规划失败");
  const p = data.route.paths[0];
  const coordStr = (p.steps || [])
    .map((s) => s.polyline)
    .filter(Boolean)
    .join(";");
  const path: [number, number][] = coordStr
    .split(";")
    .filter(Boolean)
    .map((pt) => {
      const [lng, lat] = pt.split(",").map(Number);
      const [wlon, wlat] = gcj02ToWgs84(lng, lat);
      return [wlon, wlat] as [number, number];
    });
  return {
    distanceKm: Number(p.distance) / 1000,
    durationHours: Number(p.duration) / 3600,
    path,
  };
}
