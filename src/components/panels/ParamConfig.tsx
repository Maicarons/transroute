import { useState } from "react";
import {
  Download,
  Upload,
  Copy,
  RotateCcw,
  Trash2,
  SlidersHorizontal,
  Check,
} from "lucide-react";
import { useLogiStore } from "@/store/useLogiStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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
  ALGORITHM_COLORS,
  ALGORITHM_LABELS,
  type Algorithm,
  type TransportMode,
} from "@/lib/types";

const ALGOS: Algorithm[] = ["shortest", "lowestCost", "fastest"];
const MODES: TransportMode[] = ["road", "rail", "air", "sea"];

export function ParamConfig() {
  const settings = useLogiStore((s) => s.settings);
  const setAlgorithm = useLogiStore((s) => s.setAlgorithm);
  const setCargoWeight = useLogiStore((s) => s.setCargoWeight);
  const setRate = useLogiStore((s) => s.setRate);
  const toggleArcs = useLogiStore((s) => s.toggleArcs);
  const setAmapKey = useLogiStore((s) => s.setAmapKey);
  const setGeocoder = useLogiStore((s) => s.setGeocoder);
  const resetApp = useLogiStore((s) => s.resetApp);
  const clearAll = useLogiStore((s) => s.clearAll);
  const loadNetwork = useLogiStore((s) => s.loadNetwork);
  const exportNetwork = useLogiStore((s) => s.exportNetwork);

  const [json, setJson] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [copied, setCopied] = useState(false);

  function doExport() {
    setJson(JSON.stringify(exportNetwork(), null, 2));
    setCopied(false);
  }

  async function doCopy() {
    if (!json) doExport();
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard not available */
    }
  }

  function doImport() {
    try {
      const data = JSON.parse(json);
      if (!Array.isArray(data.nodes) || !Array.isArray(data.edges)) {
        throw new Error("格式不正确");
      }
      loadNetwork(data);
    } catch (err) {
      alert("导入失败：" + (err as Error).message);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-xs">优化目标</Label>
        <div className="grid grid-cols-3 gap-1.5">
          {ALGOS.map((a) => {
            const active = settings.algorithm === a;
            return (
              <button
                key={a}
                onClick={() => setAlgorithm(a)}
                className={cn(
                  "rounded-lg border px-2 py-2 text-xs font-medium transition-colors",
                  active
                    ? "text-white"
                    : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/60"
                )}
                style={
                  active ? { background: ALGORITHM_COLORS[a], borderColor: ALGORITHM_COLORS[a] } : undefined
                }
              >
                {ALGORITHM_LABELS[a]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">货量（吨）</Label>
          <span className="text-sm font-medium tabular-nums">
            {settings.cargoWeight.toFixed(1)} t
          </span>
        </div>
        <Slider
          value={[settings.cargoWeight]}
          min={0.5}
          max={100}
          step={0.5}
          onValueChange={([v]) => setCargoWeight(v)}
        />
      </div>

      <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-2.5">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
          <div>
            <div className="text-sm font-medium">显示网络连线</div>
            <div className="text-[11px] text-muted-foreground">
              在地图上绘制全部拓扑连接
            </div>
          </div>
        </div>
        <Switch checked={settings.showArcs} onCheckedChange={toggleArcs} />
      </div>

      <Separator />

      <div className="space-y-2">
        <button
          onClick={() => setShowAdvanced((v) => !v)}
          className="flex w-full items-center justify-between text-sm font-medium"
        >
          <span>运价参数（元/吨·公里 · km/h）</span>
          <span className="text-muted-foreground">
            {showAdvanced ? "收起" : "展开"}
          </span>
        </button>
        {showAdvanced && (
          <div className="space-y-2 rounded-lg border bg-muted/20 p-2.5">
            {MODES.map((m) => (
              <div key={m} className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[11px]">
                    {m === "road"
                      ? "公路费率"
                      : m === "rail"
                      ? "铁路费率"
                      : m === "air"
                      ? "航空费率"
                      : "水运费率"}
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={settings.rates[m].costPerTonKm}
                    onChange={(e) =>
                      setRate(m, {
                        costPerTonKm: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">
                    {m === "road"
                      ? "公路速度"
                      : m === "rail"
                      ? "铁路速度"
                      : m === "air"
                      ? "航空速度"
                      : "水运速度"}
                  </Label>
                  <Input
                    type="number"
                    value={settings.rates[m].speed}
                    onChange={(e) =>
                      setRate(m, { speed: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Separator />

      <div className="space-y-2">
        <Label className="text-xs">地理编码数据源</Label>
        <Select
          value={settings.geocoder}
          onValueChange={(v) => setGeocoder(v as "osm" | "amap")}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="osm">OpenStreetMap (Nominatim)</SelectItem>
            <SelectItem value="amap">高德地图</SelectItem>
          </SelectContent>
        </Select>
        {settings.geocoder === "amap" && (
          <div className="space-y-1">
            <Label className="text-[11px]">高德 Web服务 Key</Label>
            <Input
              value={settings.amapKey}
              onChange={(e) => setAmapKey(e.target.value)}
              placeholder="在 console.amap.com 申请"
            />
            <p className="text-[10px] text-muted-foreground">
              用于实时地理编码与真实路径规划（GCJ-02 自动纠偏为 WGS84）。
            </p>
          </div>
        )}
        <p className="text-[10px] text-muted-foreground">
          默认 OSM Nominatim（免 Key，浏览器直连），也可从「节点」页的真实城市库离线选取。
        </p>
      </div>

      <Separator />

      <div className="space-y-2">
        <Label className="text-xs">数据导入 / 导出（JSON）</Label>
        <Textarea
          value={json}
          onChange={(e) => setJson(e.target.value)}
          placeholder="点击「导出」生成当前网络 JSON，或粘贴 JSON 后「导入」"
          className="h-24 font-mono text-xs"
        />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={doExport}>
            <Download className="h-4 w-4" /> 导出
          </Button>
          <Button size="sm" variant="secondary" onClick={doCopy}>
            {copied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            {copied ? "已复制" : "复制"}
          </Button>
          <Button size="sm" variant="secondary" onClick={doImport}>
            <Upload className="h-4 w-4" /> 导入
          </Button>
        </div>
      </div>

      <Separator />

      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          className="flex-1"
          onClick={resetApp}
        >
          <RotateCcw className="h-4 w-4" /> 重置
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex-1 text-destructive"
          onClick={clearAll}
        >
          <Trash2 className="h-4 w-4" /> 清空
        </Button>
      </div>
    </div>
  );
}
