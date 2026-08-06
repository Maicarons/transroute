import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Minus, RotateCcw } from "lucide-react";
import { useLogiStore } from "@/store/useLogiStore";
import { cn } from "@/lib/utils";
import {
  ALGORITHM_COLORS,
  TIER_COLORS,
  type LogiNode,
  type NodeTier,
} from "@/lib/types";
import { Button } from "@/components/ui/button";

const W = 640;
const H = 440;
const PAD = 56;

const ROLE_COLOR: Record<string, string> = {
  origin: "#22c55e",
  dest: "#ef4444",
  station: TIER_COLORS.station,
  local: TIER_COLORS.local,
  city: TIER_COLORS.city,
  hub: TIER_COLORS.hub,
};

type View = { scale: number; tx: number; ty: number };

function clientToSvg(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number
): { x: number; y: number } {
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return { x: 0, y: 0 };
  const p = pt.matrixTransform(ctm.inverse());
  return { x: p.x, y: p.y };
}

export function TopologyGraph() {
  const nodes = useLogiStore((s) => s.nodes);
  const edges = useLogiStore((s) => s.edges);
  const originId = useLogiStore((s) => s.originId);
  const destId = useLogiStore((s) => s.destId);
  const result = useLogiStore((s) => s.result);
  const selectedNodeId = useLogiStore((s) => s.selectedNodeId);
  const setSelectedNode = useLogiStore((s) => s.setSelectedNode);
  const algorithm = useLogiStore((s) => s.settings.algorithm);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const [view, setView] = useState<View>({ scale: 1, tx: 0, ty: 0 });
  const [dragging, setDragging] = useState(false);

  const layout = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    if (nodes.length === 0) return map;
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
    const spanLng = maxLng - minLng || 1;
    const spanLat = maxLat - minLat || 1;
    for (const n of nodes) {
      const x = PAD + ((n.lng - minLng) / spanLng) * (W - 2 * PAD);
      const y = H - PAD - ((n.lat - minLat) / spanLat) * (H - 2 * PAD);
      map.set(n.id, { x, y });
    }
    return map;
  }, [nodes]);

  const pathEdgeKeys = useMemo(() => {
    const set = new Set<string>();
    if (result?.found) {
      for (let i = 0; i < result.path.length - 1; i++) {
        const a = result.path[i];
        const b = result.path[i + 1];
        set.add(a < b ? `${a}|${b}` : `${b}|${a}`);
      }
    }
    return set;
  }, [result]);

  const roleOf = (n: LogiNode): "origin" | "dest" | NodeTier => {
    if (n.id === originId) return "origin";
    if (n.id === destId) return "dest";
    return n.tier;
  };

  // 滚轮缩放（以光标为锚点），原生非被动监听以便 preventDefault 阻止页面滚动
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { x, y } = clientToSvg(svg, e.clientX, e.clientY);
      const factor = Math.exp(-e.deltaY * 0.0015);
      setView((v) => {
        const newScale = Math.min(6, Math.max(0.5, v.scale * factor));
        const k = newScale / v.scale;
        return {
          scale: newScale,
          tx: x - k * (x - v.tx),
          ty: y - k * (y - v.ty),
        };
      });
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, []);

  // 背景拖拽平移（在 window 上跟踪，避免干扰节点点击）
  function onBgPointerDown(e: React.PointerEvent) {
    const svg = svgRef.current;
    if (!svg) return;
    e.preventDefault();
    const start = clientToSvg(svg, e.clientX, e.clientY);
    const startTx = view.tx;
    const startTy = view.ty;
    setDragging(true);
    const move = (ev: PointerEvent) => {
      const p = clientToSvg(svg, ev.clientX, ev.clientY);
      setView((v) => ({
        ...v,
        tx: startTx + (p.x - start.x),
        ty: startTy + (p.y - start.y),
      }));
    };
    const up = () => {
      setDragging(false);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  function zoomBy(f: number) {
    setView((v) => {
      const newScale = Math.min(6, Math.max(0.5, v.scale * f));
      const k = newScale / v.scale;
      const cx = W / 2;
      const cy = H / 2;
      return {
        scale: newScale,
        tx: cx - k * (cx - v.tx),
        ty: cy - k * (cy - v.ty),
      };
    });
  }

  function resetView() {
    setView({ scale: 1, tx: 0, ty: 0 });
  }

  if (nodes.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
        暂无节点
      </div>
    );
  }

  return (
    <div className="relative w-full">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className={cn(
          "h-auto w-full touch-none select-none",
          dragging ? "cursor-grabbing" : "cursor-grab"
        )}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <marker
            id="arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M0,0 L10,5 L0,10 z" fill={ALGORITHM_COLORS[algorithm]} />
          </marker>
        </defs>

        <g transform={`translate(${view.tx} ${view.ty}) scale(${view.scale})`}>
          {/* 背景（承接平移，透明） */}
          <rect
            x={0}
            y={0}
            width={W}
            height={H}
            fill="transparent"
            onPointerDown={onBgPointerDown}
          />

          {/* base edges */}
          {edges
            .filter((e) => e.active)
            .map((e) => {
              const a = layout.get(e.from);
              const b = layout.get(e.to);
              if (!a || !b) return null;
              const key =
                e.from < e.to ? `${e.from}|${e.to}` : `${e.to}|${e.from}`;
              const onPath = pathEdgeKeys.has(key);
              if (onPath) return null;
              return (
                <line
                  key={e.id}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke="hsl(var(--border))"
                  strokeWidth={1}
                />
              );
            })}

          {/* path edges (highlighted) */}
          {result?.found &&
            result.path.slice(0, -1).map((id, i) => {
              const a = layout.get(id);
              const b = layout.get(result.path[i + 1]);
              if (!a || !b) return null;
              return (
                <line
                  key={`p${i}`}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={ALGORITHM_COLORS[algorithm]}
                  strokeWidth={3}
                  strokeLinecap="round"
                  markerEnd="url(#arrow)"
                  opacity={0.9}
                />
              );
            })}

          {/* nodes */}
          {nodes.map((n) => {
            const p = layout.get(n.id);
            if (!p) return null;
            const role = roleOf(n);
            const color = ROLE_COLOR[role];
            const isSel = selectedNodeId === n.id;
            const r = role === "origin" || role === "dest" ? 9 : 6.5;
            const labelLeft = p.x > W - PAD - 60;
            return (
              <g
                key={n.id}
                className="cursor-pointer"
                onClick={() => setSelectedNode(isSel ? null : n.id)}
              >
                {isSel && (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={r + 5}
                    fill="none"
                    stroke={color}
                    strokeWidth={1.5}
                    opacity={0.5}
                  />
                )}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={r}
                  fill={color}
                  stroke="white"
                  strokeWidth={2}
                />
                <text
                  x={labelLeft ? p.x - r - 6 : p.x + r + 6}
                  y={p.y + 4}
                  textAnchor={labelLeft ? "end" : "start"}
                  className="fill-foreground text-[12px] font-medium"
                >
                  {n.name}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* 缩放控制 */}
      <div className="absolute right-2 top-2 flex flex-col gap-1">
        <Button
          size="icon"
          variant="secondary"
          className="h-7 w-7 shadow"
          onClick={() => zoomBy(1.25)}
          aria-label="放大"
        >
          <Plus className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="secondary"
          className="h-7 w-7 shadow"
          onClick={() => zoomBy(0.8)}
          aria-label="缩小"
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="secondary"
          className="h-7 w-7 shadow"
          onClick={resetView}
          aria-label="复位"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      <div className="mt-1 flex items-center justify-center gap-3 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ background: ALGORITHM_COLORS[algorithm] }}
          />
          最优路径
        </span>
        <span>滚轮缩放 · 拖拽平移 · 点击节点可在地图高亮</span>
      </div>
    </div>
  );
}
