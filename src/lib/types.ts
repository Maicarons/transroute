// 物流节点的「层级（tier）」——对应真实轴辐式（hub-and-spoke）多级网络：
//   站点 station  → 当地物流中心 local  → 城市节点 city  → 中转/转运枢纽 hub
// 货物从发货点进入，逐级上行到枢纽、干线跨区、再逐级下行到收货点。
// 起点/终点(origin/dest)是叠加在任何 tier 之上的「角色」，不是 tier 本身。
export type NodeTier = "station" | "local" | "city" | "hub";

export type TransportMode = "road" | "rail" | "air" | "sea";

export type Algorithm = "shortest" | "lowestCost" | "fastest";

/** 层级顺序：数值越小越靠近末端（收发），越大越靠近干线枢纽。 */
export const TIER_ORDER: Record<NodeTier, number> = {
  station: 1,
  local: 2,
  city: 3,
  hub: 4,
};

export const TIER_LABELS: Record<NodeTier, string> = {
  station: "物流站点",
  local: "当地物流中心",
  city: "城市节点",
  hub: "中转枢纽",
};

export const TIER_COLORS: Record<NodeTier, string> = {
  station: "#a3e635", // 末端（收发）— 黄绿
  local: "#f59e0b", // 当地物流中心 — 橙
  city: "#38bdf8", // 城市节点 — 蓝
  hub: "#a78bfa", // 中转枢纽 — 紫
};

export interface LogiNode {
  id: string;
  name: string;
  lng: number;
  lat: number;
  /** 物流层级：站点 / 当地物流中心 / 城市节点 / 中转枢纽。 */
  tier: NodeTier;
  /** 中转处理费（元 / 票） */
  handlingFee: number;
  /** 中转处理时间（小时） */
  handlingTime: number;
}

export interface LogiEdge {
  id: string;
  from: string;
  to: string;
  mode: TransportMode;
  active: boolean;
  /**
   * 两点之间的真实公路里程（公里）与耗时（小时），来自 OSRM / 高德真实路网。
   * 缺失或为 false 时，graph 回退到 haversine 直线估算（并打标），但默认应当填充真实值。
   */
  distanceKm?: number;
  durationHours?: number;
  /** true=真实路网数据；false/undefined=直线估算兜底。 */
  real?: boolean;
}

export interface ModeRate {
  /** 元 / (吨·公里) */
  costPerTonKm: number;
  /** 公里 / 小时 */
  speed: number;
}

export interface LogiSettings {
  /** 货量（吨） */
  cargoWeight: number;
  algorithm: Algorithm;
  /** 是否在地图上显示全部拓扑连线 */
  showArcs: boolean;
  rates: Record<TransportMode, ModeRate>;
  /** 高德 Web服务 Key（可选）。填入后可用高德地理编码 / 路径规划作为真实数据源。 */
  amapKey: string;
  /** 地理编码数据源：OSM(Nominatim) 或 高德。 */
  geocoder: "osm" | "amap";
  /** 真实里程数据源：OSRM 公共 / OSRM 本地 / 高德。 */
  routeSource: "osrmPublic" | "osrmLocal" | "amap";
}

export interface RouteSegment {
  fromId: string;
  toId: string;
  mode: TransportMode;
  distanceKm: number;
  /** 该段总成本（运输 + 到达端处理费） */
  cost: number;
  /** 该段总时间（运输 + 到达端处理时间） */
  timeHours: number;
  /** 该段里程是否来自真实路网（false=直线估算） */
  real: boolean;
}

export interface RouteResult {
  found: boolean;
  /** 节点 id 序列（含起点与终点） */
  path: string[];
  segments: RouteSegment[];
  totalDistance: number;
  totalCost: number;
  totalTime: number;
  totalHandlingFee: number;
  /** 起点到终点的直线（大圆）距离，仅作「迂回系数」参考，不参与路径计算。 */
  directDistance: number;
  /** 路径中真实路网里程占比（0~1），用于提示数据可信度。 */
  realRatio: number;
}

export interface NetworkData {
  version: 1;
  nodes: LogiNode[];
  edges: LogiEdge[];
  settings: LogiSettings;
  originId: string | null;
  destId: string | null;
}

/** 高德 / OSRM 返回的真实道路数据（WGS84 / 已纠偏），用于与计算拓扑做对比。 */
export interface RealRoute {
  /** 真实道路折线（WGS84 [lng, lat]）。 */
  path: [number, number][];
  /** 真实道路距离（公里）。 */
  distanceKm: number;
  /** 真实道路耗时（小时）。 */
  durationHours: number;
  /** 数据来源标注。 */
  source: "osrmPublic" | "osrmLocal" | "amap";
}

export const MODE_LABELS: Record<TransportMode, string> = {
  road: "公路",
  rail: "铁路",
  air: "航空",
  sea: "水运",
};

export const MODE_COLORS: Record<TransportMode, string> = {
  road: "#f59e0b",
  rail: "#38bdf8",
  air: "#a78bfa",
  sea: "#34d399",
};

export const ALGORITHM_LABELS: Record<Algorithm, string> = {
  shortest: "最短里程",
  lowestCost: "最低成本",
  fastest: "最快时效",
};

export const ALGORITHM_COLORS: Record<Algorithm, string> = {
  shortest: "#38bdf8",
  lowestCost: "#34d399",
  fastest: "#f59e0b",
};

export const ROUTE_SOURCE_LABELS: Record<
  LogiSettings["routeSource"],
  string
> = {
  osrmPublic: "OSRM·公共",
  osrmLocal: "OSRM·本地",
  amap: "高德",
};
