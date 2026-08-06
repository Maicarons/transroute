import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MapPin, Link2, SlidersHorizontal } from "lucide-react";
import { NodeEditor } from "@/components/panels/NodeEditor";
import { EdgeEditor } from "@/components/panels/EdgeEditor";
import { ParamConfig } from "@/components/panels/ParamConfig";

export function ConfigPanel() {
  return (
    <Tabs defaultValue="nodes" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="nodes" className="gap-1">
          <MapPin className="h-3.5 w-3.5" /> 节点
        </TabsTrigger>
        <TabsTrigger value="edges" className="gap-1">
          <Link2 className="h-3.5 w-3.5" /> 连接
        </TabsTrigger>
        <TabsTrigger value="params" className="gap-1">
          <SlidersHorizontal className="h-3.5 w-3.5" /> 参数
        </TabsTrigger>
      </TabsList>
      <TabsContent value="nodes" className="mt-3">
        <NodeEditor />
      </TabsContent>
      <TabsContent value="edges" className="mt-3">
        <EdgeEditor />
      </TabsContent>
      <TabsContent value="params" className="mt-3">
        <ParamConfig />
      </TabsContent>
    </Tabs>
  );
}
