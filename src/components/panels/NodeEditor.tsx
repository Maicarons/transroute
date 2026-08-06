import { useMemo, useState } from "react";
import {
  Plus,
  Trash2,
  Pencil,
  Flag,
  MapPin,
  Check,
  X,
  Search,
  Loader2,
} from "lucide-react";
import { useLogiStore } from "@/store/useLogiStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  type LogiNode,
  type NodeTier,
  TIER_LABELS,
  TIER_COLORS,
} from "@/lib/types";
import { type GeoResult, geocode, searchCatalog } from "@/lib/geocode";

const ROLE_COLOR: Record<string, string> = {
  origin: "#22c55e",
  dest: "#ef4444",
  station: TIER_COLORS.station,
  local: TIER_COLORS.local,
  city: TIER_COLORS.city,
  hub: TIER_COLORS.hub,
};

const TIER_LIST: NodeTier[] = ["station", "local", "city", "hub"];

function shortName(r: GeoResult): string {
  if (r.source === "osm") return r.name.split(/[,，]/)[0].trim() || r.name;
  return r.name;
}

function ResultRow({
  r,
  onAdd,
}: {
  r: GeoResult;
  onAdd: (r: GeoResult) => void;
}) {
  const tag =
    r.source === "osm" ? "OSM" : r.source === "amap" ? "高德" : "城市库";
  return (
    <button
      onClick={() => onAdd(r)}
      className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-accent"
    >
      <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="flex-1 truncate">{shortName(r)}</span>
      <span className="tabular-nums text-[10px] text-muted-foreground">
        {r.lat.toFixed(2)}, {r.lng.toFixed(2)}
      </span>
      <Badge variant="outline" className="text-[9px]">
        {tag}
      </Badge>
    </button>
  );
}

interface FormState {
  name: string;
  type: NodeTier;
  lng: string;
  lat: string;
  handlingFee: string;
  handlingTime: string;
}

const EMPTY: FormState = {
  name: "",
  type: "local",
  lng: "",
  lat: "",
  handlingFee: "0",
  handlingTime: "0",
};

export function NodeEditor() {
  const nodes = useLogiStore((s) => s.nodes);
  const originId = useLogiStore((s) => s.originId);
  const destId = useLogiStore((s) => s.destId);
  const selectedNodeId = useLogiStore((s) => s.selectedNodeId);
  const settings = useLogiStore((s) => s.settings);
  const addNode = useLogiStore((s) => s.addNode);
  const updateNode = useLogiStore((s) => s.updateNode);
  const deleteNode = useLogiStore((s) => s.deleteNode);
  const loadExample = useLogiStore((s) => s.loadExample);
  const setOrigin = useLogiStore((s) => s.setOrigin);
  const setDest = useLogiStore((s) => s.setDest);
  const setSelectedNode = useLogiStore((s) => s.setSelectedNode);

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState>(EMPTY);

  // 地理编码搜索
  const [query, setQuery] = useState("");
  const [liveResults, setLiveResults] = useState<GeoResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const catalogHits = useMemo(() => searchCatalog(query), [query]);

  const roleOf = (n: LogiNode) => {
    if (n.id === originId) return "origin" as const;
    if (n.id === destId) return "dest" as const;
    return n.tier;
  };

  async function runSearch() {
    const q = query.trim();
    if (!q) {
      setLiveResults([]);
      return;
    }
    setLoading(true);
    setGeoError(null);
    try {
      const live = await geocode(q, {
        provider: settings.geocoder,
        amapKey: settings.amapKey,
      });
      setLiveResults(live);
    } catch (e) {
      setGeoError((e as Error).message);
      setLiveResults([]);
    } finally {
      setLoading(false);
    }
  }

  function addFromResult(r: GeoResult) {
    addNode({
      name: shortName(r),
      tier: "local",
      lng: r.lng,
      lat: r.lat,
      handlingFee: 0,
      handlingTime: 0,
    });
    setQuery("");
    setLiveResults([]);
  }

  function submitAdd() {
    const lng = parseFloat(form.lng);
    const lat = parseFloat(form.lat);
    if (!form.name.trim() || isNaN(lng) || isNaN(lat)) return;
    addNode({
      name: form.name.trim(),
      tier: form.type,
      lng,
      lat,
      handlingFee: parseFloat(form.handlingFee) || 0,
      handlingTime: parseFloat(form.handlingTime) || 0,
    });
    setForm(EMPTY);
    setShowAdd(false);
  }

  function submitEdit() {
    if (!editingId) return;
    const lng = parseFloat(editForm.lng);
    const lat = parseFloat(editForm.lat);
    if (!editForm.name.trim() || isNaN(lng) || isNaN(lat)) return;
    updateNode(editingId, {
      name: editForm.name.trim(),
      tier: editForm.type,
      lng,
      lat,
      handlingFee: parseFloat(editForm.handlingFee) || 0,
      handlingTime: parseFloat(editForm.handlingTime) || 0,
    });
    setEditingId(null);
  }

  function startEdit(n: LogiNode) {
    setEditingId(n.id);
    setEditForm({
      name: n.name,
      type: n.tier,
      lng: String(n.lng),
      lat: String(n.lat),
      handlingFee: String(n.handlingFee),
      handlingTime: String(n.handlingTime),
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          共 {nodes.length} 个节点
        </span>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={loadExample}>
            载入示例
          </Button>
          <Button
            size="sm"
            variant={showAdd ? "secondary" : "default"}
            onClick={() => setShowAdd((v) => !v)}
          >
            <Plus className="h-4 w-4" /> 添加节点
          </Button>
        </div>
      </div>

      {showAdd && (
        <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
          {/* 真实地理编码搜索 */}
          <div className="space-y-1">
            <Label className="text-xs">按名称搜索真实地点</Label>
            <div className="flex gap-2">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") runSearch();
                }}
                placeholder="如：杭州、上海浦东、Chengdu"
              />
              <Button
                size="sm"
                variant="secondary"
                onClick={runSearch}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              数据源：{settings.geocoder === "amap" ? "高德地图" : "OpenStreetMap"}（可在「参数」页切换）
            </p>
            {geoError && (
              <p className="text-[10px] text-destructive">
                实时搜索失败：{geoError}（已回退到城市库）
              </p>
            )}
          </div>

          {(liveResults.length > 0 || catalogHits.length > 0) && (
            <div className="max-h-44 space-y-1 overflow-y-auto rounded-md border bg-background/60 p-1">
              {liveResults.map((r, i) => (
                <ResultRow key={"l" + i} r={r} onAdd={addFromResult} />
              ))}
              {catalogHits.map((r, i) => (
                <ResultRow key={"c" + i} r={r} onAdd={addFromResult} />
              ))}
              {liveResults.length === 0 && catalogHits.length === 0 && (
                <p className="p-2 text-center text-xs text-muted-foreground">
                  无匹配城市
                </p>
              )}
            </div>
          )}

          <Separator className="my-1" />

          <p className="text-[11px] font-medium text-muted-foreground">
            手动录入（中转枢纽 / 精确坐标）
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">名称</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="如：杭州"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">类型</Label>
              <Select
                value={form.type}
                onValueChange={(v) =>
                  setForm({ ...form, type: v as NodeTier })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIER_LIST.map((t) => (
                    <SelectItem key={t} value={t}>
                      {TIER_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">经度</Label>
              <Input
                type="number"
                step="0.001"
                value={form.lng}
                onChange={(e) => setForm({ ...form, lng: e.target.value })}
                placeholder="116.40"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">纬度</Label>
              <Input
                type="number"
                step="0.001"
                value={form.lat}
                onChange={(e) => setForm({ ...form, lat: e.target.value })}
                placeholder="39.90"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">处理费(元)</Label>
              <Input
                type="number"
                value={form.handlingFee}
                onChange={(e) =>
                  setForm({ ...form, handlingFee: e.target.value })
                }
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">处理(h)</Label>
              <Input
                type="number"
                value={form.handlingTime}
                onChange={(e) =>
                  setForm({ ...form, handlingTime: e.target.value })
                }
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowAdd(false)}
            >
              取消
            </Button>
            <Button size="sm" onClick={submitAdd}>
              保存
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {nodes.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            暂无节点。点击「添加节点」，按名称搜索真实地点或从城市库选取。
          </p>
        )}
        {nodes.map((n) => {
          const role = roleOf(n);
          const color = ROLE_COLOR[role];
          const isSel = selectedNodeId === n.id;
          if (editingId === n.id) {
            return (
              <div
                key={n.id}
                className="space-y-2 rounded-lg border border-primary/40 bg-muted/30 p-3"
              >
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">名称</Label>
                    <Input
                      value={editForm.name}
                      onChange={(e) =>
                        setEditForm({ ...editForm, name: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">类型</Label>
                    <Select
                      value={editForm.type}
                      onValueChange={(v) =>
                        setEditForm({ ...editForm, type: v as NodeTier })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIER_LIST.map((t) => (
                          <SelectItem key={t} value={t}>
                            {TIER_LABELS[t]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">经度</Label>
                    <Input
                      type="number"
                      step="0.001"
                      value={editForm.lng}
                      onChange={(e) =>
                        setEditForm({ ...editForm, lng: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">纬度</Label>
                    <Input
                      type="number"
                      step="0.001"
                      value={editForm.lat}
                      onChange={(e) =>
                        setEditForm({ ...editForm, lat: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">处理费(元)</Label>
                    <Input
                      type="number"
                      value={editForm.handlingFee}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          handlingFee: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">处理(h)</Label>
                    <Input
                      type="number"
                      value={editForm.handlingTime}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          handlingTime: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingId(null)}
                  >
                    <X className="h-4 w-4" /> 取消
                  </Button>
                  <Button size="sm" onClick={submitEdit}>
                    <Check className="h-4 w-4" /> 保存
                  </Button>
                </div>
              </div>
            );
          }
          return (
            <div
              key={n.id}
              onClick={() => setSelectedNode(isSel ? null : n.id)}
              className={cn(
                "cursor-pointer rounded-lg border p-2.5 transition-colors",
                isSel
                  ? "border-primary bg-primary/10"
                  : "hover:bg-muted/50"
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-3 w-3 shrink-0 rounded-full border border-white"
                  style={{ background: color }}
                />
                <span className="font-medium">{n.name}</span>
                <Badge variant="outline" className="text-[10px]">
                  {TIER_LABELS[n.tier]}
                </Badge>
                <span className="ml-auto text-[11px] tabular-nums text-muted-foreground">
                  {n.lat.toFixed(2)}, {n.lng.toFixed(2)}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant={role === "origin" ? "default" : "outline"}
                  className="h-7 px-2 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOrigin(n.id);
                  }}
                >
                  <MapPin className="h-3.5 w-3.5" /> 起点
                </Button>
                <Button
                  size="sm"
                  variant={role === "dest" ? "destructive" : "outline"}
                  className="h-7 px-2 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDest(n.id);
                  }}
                >
                  <Flag className="h-3.5 w-3.5" /> 终点
                </Button>
                <div className="ml-auto flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      startEdit(n);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNode(n.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
