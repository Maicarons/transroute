import { useState } from "react";
import { Plus, Trash2, Link2, Zap } from "lucide-react";
import { useLogiStore } from "@/store/useLogiStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MODE_COLORS,
  MODE_LABELS,
  type TransportMode,
} from "@/lib/types";
import { RefreshCw } from "lucide-react";

export function EdgeEditor() {
  const nodes = useLogiStore((s) => s.nodes);
  const edges = useLogiStore((s) => s.edges);
  const addEdge = useLogiStore((s) => s.addEdge);
  const deleteEdge = useLogiStore((s) => s.deleteEdge);
  const updateEdge = useLogiStore((s) => s.updateEdge);
  const autoLink = useLogiStore((s) => s.autoLink);
  const autoConnectTiers = useLogiStore((s) => s.autoConnectTiers);
  const refreshMetrics = useLogiStore((s) => s.refreshMetrics);

  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [mode, setMode] = useState<TransportMode>("road");
  const [k, setK] = useState(2);

  const nameOf = (id: string) =>
    nodes.find((n) => n.id === id)?.name ?? "未知";

  function submitAdd() {
    if (!from || !to || from === to) return;
    addEdge(from, to, mode);
    setTo("");
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border bg-muted/30 p-3">
        <div className="mb-2 flex items-center gap-1.5 text-sm font-medium">
          <Plus className="h-4 w-4" /> 新增连接
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">起点</Label>
            <Select value={from} onValueChange={setFrom}>
              <SelectTrigger>
                <SelectValue placeholder="选择" />
              </SelectTrigger>
              <SelectContent>
                {nodes.map((n) => (
                  <SelectItem key={n.id} value={n.id}>
                    {n.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">终点</Label>
            <Select
              value={to}
              onValueChange={setTo}
              disabled={!from}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择" />
              </SelectTrigger>
              <SelectContent>
                {nodes
                  .filter((n) => n.id !== from)
                  .map((n) => (
                    <SelectItem key={n.id} value={n.id}>
                      {n.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-2 space-y-1">
          <Label className="text-xs">运输方式</Label>
          <Select
            value={mode}
            onValueChange={(v) => setMode(v as TransportMode)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(MODE_LABELS) as TransportMode[]).map((m) => (
                <SelectItem key={m} value={m}>
                  {MODE_LABELS[m]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          size="sm"
          className="mt-3 w-full"
          disabled={!from || !to}
          onClick={submitAdd}
        >
          添加连接
        </Button>
      </div>

      <div className="space-y-2">
        <Button
          size="sm"
          className="w-full"
          onClick={autoConnectTiers}
          disabled={nodes.length < 2}
        >
          <Zap className="h-4 w-4" /> 按层级自动组网（站点→中心→城市→枢纽）
        </Button>
        <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-3">
          <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="flex-1">
            <div className="text-sm font-medium">扁平最近邻</div>
            <div className="text-[11px] text-muted-foreground">
              为每个节点连接最近的 {k} 个节点
            </div>
          </div>
          <Input
            type="number"
            min={1}
            max={5}
            value={k}
            onChange={(e) =>
              setK(Math.max(1, Math.min(5, parseInt(e.target.value) || 1)))
            }
            className="h-8 w-14"
          />
          <Button
            size="sm"
            variant="secondary"
            onClick={() => autoLink(k)}
          >
            生成
          </Button>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="w-full"
          onClick={refreshMetrics}
          disabled={edges.length === 0}
        >
          <RefreshCw className="h-4 w-4" /> 刷新真实里程（OSRM 路网）
        </Button>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>连接列表</span>
          <span>{edges.length} 条</span>
        </div>
        {edges.length === 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground">
            暂无连接，请新增或自动生成。
          </p>
        )}
        {edges.map((e) => (
          <div
            key={e.id}
            className="flex items-center gap-2 rounded-lg border p-2 text-sm"
          >
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: MODE_COLORS[e.mode] }}
            />
            <span className="truncate">
              {nameOf(e.from)} <span className="text-muted-foreground">→</span>{" "}
              {nameOf(e.to)}
            </span>
            <Badge variant="outline" className="text-[10px]">
              {MODE_LABELS[e.mode]}
            </Badge>
            <Badge
              variant="outline"
              className="text-[10px]"
              style={
                e.real === true
                  ? { color: "#22c55e", borderColor: "#22c55e66" }
                  : { color: "#f59e0b", borderColor: "#f59e0b66" }
              }
            >
              {e.real === true
                ? e.distanceKm != null
                  ? `真实 ${Math.round(e.distanceKm)}km`
                  : "真实"
                : "估算"}
            </Badge>
            <div className="ml-auto flex items-center gap-1.5">
              <Switch
                checked={e.active}
                onCheckedChange={(v) => updateEdge(e.id, { active: v })}
                aria-label="启用"
              />
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-destructive"
                onClick={() => deleteEdge(e.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
