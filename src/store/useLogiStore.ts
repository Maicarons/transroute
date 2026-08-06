import { create } from "zustand";
import { uid } from "@/lib/utils";
import {
  type Algorithm,
  type LogiEdge,
  type LogiNode,
  type LogiSettings,
  type ModeRate,
  type NetworkData,
  type RealRoute,
  type RouteResult,
  type TransportMode,
} from "@/lib/types";
import { computeRoute } from "@/lib/graph";
import { haversineKm } from "@/lib/geo";
import { osrmMetrics } from "@/lib/osrm";

function createDefaultSettings(): LogiSettings {
  return {
    cargoWeight: 10,
    algorithm: "shortest",
    showArcs: true,
    rates: {
      road: { costPerTonKm: 0.5, speed: 60 },
      rail: { costPerTonKm: 0.25, speed: 80 },
      air: { costPerTonKm: 2.0, speed: 700 },
      sea: { costPerTonKm: 0.1, speed: 35 },
    },
    amapKey: "",
    geocoder: "osm",
    routeSource: "osrmPublic",
  };
}

interface LogiState {
  nodes: LogiNode[];
  edges: LogiEdge[];
  settings: LogiSettings;
  originId: string | null;
  destId: string | null;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  result: RouteResult | null;
  /** 高德返回的真实道路数据（WGS84），用于地图叠加显示与对比。 */
  realRoute: RealRoute | null;

  // node actions
  addNode: (node: Omit<LogiNode, "id">) => string;
  updateNode: (id: string, patch: Partial<LogiNode>) => void;
  deleteNode: (id: string) => void;

  // edge actions
  addEdge: (from: string, to: string, mode: TransportMode) => void;
  updateEdge: (id: string, patch: Partial<LogiEdge>) => void;
  deleteEdge: (id: string) => void;
  /** 通用：每个节点连接最近的 k 个节点（扁平分网络，可用于密度网格）。 */
  autoLink: (k: number) => void;
  /** 物流感知：按层级就近互连（站点→中心→城市→枢纽）+ 枢纽干线网格。 */
  autoConnectTiers: () => void;
  /** 为尚缺真实里程的边异步拉取 OSRM 真实路网里程/时间（失败保留 haversine 兜底）。 */
  refreshMetrics: () => void;
  /** 载入「新泰→厦门」多级轴辐式示例网络（真实坐标）。 */
  loadExample: () => void;

  // selection
  setSelectedNode: (id: string | null) => void;
  setSelectedEdge: (id: string | null) => void;
  setOrigin: (id: string | null) => void;
  setDest: (id: string | null) => void;

  // settings
  setAlgorithm: (a: Algorithm) => void;
  setCargoWeight: (w: number) => void;
  setRate: (mode: TransportMode, patch: Partial<ModeRate>) => void;
  setAmapKey: (key: string) => void;
  setGeocoder: (g: "osm" | "amap") => void;
  setRouteSource: (r: LogiSettings["routeSource"]) => void;
  toggleArcs: () => void;

  // real route (高德)
  setRealRoute: (r: RealRoute | null) => void;

  // data
  resetApp: () => void;
  loadNetwork: (data: NetworkData) => void;
  exportNetwork: () => NetworkData;
  clearAll: () => void;

  recompute: () => void;
}

function edgeExists(edges: LogiEdge[], a: string, b: string): boolean {
  return edges.some(
    (e) => (e.from === a && e.to === b) || (e.from === b && e.to === a)
  );
}

export const useLogiStore = create<LogiState>((set, get) => ({
  nodes: [],
  edges: [],
  settings: createDefaultSettings(),
  originId: null,
  destId: null,
  selectedNodeId: null,
  selectedEdgeId: null,
  result: null,
  realRoute: null,

  addNode: (node) => {
    const id = uid("n");
    set((s) => ({ nodes: [...s.nodes, { ...node, id }] }));
    get().recompute();
    return id;
  },

  updateNode: (id, patch) => {
    const coordChanged = "lng" in patch || "lat" in patch;
    set((s) => ({
      nodes: s.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
      // 坐标变化会使相邻边的真实里程失效，标记待重算
      edges: coordChanged
        ? s.edges.map((e) =>
            e.from === id || e.to === id ? { ...e, real: false } : e
          )
        : s.edges,
    }));
    if (coordChanged) get().refreshMetrics();
    else get().recompute();
  },

  deleteNode: (id) => {
    set((s) => ({
      nodes: s.nodes.filter((n) => n.id !== id),
      edges: s.edges.filter((e) => e.from !== id && e.to !== id),
      originId: s.originId === id ? null : s.originId,
      destId: s.destId === id ? null : s.destId,
      selectedNodeId: s.selectedNodeId === id ? null : s.selectedNodeId,
    }));
    get().recompute();
  },

  addEdge: (from, to, mode) => {
    if (from === to) return;
    const { edges } = get();
    if (edgeExists(edges, from, to)) return;
    const edge: LogiEdge = { id: uid("e"), from, to, mode, active: true };
    set((s) => ({ edges: [...s.edges, edge] }));
    get().refreshMetrics();
  },

  updateEdge: (id, patch) => {
    set((s) => ({
      edges: s.edges.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    }));
    get().recompute();
  },

  deleteEdge: (id) => {
    set((s) => ({
      edges: s.edges.filter((e) => e.id !== id),
      selectedEdgeId: s.selectedEdgeId === id ? null : s.selectedEdgeId,
    }));
    get().recompute();
  },

  autoLink: (k) => {
    const { nodes, edges } = get();
    const newEdges: LogiEdge[] = [];
    for (const a of nodes) {
      const neighbors = nodes
        .filter((b) => b.id !== a.id)
        .map((b) => ({
          b,
          d: haversineKm([a.lng, a.lat], [b.lng, b.lat]),
        }))
        .sort((x, y) => x.d - y.d)
        .slice(0, k);
      for (const { b } of neighbors) {
        if (
          !edgeExists(edges, a.id, b.id) &&
          !edgeExists(newEdges, a.id, b.id)
        ) {
          newEdges.push({
            id: uid("e"),
            from: a.id,
            to: b.id,
            mode: "road",
            active: true,
          });
        }
      }
    }
    if (newEdges.length) {
      set((s) => ({ edges: [...s.edges, ...newEdges] }));
      get().refreshMetrics();
    }
  },

  autoConnectTiers: () => {
    const { nodes, edges } = get();
    const byTier = (t: LogiNode["tier"]) => nodes.filter((n) => n.tier === t);
    const tiers: LogiNode["tier"][] = ["station", "local", "city", "hub"];
    const newEdges: LogiEdge[] = [];

    const addIfMissing = (a: LogiNode, b: LogiNode, mode: TransportMode) => {
      if (a.id === b.id) return;
      if (edgeExists(edges, a.id, b.id) || edgeExists(newEdges, a.id, b.id))
        return;
      newEdges.push({ id: uid("e"), from: a.id, to: b.id, mode, active: true });
    };

    // 相邻层级就近互连（低 → 高）：站点→中心→城市→枢纽
    for (let i = 0; i < tiers.length - 1; i++) {
      const lower = byTier(tiers[i]);
      const higher = byTier(tiers[i + 1]);
      for (const a of lower) {
        const nearest = higher
          .map((b) => ({
            b,
            d: haversineKm([a.lng, a.lat], [b.lng, b.lat]),
          }))
          .sort((x, y) => x.d - y.d)
          .slice(0, 1);
        for (const { b } of nearest) addIfMissing(a, b, "road");
      }
    }

    // 枢纽干线网格：每个枢纽连最近的 2 个枢纽（跨区域干线）
    const hubs = byTier("hub");
    for (const a of hubs) {
      const nearest = hubs
        .filter((b) => b.id !== a.id)
        .map((b) => ({
          b,
          d: haversineKm([a.lng, a.lat], [b.lng, b.lat]),
        }))
        .sort((x, y) => x.d - y.d)
        .slice(0, 2);
      for (const { b } of nearest) addIfMissing(a, b, "rail");
    }

    if (newEdges.length) {
      set((s) => ({ edges: [...s.edges, ...newEdges] }));
      get().refreshMetrics();
    }
  },

  refreshMetrics: () => {
    const { edges, nodes } = get();
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const targets = edges.filter((e) => e.real !== true);
    if (!targets.length) return;
    void (async () => {
      const updates: Record<
        string,
        { distanceKm: number; durationHours: number; real: boolean }
      > = {};
      for (const e of targets) {
        const a = nodeMap.get(e.from);
        const b = nodeMap.get(e.to);
        if (!a || !b) continue;
        try {
          const m = await osrmMetrics([a.lng, a.lat], [b.lng, b.lat]);
          updates[e.id] = {
            distanceKm: m.distanceKm,
            durationHours: m.durationHours,
            real: true,
          };
        } catch {
          // 拉取失败：保留 haversine 兜底（real 不置 true）
        }
      }
      if (Object.keys(updates).length) {
        set((s) => ({
          edges: s.edges.map((e) =>
            updates[e.id] ? { ...e, ...updates[e.id] } : e
          ),
        }));
        get().recompute();
      }
    })();
  },

  loadExample: () => {
    const seed: Omit<LogiNode, "id">[] = [
      { name: "发货厂·新泰", tier: "station", lng: 117.75, lat: 35.91, handlingFee: 2, handlingTime: 0.5 },
      { name: "新泰物流中心", tier: "local", lng: 117.78, lat: 35.88, handlingFee: 5, handlingTime: 1 },
      { name: "泰安", tier: "city", lng: 117.13, lat: 36.09, handlingFee: 8, handlingTime: 2 },
      { name: "济南枢纽", tier: "hub", lng: 117.12, lat: 36.65, handlingFee: 15, handlingTime: 3 },
      { name: "济宁枢纽", tier: "hub", lng: 116.59, lat: 35.41, handlingFee: 15, handlingTime: 3 },
      { name: "福州枢纽", tier: "hub", lng: 119.3, lat: 26.07, handlingFee: 15, handlingTime: 3 },
      { name: "厦门", tier: "city", lng: 118.09, lat: 24.48, handlingFee: 8, handlingTime: 2 },
      { name: "集美物流中心", tier: "local", lng: 118.1, lat: 24.57, handlingFee: 5, handlingTime: 1 },
      { name: "派送站·厦门", tier: "station", lng: 118.1, lat: 24.5, handlingFee: 2, handlingTime: 0.5 },
    ];
    const ids = seed.map((n) => ({ id: uid("n"), ...n }));
    const nodeMap = new Map(ids.map((n) => [n.name, n.id]));
    set({
      nodes: ids,
      edges: [],
      originId: nodeMap.get("发货厂·新泰") ?? null,
      destId: nodeMap.get("派送站·厦门") ?? null,
      selectedNodeId: null,
      selectedEdgeId: null,
      result: null,
      realRoute: null,
    });
    get().autoConnectTiers();
  },

  setSelectedNode: (id) => set({ selectedNodeId: id, selectedEdgeId: null }),
  setSelectedEdge: (id) => set({ selectedEdgeId: id, selectedNodeId: null }),
  setOrigin: (id) => {
    set({ originId: id });
    get().recompute();
  },
  setDest: (id) => {
    set({ destId: id });
    get().recompute();
  },

  setAlgorithm: (a) => {
    set((s) => ({ settings: { ...s.settings, algorithm: a } }));
    get().recompute();
  },
  setCargoWeight: (w) => {
    set((s) => ({
      settings: { ...s.settings, cargoWeight: Math.max(0.1, w) },
    }));
    get().recompute();
  },
  setRate: (mode, patch) => {
    set((s) => ({
      settings: {
        ...s.settings,
        rates: {
          ...s.settings.rates,
          [mode]: { ...s.settings.rates[mode], ...patch },
        },
      },
    }));
    get().recompute();
  },
  setAmapKey: (key) =>
    set((s) => ({ settings: { ...s.settings, amapKey: key } })),
  setGeocoder: (g) =>
    set((s) => ({ settings: { ...s.settings, geocoder: g } })),
  setRouteSource: (r) =>
    set((s) => ({ settings: { ...s.settings, routeSource: r } })),
  toggleArcs: () =>
    set((s) => ({
      settings: { ...s.settings, showArcs: !s.settings.showArcs },
    })),

  setRealRoute: (r) => set({ realRoute: r }),

  resetApp: () => {
    set({
      nodes: [],
      edges: [],
      settings: createDefaultSettings(),
      originId: null,
      destId: null,
      selectedNodeId: null,
      selectedEdgeId: null,
      result: null,
      realRoute: null,
    });
  },

  loadNetwork: (data) => {
    set({
      nodes: data.nodes,
      edges: data.edges,
      settings: data.settings,
      originId: data.originId,
      destId: data.destId,
      selectedNodeId: null,
      selectedEdgeId: null,
    });
    get().recompute();
  },

  exportNetwork: () => {
    const s = get();
    return {
      version: 1,
      nodes: s.nodes,
      edges: s.edges,
      settings: s.settings,
      originId: s.originId,
      destId: s.destId,
    };
  },

  clearAll: () => {
    set({
      nodes: [],
      edges: [],
      originId: null,
      destId: null,
      selectedNodeId: null,
      selectedEdgeId: null,
      result: null,
      realRoute: null,
    });
  },

  recompute: () => {
    const s = get();
    const result = computeRoute(
      s.nodes,
      s.edges,
      s.settings,
      s.originId,
      s.destId,
      s.settings.algorithm
    );
    // 拓扑变化后，旧的高德真实路线失效，清空以免误导。
    set({ result, realRoute: null });
  },
}));
