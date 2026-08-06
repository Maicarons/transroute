import {
  type Algorithm,
  type LogiEdge,
  type LogiNode,
  type LogiSettings,
  type RouteResult,
  type RouteSegment,
  type TransportMode,
} from "@/lib/types";
import { haversineKm } from "@/lib/geo";

interface AdjEntry {
  to: string;
  mode: TransportMode;
  distanceKm: number;
  transportCost: number;
  transportTime: number;
  /** handling charged at the arrived node */
  handlingFee: number;
  handlingTime: number;
  /** 该段里程是否来自真实路网（false=直线估算兜底） */
  real: boolean;
}

/** Build an undirected adjacency list with precomputed per-segment metrics. */
export function buildAdjacency(
  nodes: LogiNode[],
  edges: LogiEdge[],
  settings: LogiSettings
): Map<string, AdjEntry[]> {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const adj = new Map<string, AdjEntry[]>();
  nodes.forEach((n) => adj.set(n.id, []));

  for (const e of edges) {
    if (!e.active) continue;
    const a = nodeMap.get(e.from);
    const b = nodeMap.get(e.to);
    if (!a || !b || a.id === b.id) continue;

    // 优先用真实路网里程/时间；缺失时回退 haversine 直线估算（并标记 non-real）。
    const real = e.real === true;
    const straight = haversineKm([a.lng, a.lat], [b.lng, b.lat]);
    const d = e.distanceKm ?? straight;
    const rate = settings.rates[e.mode];
    const transportCost = d * rate.costPerTonKm * settings.cargoWeight;
    const transportTime = e.durationHours ?? d / rate.speed;

    // travelling u -> v charges handling at the arrived node v
    adj.get(e.from)!.push({
      to: e.to,
      mode: e.mode,
      distanceKm: d,
      transportCost,
      transportTime,
      handlingFee: b.handlingFee,
      handlingTime: b.handlingTime,
      real,
    });
    adj.get(e.to)!.push({
      to: e.from,
      mode: e.mode,
      distanceKm: d,
      transportCost,
      transportTime,
      handlingFee: a.handlingFee,
      handlingTime: a.handlingTime,
      real,
    });
  }
  return adj;
}

function weightOf(entry: AdjEntry, algorithm: Algorithm): number {
  switch (algorithm) {
    case "shortest":
      return entry.distanceKm;
    case "lowestCost":
      return entry.transportCost + entry.handlingFee;
    case "fastest":
      return entry.transportTime + entry.handlingTime;
  }
}

/** Dijkstra (graph is small, linear-scan priority queue is fine). */
function dijkstra(
  adj: Map<string, AdjEntry[]>,
  start: string,
  goal: string,
  algorithm: Algorithm
): { path: string[] | null; weight: number } {
  const dist = new Map<string, number>();
  const prev = new Map<string, { node: string; entry: AdjEntry }>();
  const visited = new Set<string>();
  dist.set(start, 0);
  const pq: [string, number][] = [[start, 0]];

  while (pq.length) {
    pq.sort((a, b) => a[1] - b[1]);
    const [u, du] = pq.shift()!;
    if (visited.has(u)) continue;
    visited.add(u);
    if (u === goal) break;
    for (const e of adj.get(u) ?? []) {
      const nd = du + weightOf(e, algorithm);
      if (nd < (dist.get(e.to) ?? Infinity)) {
        dist.set(e.to, nd);
        prev.set(e.to, { node: u, entry: e });
        pq.push([e.to, nd]);
      }
    }
  }

  if (goal !== start && !visited.has(goal)) {
    return { path: null, weight: Infinity };
  }

  const path: string[] = [];
  let cur = goal;
  if (cur !== start) {
    if (!prev.has(cur)) return { path: null, weight: Infinity };
    while (cur !== start) {
      path.push(cur);
      cur = prev.get(cur)!.node;
    }
    path.push(start);
    path.reverse();
  } else {
    path.push(start);
  }
  return { path, weight: dist.get(goal) ?? 0 };
}

const EMPTY_RESULT: RouteResult = {
  found: false,
  path: [],
  segments: [],
  totalDistance: 0,
  totalCost: 0,
  totalTime: 0,
  totalHandlingFee: 0,
  directDistance: 0,
  realRatio: 0,
};

/** Compute the optimal route for a single objective. */
export function computeRoute(
  nodes: LogiNode[],
  edges: LogiEdge[],
  settings: LogiSettings,
  originId: string | null,
  destId: string | null,
  algorithm: Algorithm
): RouteResult {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  if (
    !originId ||
    !destId ||
    !nodeMap.has(originId) ||
    !nodeMap.has(destId)
  ) {
    return { ...EMPTY_RESULT };
  }

  const origin = nodeMap.get(originId)!;
  const dest = nodeMap.get(destId)!;
  const directDistance = haversineKm(
    [origin.lng, origin.lat],
    [dest.lng, dest.lat]
  );

  const adj = buildAdjacency(nodes, edges, settings);
  const { path } = dijkstra(adj, originId, destId, algorithm);
  if (!path) return { ...EMPTY_RESULT, directDistance };

  const segments: RouteSegment[] = [];
  let totalDistance = 0;
  let totalTransportCost = 0;
  let totalTransportTime = 0;
  let totalHandlingFee = 0;
  let totalHandlingTime = 0;
  let realDistance = 0;

  for (let i = 0; i < path.length - 1; i++) {
    const u = path[i];
    const v = path[i + 1];
    const entry = (adj.get(u) ?? []).find((e) => e.to === v);
    if (!entry) return { ...EMPTY_RESULT, directDistance };
    segments.push({
      fromId: u,
      toId: v,
      mode: entry.mode,
      distanceKm: entry.distanceKm,
      cost: entry.transportCost + entry.handlingFee,
      timeHours: entry.transportTime + entry.handlingTime,
      real: entry.real,
    });
    totalDistance += entry.distanceKm;
    totalTransportCost += entry.transportCost;
    totalTransportTime += entry.transportTime;
    totalHandlingFee += entry.handlingFee;
    totalHandlingTime += entry.handlingTime;
    if (entry.real) realDistance += entry.distanceKm;
  }

  return {
    found: true,
    path,
    segments,
    totalDistance,
    totalCost: totalTransportCost + totalHandlingFee,
    totalTime: totalTransportTime + totalHandlingTime,
    totalHandlingFee,
    directDistance,
    realRatio: totalDistance > 0 ? realDistance / totalDistance : 0,
  };
}

/** Compute all three objectives at once, for comparison charts. */
export function computeAllAlgorithms(
  nodes: LogiNode[],
  edges: LogiEdge[],
  settings: LogiSettings,
  originId: string | null,
  destId: string | null
) {
  return {
    shortest: computeRoute(
      nodes,
      edges,
      settings,
      originId,
      destId,
      "shortest"
    ),
    lowestCost: computeRoute(
      nodes,
      edges,
      settings,
      originId,
      destId,
      "lowestCost"
    ),
    fastest: computeRoute(
      nodes,
      edges,
      settings,
      originId,
      destId,
      "fastest"
    ),
  };
}
