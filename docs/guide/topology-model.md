# 轴辐式拓扑模型

TransRoute 把现实物流的「多级分拨」抽象成**四级轴辐式（hub-and-spoke）网络**。这是整个系统的建模核心。

## 四级层级（NodeTier）

```ts
export type NodeTier = "station" | "local" | "city" | "hub";
```

| 层级 | 常量 | 中文 | 含义 | 典型角色 |
| --- | --- | --- | --- | --- |
| `station` | 1 | 物流站点 | 末端收发点 | 厂门口收货站、派送站 |
| `local` | 2 | 当地物流中心 | 区县集散 | 新泰市物流中心 |
| `city` | 3 | 城市节点 | 地级市枢纽 | 泰安市、厦门市 |
| `hub` | 4 | 中转枢纽 | 区域中转 / 干线节点 | 济南枢纽、济宁枢纽、福州枢纽 |

层级顺序 `TIER_ORDER` 数值越大越靠近干线枢纽。颜色常量 `TIER_COLORS` 用于拓扑图与地图着色（站点黄绿、中心橙、城市蓝、枢纽紫）。

> **起点 / 终点（origin / dest）是「角色」，不是 tier 本身。** 任意 tier 的节点都可以是发货点或收货点，叠在层级之上。

## 节点（LogiNode）

```ts
export interface LogiNode {
  id: string
  name: string
  lng: number
  lat: number
  tier: NodeTier
  handlingFee: number   // 中转处理费（元/票）
  handlingTime: number  // 中转处理时间（小时）
}
```

- 坐标必须是真实 WGS-84（来自城市目录 / 地理编码）。
- `handlingFee` / `handlingTime` 表示货物经过该节点时的中转成本与时间，计入路径总成本/总时间。

## 边（LogiEdge）

```ts
export interface LogiEdge {
  id: string
  from: string
  to: string
  mode: TransportMode       // road | rail | air | sea
  active: boolean
  distanceKm?: number       // 真实公路里程（公里）
  durationHours?: number    // 真实耗时（小时）
  real?: boolean            // true=真实路网；false/undefined=直线估算兜底
}
```

`TransportMode` 四种：`road` 公路 / `rail` 铁路 / `air` 航空 / `sea` 水运，各有 `MODE_LABELS` / `MODE_COLORS`。

## 自动组网：从扁平到轴辐式

系统提供两类自动连接：

### 1. `autoLink(k)` —— 通用就近连接
每个节点连接最近的 `k` 个节点（扁平分网络）。默认 `mode=road`。适合做密度网格，但不体现物流层级。

### 2. `autoConnectTiers()` —— 物流感知组网（推荐）
遵循真实分拨逻辑：

- **相邻层级就近互连（低 → 高）**：站点 → 最近的当地物流中心 → 最近的城市节点 → 最近的枢纽。每个低层节点只连 1 个最近的高层节点。
- **枢纽干线网格**：每个枢纽连最近的 2 个枢纽（跨区域干线，默认 `rail`）。

连完后调用 `refreshMetrics()` 拉取真实里程。

> 默认自动连接使用 **公路（road）** 模式——这是按你「自动连接应默认公路」的要求设定的。

## 示例网络（「新泰 → 厦门」真实分拨链路）

`loadExample()` 内置一条真实坐标链路，体现完整轴辐式：

```
发货厂·新泰(station)
   → 新泰物流中心(local)
   → 泰安(city)
   → 济南枢纽(hub) ──（干线）── 福州枢纽(hub)
   → 厦门(city)
   → 集美物流中心(local)
   → 派送站·厦门(station)
```

其中济南枢纽与济宁枢纽是泰安的「最近中转候选」，系统通过整体计算择优。载入示例后会自动 `autoConnectTiers()` 并拉取真实路网权重。

## 为什么是轴辐式而不是点对点

真实物流中，货物不会从每个发货厂直发每个终点——那样干线运力与中转效率都无法规模化管理。轴辐式通过「逐级汇聚到枢纽、干线跨区、再逐级下行」实现：

- 支线（站点↔中心↔城市）做收货与分发；
- 枢纽间干线做大规模、低成本、高时效的跨区域运输；
- 中转处理费/时间自然嵌入路径成本，使「最低成本 / 最快时效」的优化有真实意义。
