import {
  Truck,
  Settings2,
  RotateCcw,
  Network,
} from "lucide-react";
import { useLogiStore } from "@/store/useLogiStore";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapPanel } from "@/components/map/MapPanel";
import { TopologyGraph } from "@/components/panels/TopologyGraph";
import { ConfigPanel } from "@/components/panels/ConfigPanel";
import { ResultsPanel } from "@/components/panels/ResultsPanel";

function EndpointSelect({ role }: { role: "origin" | "dest" }) {
  const nodes = useLogiStore((s) => s.nodes);
  const originId = useLogiStore((s) => s.originId);
  const destId = useLogiStore((s) => s.destId);
  const setOrigin = useLogiStore((s) => s.setOrigin);
  const setDest = useLogiStore((s) => s.setDest);

  const value = role === "origin" ? originId : destId;
  const onChange = role === "origin" ? setOrigin : setDest;
  const isOrigin = role === "origin";

  return (
    <Select
      value={value ?? undefined}
      onValueChange={(v) => onChange(v)}
    >
      <SelectTrigger
        className={cn(
          "h-8 w-[120px] text-xs sm:w-[140px]",
          isOrigin
            ? "border-emerald-500/50 focus:ring-emerald-500/40"
            : "border-rose-500/50 focus:ring-rose-500/40"
        )}
      >
        <SelectValue placeholder={isOrigin ? "起点" : "终点"} />
      </SelectTrigger>
      <SelectContent>
        {nodes.map((n) => (
          <SelectItem key={n.id} value={n.id}>
            {n.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function Header() {
  const resetApp = useLogiStore((s) => s.resetApp);
  const nodeCount = useLogiStore((s) => s.nodes.length);
  const edgeCount = useLogiStore((s) => s.edges.length);

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-card/50 px-3 sm:px-4">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Truck className="h-4 w-4" />
        </div>
        <div className="leading-tight">
          <h1 className="text-sm font-semibold">物流拓扑计算系统</h1>
          <p className="hidden text-[10px] text-muted-foreground sm:block">
            Logistics Topology · {nodeCount} 节点 / {edgeCount} 连线
          </p>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <div className="hidden items-center gap-1.5 sm:flex">
          <EndpointSelect role="origin" />
          <span className="text-muted-foreground">→</span>
          <EndpointSelect role="dest" />
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8"
          onClick={resetApp}
          title="恢复示例数据"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">重置</span>
        </Button>

        {/* Mobile config trigger */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="h-8 w-8 lg:hidden">
              <Settings2 className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[340px] overflow-y-auto p-0">
            <SheetHeader className="border-b p-4">
              <SheetTitle>配置面板</SheetTitle>
            </SheetHeader>
            <div className="p-3">
              <ConfigPanel />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}

export default function App() {
  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden">
      <Header />

      <div className="flex flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
        {/* Desktop config sidebar */}
        <aside className="hidden w-[330px] shrink-0 overflow-y-auto border-r p-3 lg:block">
          <ConfigPanel />
        </aside>

        {/* Center: map + topology */}
        <main className="flex flex-col gap-3 p-3 lg:flex-1 lg:flex-row lg:overflow-hidden">
          <section className="flex flex-col gap-3 lg:flex-1 lg:overflow-hidden">
            <div className="h-[360px] shrink-0 lg:h-auto lg:flex-1">
              <MapPanel />
            </div>
            <Card className="h-[300px] shrink-0">
              <CardHeader className="flex-row items-center gap-2 space-y-0 p-3">
                <Network className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm">拓扑网络图</CardTitle>
              </CardHeader>
              <CardContent className="p-2 pt-0">
                <TopologyGraph />
              </CardContent>
            </Card>
          </section>

          {/* Right: results */}
          <aside className="w-full shrink-0 lg:w-[372px] lg:overflow-y-auto lg:border-l">
            <ResultsPanel />
          </aside>
        </main>
      </div>
    </div>
  );
}
