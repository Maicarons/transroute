import { useMemo } from "react";
import {
  Map as MapGL,
  MapMarker,
  MarkerContent,
  MarkerLabel,
  MarkerTooltip,
  MarkerPopup,
  MapArc,
  MapRoute,
  MapControls,
  type MapArcDatum,
} from "@/components/ui/map";
import { useLogiStore } from "@/store/useLogiStore";
import { cn } from "@/lib/utils";
import {
  ALGORITHM_COLORS,
  TIER_COLORS,
  TIER_LABELS,
  type LogiNode,
  type NodeTier,
  type TransportMode,
} from "@/lib/types";

type Role = "origin" | "dest" | NodeTier;

const ROLE_COLOR: Record<Role, string> = {
  origin: "#22c55e",
  dest: "#ef4444",
  station: TIER_COLORS.station,
  local: TIER_COLORS.local,
  city: TIER_COLORS.city,
  hub: TIER_COLORS.hub,
};

const MODE_COLOR: Record<TransportMode, string> = {
  road: "#f59e0b",
  rail: "#38bdf8",
  air: "#a78bfa",
  sea: "#34d399",
};

/** 高德真实道路折线在地图上的颜色（与计算拓扑路径区分）。 */
const REAL_ROUTE_COLOR = "#ec4899";

interface ArcDatum extends MapArcDatum {
  mode: TransportMode;
}

function computeViewport(nodes: LogiNode[]) {
  if (nodes.length === 0) return { center: [108, 34] as [number, number], zoom: 3 };
  let minLng = 180,
    maxLng = -180,
    minLat = 90,
    maxLat = -90;
  for (const n of nodes) {
    minLng = Math.min(minLng, n.lng);
    maxLng = Math.max(maxLng, n.lng);
    minLat = Math.min(minLat, n.lat);
    maxLat = Math.max(maxLat, n.lat);
  }
  const center: [number, number] = [
    (minLng + maxLng) / 2,
    (minLat + maxLat) / 2,
  ];
  const span = Math.max(maxLng - minLng, (maxLat - minLat) * 1.3, 2);
  const zoom = Math.max(2.2, Math.min(6.5, Math.log2(360 / span) - 0.4));
  return { center, zoom };
}

export function MapPanel() {
  const nodes = useLogiStore((s) => s.nodes);
  const edges = useLogiStore((s) => s.edges);
  const settings = useLogiStore((s) => s.settings);
  const originId = useLogiStore((s) => s.originId);
  const destId = useLogiStore((s) => s.destId);
  const result = useLogiStore((s) => s.result);
  const realRoute = useLogiStore((s) => s.realRoute);
  const selectedNodeId = useLogiStore((s) => s.selectedNodeId);
  const setSelectedNode = useLogiStore((s) => s.setSelectedNode);
  const setOrigin = useLogiStore((s) => s.setOrigin);
  const setDest = useLogiStore((s) => s.setDest);
  const updateNode = useLogiStore((s) => s.updateNode);

  const nodeMap = useMemo(
    () => new Map(nodes.map((n) => [n.id, n])),
    [nodes]
  );

  const { center, zoom } = useMemo(
    () => computeViewport(nodes),
    [nodes]
  );

  const arcs = useMemo<ArcDatum[]>(() => {
    return edges
      .filter((e) => e.active && nodeMap.has(e.from) && nodeMap.has(e.to))
      .map((e) => {
        const a = nodeMap.get(e.from)!;
        const b = nodeMap.get(e.to)!;
        return {
          id: e.id,
          from: [a.lng, a.lat] as [number, number],
          to: [b.lng, b.lat] as [number, number],
          mode: e.mode,
        };
      });
  }, [edges, nodeMap]);

  const pathCoords = useMemo<[number, number][]>(() => {
    if (!result?.found) return [];
    return result.path
      .map((id) => nodeMap.get(id))
      .filter(Boolean)
      .map((n) => [n!.lng, n!.lat] as [number, number]);
  }, [result, nodeMap]);

  const roleOf = (n: LogiNode): Role => {
    if (n.id === originId) return "origin";
    if (n.id === destId) return "dest";
    return n.tier;
  };

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl border bg-card">
      <MapGL center={center} zoom={zoom} className="h-full w-full">
        <MapControls
          showZoom
          showFullscreen
          showCompass
          position="top-right"
        />

        {settings.showArcs && (
          <MapArc<ArcDatum>
            data={arcs}
            curvature={0.15}
            samples={40}
            interactive={false}
            paint={{
              "line-color": [
                "match",
                ["get", "mode"],
                "road",
                MODE_COLOR.road,
                "rail",
                MODE_COLOR.rail,
                "air",
                MODE_COLOR.air,
                "sea",
                MODE_COLOR.sea,
                "#888",
              ],
              "line-width": 1.1,
              "line-opacity": 0.28,
            }}
          />
        )}

        {pathCoords.length > 1 && (
          <MapRoute
            coordinates={pathCoords}
            color={ALGORITHM_COLORS[settings.algorithm]}
            width={5}
            opacity={0.95}
          />
        )}

        {/* 高德真实道路折线：虚线叠加在拓扑路径之上，便于对比实际路网 */}
        {realRoute && realRoute.path.length > 1 && (
          <MapRoute
            id="real-route"
            coordinates={realRoute.path}
            color={REAL_ROUTE_COLOR}
            width={3}
            opacity={1}
            dashArray={[2, 2]}
          />
        )}

        {nodes.map((n) => {
          const role = roleOf(n);
          const color = ROLE_COLOR[role];
          const isSelected = selectedNodeId === n.id;
          const isEndpoint = role === "origin" || role === "dest";
          return (
            <MapMarker
              key={n.id}
              longitude={n.lng}
              latitude={n.lat}
              draggable
              onClick={() => setSelectedNode(n.id)}
              onDragEnd={(ll) =>
                updateNode(n.id, { lng: ll.lng, lat: ll.lat })
              }
            >
              <MarkerContent>
                <div
                  className={cn(
                    "relative flex items-center justify-center transition-transform",
                    isSelected && "scale-125"
                  )}
                >
                  <div
                    className={cn(
                      "flex items-center justify-center rounded-full border-2 border-white shadow-lg",
                      isEndpoint ? "h-5 w-5" : "h-3.5 w-3.5"
                    )}
                    style={{ background: color }}
                  >
                    {isEndpoint && (
                      <span className="h-2 w-2 rounded-full bg-white/90" />
                    )}
                  </div>
                  <MarkerLabel
                    position="top"
                    className="mt-1 whitespace-nowrap rounded bg-popover/90 px-1.5 py-0.5 text-[11px] font-medium text-popover-foreground shadow"
                  >
                    {n.name}
                  </MarkerLabel>
                </div>
              </MarkerContent>
              <MarkerTooltip>{n.name}</MarkerTooltip>
              <MarkerPopup>
                <div className="min-w-[180px] space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{n.name}</span>
                    <span
                      className="rounded px-1.5 py-0.5 text-[10px] font-medium text-white"
                      style={{ background: color }}
                    >
                      {role === "origin"
                        ? "起点"
                        : role === "dest"
                        ? "终点"
                        : TIER_LABELS[role]}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground tabular-nums">
                    {n.lat.toFixed(3)}, {n.lng.toFixed(3)}
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    <div className="rounded bg-muted/60 px-2 py-1">
                      处理费 ¥{n.handlingFee}
                    </div>
                    <div className="rounded bg-muted/60 px-2 py-1">
                      处理 {n.handlingTime}h
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      className="flex-1 rounded bg-primary px-2 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                      onClick={() => setOrigin(n.id)}
                    >
                      设为起点
                    </button>
                    <button
                      className="flex-1 rounded bg-destructive px-2 py-1 text-xs font-medium text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => setDest(n.id)}
                    >
                      设为终点
                    </button>
                  </div>
                </div>
              </MarkerPopup>
            </MapMarker>
          );
        })}
      </MapGL>

      {/* Legend */}
      <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg border bg-popover/90 px-3 py-2 text-[11px] shadow">
        <div className="mb-1 font-medium text-foreground">图例</div>
        <div className="flex flex-col gap-1">
          {(
            [
              ["起点", ROLE_COLOR.origin],
              ["终点", ROLE_COLOR.dest],
              [TIER_LABELS.station, TIER_COLORS.station],
              [TIER_LABELS.local, TIER_COLORS.local],
              [TIER_LABELS.city, TIER_COLORS.city],
              [TIER_LABELS.hub, TIER_COLORS.hub],
              ...(realRoute && realRoute.path.length > 1
                ? ([["真实道路对比", REAL_ROUTE_COLOR]] as [string, string][])
                : []),
            ] as [string, string][]
          ).map(([label, c]) => (
            <div key={label} className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full border border-white"
                style={{ background: c }}
              />
              <span className="text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Drag hint */}
      <div className="pointer-events-none absolute right-3 bottom-3 hidden rounded-md border bg-popover/80 px-2 py-1 text-[10px] text-muted-foreground shadow md:block">
        提示：可拖拽标记调整坐标
      </div>
    </div>
  );
}
