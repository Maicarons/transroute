# 路径计算

TransRoute 的路径计算在 `src/lib/graph.ts` 中实现：先由边构建邻接表（预计算每段成本/时间），再用 Dijkstra 求单目标最优路径。

## 三种优化目标（Algorithm）

```ts
export type Algorithm = "shortest" | "lowestCost" | "fastest";
```

| 目标 | 常量 | 优化量（每段权重） | 适用场景 |
| --- | --- | --- | --- |
| 最短里程 | `shortest` | `distanceKm` | 关注路程最短 |
| 最低成本 | `lowestCost` | `transportCost + handlingFee` | 关注总花费最低 |
| 最快时效 | `fastest` | `transportTime + handlingTime` | 关注总时间最短 |

`computeAllAlgorithms()` 可一次性算出三者，用于对比图表。

## 边的权重怎么算

`buildAdjacency()` 对每条 `active` 边计算：

```
real       = (e.real === true)
straight   = haversineKm(a, b)                  // 直线兜底
d          = e.distanceKm ?? straight          // 优先真实里程
rate       = settings.rates[mode]              // 见下
transportCost = d * rate.costPerTonKm * cargoWeight
transportTime = e.durationHours ?? d / rate.speed
handlingFee   = 到达端节点的 handlingFee
handlingTime  = 到达端节点的 handlingTime
```

即：**优先用真实路网里程/时间**；缺失时回退直线估算（并标记 `real=false`）。货物从 `u → v` 的「中转成本/时间」记在**到达端 `v`**。

### 运输费率（`settings.rates`，默认）

| 模式 | costPerTonKm（元/吨·公里） | speed（公里/小时） |
| --- | --- | --- |
| road 公路 | 0.5 | 60 |
| rail 铁路 | 0.25 | 80 |
| air 航空 | 2.0 | 700 |
| sea 水运 | 0.1 | 35 |

`cargoWeight`（吨）是全局设置，参与运输成本计算。

## Dijkstra 实现要点

- 图规模小，采用**线性扫描优先队列**（`pq.sort(...)` 后 `shift()`），足够高效且实现简单。
- 无向图：每条边在邻接表中向两个方向各推一条。
- 返回 `path`（节点 id 序列，含起点终点）；若起点终点不可达返回 `found=false`。

核心函数签名：

```ts
export function computeRoute(
  nodes: LogiNode[],
  edges: LogiEdge[],
  settings: LogiSettings,
  originId: string | null,
  destId: string | null,
  algorithm: Algorithm
): RouteResult
```

## 结果（RouteResult）

```ts
export interface RouteResult {
  found: boolean
  path: string[]            // 节点 id 序列
  segments: RouteSegment[]  // 逐段明细
  totalDistance: number
  totalCost: number
  totalTime: number
  totalHandlingFee: number
  directDistance: number    // 起点终点直线（大圆）距离，仅作「迂回系数」参考
  realRatio: number         // 真实路网里程占比 0~1
}
```

`RouteSegment` 含每段的 `mode / distanceKm / cost / timeHours / real`，用于在结果与地图上分段展示。

### realRatio（真实路网里程占比）

```
realRatio = 真实里程段总长度 / 路径总里程
```

它直接提示**这段最优路径有多少里程是真实路网支撑的**。占比越低，说明越多路段在用直线估算兜底（通常是 OSRM 拉取失败），结论可信度相应下降。

### 迂回系数（参考）

`directDistance` 不参与路径计算，仅用于和 `totalDistance` 对比，直观体现公路绕行程度。

## 使用示例

```ts
import { computeRoute } from '@/lib/graph'

const result = computeRoute(
  nodes, edges, settings,
  originId, destId,
  'lowestCost'   // 或 'shortest' / 'fastest'
)

if (result.found) {
  console.log('总里程', result.totalDistance, 'km')
  console.log('总成本', result.totalCost, '元')
  console.log('真实占比', (result.realRatio * 100).toFixed(1) + '%')
}
```

在界面中，修改起点/终点/算法、或新增/编辑边后，`useLogiStore.recompute()` 会自动重算并更新 `result`，各面板响应式刷新。
