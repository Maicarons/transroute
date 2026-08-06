# 整体架构

TransRoute 主应用是一个典型的 **React + Vite + TypeScript** 单页应用，状态用 Zustand 管理，地图用 MapLibre GL，UI 组件基于 Radix UI + Tailwind（shadcn 风格）。

## 分层结构

```
┌─────────────────────────────────────────────────────────┐
│                       UI 层（React 组件）                  │
│  panels/ (节点/边/参数/结果/拓扑图)  ·  map/ (地图)  ·  ui/ │
└───────────────────────────┬─────────────────────────────┘
                            │ 调用
┌───────────────────────────┴─────────────────────────────┐
│                    状态层（Zustand store）                 │
│   src/store/useLogiStore.ts  —— 单一数据源，动作即 reducer │
└───────────────────────────┬─────────────────────────────┘
                            │ 调用
┌───────────────────────────┴─────────────────────────────┐
│                  领域层（纯函数，无副作用）                 │
│  lib/types.ts   类型与常量（层级/模式/算法）               │
│  lib/geo.ts     haversine 直线距离（兜底）                 │
│  lib/graph.ts   buildAdjacency + Dijkstra（路径计算）      │
│  lib/osrm.ts    OSRM 公共/本地 真实路网请求                │
│  lib/amap.ts    高德 真实路径（GCJ-02 纠偏）               │
│  lib/geocode.ts OSM/高德 地理编码                          │
│  src/data/cities.ts  离线城市目录（真实 WGS-84 坐标）       │
└─────────────────────────────────────────────────────────┘
```

设计要点：

- **领域层是纯函数**：`graph.ts` 的 `computeRoute` 只接收 `nodes/edges/settings/origin/dest/algorithm`，返回 `RouteResult`，不碰 UI、不发网络请求。便于单测与复用。
- **状态层只负责编排**：`useLogiStore` 暴露动作（如 `addNode`、`autoConnectTiers`、`refreshMetrics`、`recompute`），动作内部调用领域层并触发重算。
- **UI 层只读 store + 派发动作**：组件不直接改数据，保证数据流单向。

## 关键数据流：一次路径计算

```
用户设置 origin/dest/algorithm
        │  setOrigin / setDest / setAlgorithm
        ▼
useLogiStore.recompute()
        │  computeRoute(nodes, edges, settings, origin, dest, algorithm)
        ▼
lib/graph.ts: buildAdjacency → dijkstra → RouteResult
        │
        ▼
store.result 更新 → 各面板（ResultsPanel / TopologyGraph / MapPanel）响应式重渲染
```

## 边的「真实权重」如何填充

新建一条边时只有 `from/to/mode`，没有里程。随后：

1. `addEdge` → 调用 `refreshMetrics()`；
2. `refreshMetrics()` 对所有 `real !== true` 的边，异步请求 `osrmMetrics(origin, dest)`；
3. 成功后把 `distanceKm / durationHours / real=true` 写回边；失败则保留 haversine 兜底（`real` 不置 true）。

因此**默认应当填充真实值**；只有真实源不可达时才显示「估算」。

## 技术栈一览

| 关注点 | 选型 |
| --- | --- |
| 框架 | React 18 + TypeScript |
| 构建 | Vite 5 |
| 状态 | Zustand 4 |
| 地图 | maplibre-gl 4 + Carto 矢量瓦片（WGS-84） |
| UI 原语 | Radix UI + Tailwind CSS + shadcn 风格 |
| 图表/弧线 | 基于 MapLibre 的自定义图层（MapArc） |

## 目录速览

完整文件树见 [项目结构](/reference/project-structure)。核心源码位置：

- 类型与常量：`src/lib/types.ts`
- 路径算法：`src/lib/graph.ts`
- 真实路网：`src/lib/osrm.ts`、`src/lib/amap.ts`
- 状态：`src/store/useLogiStore.ts`
- 界面：`src/components/panels/*`、`src/components/map/MapPanel.tsx`、`src/components/ui/map.tsx`
