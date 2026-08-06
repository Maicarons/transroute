# 界面与使用

主应用界面由若干面板组成，围绕「建网络 → 配参数 → 算路径 → 看结果」的工作流组织。

## 布局概览

```
┌─────────────── 左侧：编辑 ───────────────┬── 中间：地图 / 拓扑 ──┬── 右侧：结果 ──┐
│ ConfigPanel   算法 / 货量 / 费率 / 数据源  │  MapPanel  真实底图   │ ResultsPanel  │
│ NodeEditor    增删改节点（四级层级）        │  TopologyGraph 拓扑图 │ 路径明细      │
│ EdgeEditor    增删改边 / 自动组网 / 刷新    │  （缩放/平移）        │ realRatio    │
│ ParamConfig   参数配置                      │                       │              │
└──────────────────────────────────────────┴───────────────────────┴──────────────┘
```

关键文件：

- `src/components/panels/ConfigPanel.tsx` —— 算法、货量、各模式费率、地理编码源、真实里程源（OSRM·公共/本地/高德）、显示开关。
- `src/components/panels/NodeEditor.tsx` —— 节点增删改，四级层级 `Select`，「载入示例」按钮。
- `src/components/panels/EdgeEditor.tsx` —— 边增删改，默认 `mode=road`；「按层级自动组网」按钮；真实里程徽标与刷新按钮。
- `src/components/panels/ResultsPanel.tsx` —— 路径结果、逐段明细、三种目标对比、「真实路网里程占比」。
- `src/components/panels/TopologyGraph.tsx` —— 纯 SVG 拓扑图（不依赖底图），支持缩放/平移。
- `src/components/map/MapPanel.tsx` —— MapLibre 真实底图，城市点、在途/真实路线叠加。
- `src/components/ui/map.tsx` —— 通用地图组件（`Map` / `MapMarker` / `MapRoute` / `MapArc`）。

## 节点编辑（NodeEditor）

- 选择层级 `station / local / city / hub`（四级轴辐式，见[拓扑模型](/guide/topology-model)）。
- 坐标来自真实城市目录或地理编码；**禁止手填虚构坐标**。
- 「载入示例」一键加载「新泰 → 厦门」真实分拨链路并自动组网。

## 边与自动组网（EdgeEditor）

- 新增边默认 `mode=road`（按需求设定）。
- **「按层级自动组网」**：执行 `autoConnectTiers()`，生成轴辐式网络（站点→中心→城市→枢纽 + 枢纽干线网格），随后自动拉取真实里程。
- **「刷新真实里程」**：对所有未填充真实的边重新请求 OSRM/高德。
- 每条边显示真实/估算徽标：真实（real=true）为实色，估算为虚线提示。

## 路径结果与可信度（ResultsPanel）

- 选择起点 `origin`、终点 `dest`、算法 `algorithm` 后实时计算。
- 展示总里程、总成本、总时间、中转费，**以及「真实路网里程占比 realRatio」**——提示结论有多少是真实路网支撑。
- 支持同时对比「最短里程 / 最低成本 / 最快时效」三种结果。

## 拓扑图（TopologyGraph）

独立的 SVG 拓扑视图，不依赖在线底图，便于看清网络结构：

- **滚轮缩放**：以光标位置为锚点放大/缩小；
- **拖拽平移**：按住拖动查看被遮挡部分；
- **`+ / − / 复位` 按钮**：快速缩放与重置视图；
- 节点按 `TIER_COLORS` 着色，边按运输模式着色。

## 地图（MapPanel）

- 基于 MapLibre + Carto（WGS-84）真实底图，节点真实坐标零偏移落图。
- 城市点、选中高亮、在途运单弧线（`MapArc`）一目了然。
- 高德返回的真实道路（`RealRoute`）以粉色虚线叠加，用于与计算拓扑对比。

## 使用流程建议

1. 打开 **NodeEditor → 载入示例** 或手动添加节点（注意层级）。
2. 在 **EdgeEditor** 点「按层级自动组网」，等真实里程拉取完成（边上出现真实徽标）。
3. 在 **ConfigPanel** 选算法（默认 `shortest`）与真实里程源（默认 `OSRM·公共`）。
4. 设起点/终点，看 **ResultsPanel** 的路径明细与 realRatio。
5. 需要离线/大批量时，切到「OSRM·本地」（见[本地 OSRM 部署](/guide/local-osrm)）。
