import { useMemo, useState, type ElementType, type CSSProperties } from "react";
import {
  Route,
  Coins,
  Clock,
  GitBranch,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  MapPin,
  Loader2,
} from "lucide-react";
import { useLogiStore } from "@/store/useLogiStore";
import { computeAllAlgorithms } from "@/lib/graph";
import { formatDistance, formatCost, formatHours } from "@/lib/geo";
import { amapDirection } from "@/lib/amap";
import { osrmRoute, OSRM_PUBLIC_BASE, OSRM_LOCAL_BASE } from "@/lib/osrm";
import {
  ALGORITHM_LABELS,
  ALGORITHM_COLORS,
  MODE_LABELS,
  MODE_COLORS,
  type Algorithm,
  type RealRoute,
  type RouteResult,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type MetricKey = "distance" | "cost" | "time";

const METRIC_META: Record<
  MetricKey,
  {
    label: string;
    get: (r: RouteResult) => number;
    fmt: (v: number) => string;
  }
> = {
  distance: {
    label: "总距离",
    get: (r) => r.totalDistance,
    fmt: formatDistance,
  },
  cost: { label: "总成本", get: (r) => r.totalCost, fmt: formatCost },
  time: { label: "总时效", get: (r) => r.totalTime, fmt: formatHours },
};

const METRIC_KEYS: MetricKey[] = ["distance", "cost", "time"];

const ALG_ORDER: Algorithm[] = ["shortest", "lowestCost", "fastest"];

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: ElementType;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <Card className="bg-card/60">
      <CardContent className="flex items-center gap-3 p-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
          style={{ background: `${accent}1a`, color: accent }}
        >
          <Icon className="h-[18px] w-[18px]" />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] text-muted-foreground">{label}</div>
          <div className="truncate text-base font-semibold tabular-nums">
            {value}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ComparisonChart({
  all,
  metric,
  onPick,
  active,
}: {
  all: Record<Algorithm, RouteResult>;
  metric: MetricKey;
  onPick: (a: Algorithm) => void;
  active: Algorithm;
}) {
  const meta = METRIC_META[metric];
  const W = 320;
  const H = 168;
  const padTop = 16;
  const padBottom = 30;
  const chartH = H - padTop - padBottom;
  const bw = 40;
  const gap = 30;

  const bars = ALG_ORDER.map((a) => ({
    a,
    v: meta.get(all[a]),
    found: all[a].found,
  }));
  const max = Math.max(...bars.map((b) => (b.found ? b.v : 0)), 1);
  const totalW = ALG_ORDER.length * bw + (ALG_ORDER.length - 1) * gap;
  const startX = (W - totalW) / 2;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      <line
        x1={12}
        y1={padTop + chartH}
        x2={W - 12}
        y2={padTop + chartH}
        stroke="hsl(var(--border))"
        strokeWidth={1}
      />
      {bars.map((b, i) => {
        const color = ALGORITHM_COLORS[b.a];
        const x = startX + i * (bw + gap);
        const h = b.found ? Math.max(2, (b.v / max) * chartH) : 0;
        const y = padTop + chartH - h;
        const isActive = b.a === active;
        return (
          <g
            key={b.a}
            className="cursor-pointer"
            onClick={() => onPick(b.a)}
          >
            {isActive && (
              <rect
                x={x - 4}
                y={padTop - 4}
                width={bw + 8}
                height={chartH + 8}
                rx={8}
                fill="none"
                stroke={color}
                strokeWidth={1.5}
                opacity={0.6}
              />
            )}
            <rect
              x={x}
              y={y}
              width={bw}
              height={h}
              rx={5}
              fill={color}
              opacity={b.found ? 0.9 : 0.25}
            />
            <text
              x={x + bw / 2}
              y={y - 5}
              textAnchor="middle"
              className="fill-foreground text-[10px] font-semibold tabular-nums"
            >
              {b.found ? meta.fmt(b.v) : "—"}
            </text>
            <text
              x={x + bw / 2}
              y={padTop + chartH + 16}
              textAnchor="middle"
              className="fill-muted-foreground text-[10px]"
            >
              {ALGORITHM_LABELS[b.a]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function ComparisonCard({
  alg,
  result,
  active,
  onPick,
}: {
  alg: Algorithm;
  result: RouteResult;
  active: boolean;
  onPick: (a: Algorithm) => void;
}) {
  const color = ALGORITHM_COLORS[alg];
  return (
    <button
      onClick={() => onPick(alg)}
      className={cn(
        "flex flex-col gap-1.5 rounded-lg border bg-card/60 p-2.5 text-left transition-colors hover:bg-accent/40",
        active && "ring-2 ring-offset-1 ring-offset-background"
      )}
      style={active ? ({ ["--tw-ring-color" as string]: color } as CSSProperties) : undefined}
    >
      <div className="flex items-center gap-1.5">
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ background: color }}
        />
        <span className="text-xs font-semibold">{ALGORITHM_LABELS[alg]}</span>
        {!result.found && (
          <span className="ml-auto text-[10px] text-muted-foreground">
            无路径
          </span>
        )}
      </div>
      <div className="grid grid-cols-3 gap-1 text-[10px] text-muted-foreground">
        <div>
          <div>距离</div>
          <div className="text-foreground tabular-nums">
            {result.found ? formatDistance(result.totalDistance) : "—"}
          </div>
        </div>
        <div>
          <div>成本</div>
          <div className="text-foreground tabular-nums">
            {result.found ? formatCost(result.totalCost) : "—"}
          </div>
        </div>
        <div>
          <div>时效</div>
          <div className="text-foreground tabular-nums">
            {result.found ? formatHours(result.totalTime) : "—"}
          </div>
        </div>
      </div>
    </button>
  );
}

export function ResultsPanel() {
  const nodes = useLogiStore((s) => s.nodes);
  const edges = useLogiStore((s) => s.edges);
  const settings = useLogiStore((s) => s.settings);
  const originId = useLogiStore((s) => s.originId);
  const destId = useLogiStore((s) => s.destId);
  const result = useLogiStore((s) => s.result);
  const realRoute = useLogiStore((s) => s.realRoute);
  const setRealRoute = useLogiStore((s) => s.setRealRoute);
  const setAlgorithm = useLogiStore((s) => s.setAlgorithm);
  const setRouteSource = useLogiStore((s) => s.setRouteSource);

  const [metric, setMetric] = useState<MetricKey>("distance");
  const [fetchingReal, setFetchingReal] = useState(false);
  const [realErr, setRealErr] = useState<string | null>(null);

  const nodeMap = useMemo(
    () => new Map(nodes.map((n) => [n.id, n])),
    [nodes]
  );

  const originNode = originId ? nodeMap.get(originId) : undefined;
  const destNode = destId ? nodeMap.get(destId) : undefined;

  async function fetchRealRoute() {
    if (!originNode || !destNode) return;
    setFetchingReal(true);
    setRealErr(null);
    try {
      const o: [number, number] = [originNode.lng, originNode.lat];
      const d: [number, number] = [destNode.lng, destNode.lat];
      const raw =
        settings.routeSource === "amap"
          ? await amapDirection(o, d, settings.amapKey, "driving")
          : await osrmRoute(o, d, {
              baseUrl:
                settings.routeSource === "osrmLocal"
                  ? OSRM_LOCAL_BASE
                  : OSRM_PUBLIC_BASE,
            });
      const r: RealRoute = {
        path: raw.path,
        distanceKm: raw.distanceKm,
        durationHours: raw.durationHours,
        source: settings.routeSource,
      };
      setRealRoute(r);
    } catch (e) {
      setRealErr(e instanceof Error ? e.message : "请求失败");
    } finally {
      setFetchingReal(false);
    }
  }

  const all = useMemo(
    () =>
      computeAllAlgorithms(nodes, edges, settings, originId, destId),
    [nodes, edges, settings, originId, destId]
  );

  const nameOf = (id: string) => nodeMap.get(id)?.name ?? id;

  const requireEndpoints = !originId || !destId;
  const noPath = !requireEndpoints && !result?.found;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="flex-row items-center gap-2 space-y-0 p-4">
          <Route className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm">优化结果</CardTitle>
          <Badge
            variant="outline"
            className="ml-auto"
            style={{
              color: ALGORITHM_COLORS[settings.algorithm],
              borderColor: `${ALGORITHM_COLORS[settings.algorithm]}66`,
            }}
          >
            {ALGORITHM_LABELS[settings.algorithm]}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4 p-4 pt-0">
          {requireEndpoints ? (
            <div className="flex items-start gap-2 rounded-lg border border-dashed bg-muted/30 p-3 text-sm text-muted-foreground">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>请在顶部选择起点与终点，或单击地图上的节点弹出设置。</span>
            </div>
          ) : noPath ? (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                未找到可行路径，请检查网络连接是否已启用（参数面板）或增建中转连线。
              </span>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2.5">
                <StatCard
                  icon={Route}
                  label="总距离"
                  value={formatDistance(result!.totalDistance)}
                  accent="#38bdf8"
                />
                <StatCard
                  icon={Coins}
                  label="总成本"
                  value={formatCost(result!.totalCost)}
                  accent="#34d399"
                />
                <StatCard
                  icon={Clock}
                  label="总时效"
                  value={formatHours(result!.totalTime)}
                  accent="#f59e0b"
                />
                <StatCard
                  icon={GitBranch}
                  label="中转段数"
                  value={`${result!.segments.length} 段`}
                  accent="#a78bfa"
                />
              </div>

              <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                <span>
                  真实路网里程占比{" "}
                  <span className="font-medium text-foreground">
                    {Math.round((result!.realRatio ?? 0) * 100)}%
                  </span>
                </span>
                <span>
                  起终点理论直线 {formatDistance(result!.directDistance)}
                  （仅迂回参考）
                </span>
              </div>

              {/* Route path chips */}
              <div>
                <div className="mb-1.5 text-[11px] font-medium text-muted-foreground">
                  路径序列
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {result!.path.map((id, i) => (
                    <span key={id} className="flex items-center gap-1.5">
                      <Badge
                        variant="secondary"
                        className="font-medium"
                      >
                        {nameOf(id)}
                      </Badge>
                      {i < result!.segments.length && (
                        <span className="flex items-center gap-1">
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <span
                            className="rounded px-1 py-0.5 text-[9px] font-medium text-white"
                            style={{
                              background:
                                MODE_COLORS[result!.segments[i].mode],
                            }}
                          >
                            {MODE_LABELS[result!.segments[i].mode]}
                          </span>
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              </div>

              {/* Segment breakdown */}
              <div>
                <div className="mb-1.5 text-[11px] font-medium text-muted-foreground">
                  分段明细
                </div>
                <div className="space-y-1">
                  {result!.segments.map((seg, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 rounded-md bg-muted/30 px-2.5 py-1.5 text-xs"
                    >
                      <span
                        className="rounded px-1.5 py-0.5 text-[9px] font-medium text-white"
                        style={{ background: MODE_COLORS[seg.mode] }}
                      >
                        {MODE_LABELS[seg.mode]}
                      </span>
                      <span
                        className="rounded px-1 py-0.5 text-[9px] font-medium"
                        style={
                          seg.real
                            ? { color: "#22c55e", border: "1px solid #22c55e66" }
                            : { color: "#f59e0b", border: "1px solid #f59e0b66" }
                        }
                      >
                        {seg.real ? "真实" : "估算"}
                      </span>
                      <span className="min-w-0 flex-1 truncate">
                        {nameOf(seg.fromId)}
                        <ArrowRight className="mx-1 inline h-3 w-3 text-muted-foreground" />
                        {nameOf(seg.toId)}
                      </span>
                      <span className="tabular-nums text-muted-foreground">
                        {formatDistance(seg.distanceKm)}
                      </span>
                      <span className="tabular-nums text-muted-foreground">
                        {formatCost(seg.cost)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Real road route: OSRM (free) / AMap */}
      {!!originNode && !!destNode && (
        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0 p-4">
            <MapPin className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm">真实道路</CardTitle>
            {realRoute && (
              <Badge
                variant="outline"
                className="ml-1"
                style={{ color: "#ec4899", borderColor: "#ec489966" }}
              >
                已叠加到地图
              </Badge>
            )}
            <div className="ml-auto flex items-center rounded-md border p-0.5">
              <button
                onClick={() => setRouteSource("osrmPublic")}
                className={cn(
                  "rounded px-2 py-0.5 text-[11px] font-medium transition-colors",
                  settings.routeSource === "osrmPublic"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                OSRM·公共
              </button>
              <button
                onClick={() => setRouteSource("osrmLocal")}
                className={cn(
                  "rounded px-2 py-0.5 text-[11px] font-medium transition-colors",
                  settings.routeSource === "osrmLocal"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                OSRM·本地
              </button>
              <button
                onClick={() => setRouteSource("amap")}
                className={cn(
                  "rounded px-2 py-0.5 text-[11px] font-medium transition-colors",
                  settings.routeSource === "amap"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                高德
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 p-4 pt-0">
            <p className="text-xs text-muted-foreground">
              {settings.routeSource === "amap" ? (
                <>
                  基于高德地图真实路网，从「{originNode?.name}」到「
                  {destNode?.name}」的实际驾车道路（坐标已纠偏对齐 OSM 底图）。
                </>
              ) : settings.routeSource === "osrmLocal" ? (
                <>
                  基于本地自部署的 OpenStreetMap 路网（OSRM），从「
                  {originNode?.name}」到「{destNode?.name}
                  」的实际驾车道路。需先按部署说明启动本地 OSRM（docker compose up
                  -d）；未启动时请求会失败。
                </>
              ) : (
                <>
                  基于 OpenStreetMap 路网（OSRM 公共服务器，免费免 Key），从「
                  {originNode?.name}」到「{destNode?.name}
                  」的实际驾车道路（WGS84 坐标，与底图天然对齐）。
                </>
              )}
            </p>

            {realRoute && (
              <div className="grid grid-cols-2 gap-2.5">
                <StatCard
                  icon={Route}
                  label="真实距离"
                  value={formatDistance(realRoute.distanceKm)}
                  accent="#ec4899"
                />
                <StatCard
                  icon={Clock}
                  label="真实耗时"
                  value={formatHours(realRoute.durationHours)}
                  accent="#ec4899"
                />
              </div>
            )}

            {realErr && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
                {realErr}
              </div>
            )}

            {settings.routeSource === "amap" && !settings.amapKey ? (
              <p className="text-xs text-muted-foreground">
                使用高德需先在「参数配置 → 地理编码数据源」填入高德 Web服务
                Key。
              </p>
            ) : (
              <div className="flex gap-2">
                <Button
                  onClick={fetchRealRoute}
                  disabled={fetchingReal}
                  size="sm"
                >
                  {fetchingReal ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <MapPin className="h-4 w-4" />
                  )}
                  {realRoute ? "重新获取" : "获取真实道路"}
                </Button>
                {realRoute && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRealRoute(null)}
                  >
                    清除
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Algorithm comparison */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 p-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm">算法对比</CardTitle>
          </div>
          <div className="flex items-center rounded-md border p-0.5">
            {METRIC_KEYS.map((k) => (
              <button
                key={k}
                onClick={() => setMetric(k)}
                className={cn(
                  "rounded px-2 py-0.5 text-[11px] font-medium transition-colors",
                  metric === k
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {METRIC_META[k].label}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-3 p-4 pt-0">
          <ComparisonChart
            all={all}
            metric={metric}
            onPick={setAlgorithm}
            active={settings.algorithm}
          />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {ALG_ORDER.map((a) => (
              <ComparisonCard
                key={a}
                alg={a}
                result={all[a]}
                active={settings.algorithm === a}
                onPick={setAlgorithm}
              />
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground">
            点击柱状图或卡片可切换当前优化目标。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
