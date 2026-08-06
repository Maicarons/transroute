# 项目结构

仓库采用「主应用 + 独立衍生游戏」双工程结构。二者在文件系统上并列，互相不 import。

## 根目录（主应用：物流拓扑系统）

```
transroute/
├── index.html                      # Vite 入口 HTML
├── package.json                    # 主应用依赖与脚本（dev/build/preview/typecheck）
├── vite.config.ts                  # Vite 配置（@ 别名 → src；端口 5173）
├── tsconfig.json / tsconfig.node.json
├── tailwind.config.js / postcss.config.js
├── docker-compose.yml              # 本地 OSRM：路由 + CORS 网关
├── nginx-osrm.conf                 # OSRM 的 CORS 反向代理配置
├── scripts/
│   └── setup-osrm.sh               # 下载并构建本地 OSRM 路网（一次性）
├── src/
│   ├── data/
│   │   └── cities.ts               # REAL_CITIES：约 40 个真实中国城市（WGS-84）
│   ├── lib/
│   │   ├── types.ts                # 核心类型与常量（层级/模式/算法/标签/颜色）
│   │   ├── geo.ts                  # haversine 直线距离（兜底）
│   │   ├── graph.ts                # buildAdjacency + Dijkstra（路径计算）
│   │   ├── osrm.ts                 # OSRM 公共/本地 真实路网请求
│   │   ├── amap.ts                 # 高德 真实路径（GCJ-02 纠偏）
│   │   └── geocode.ts              # OSM/高德 地理编码
│   ├── store/
│   │   └── useLogiStore.ts         # Zustand 单一数据源 + 所有动作
│   ├── components/
│   │   ├── ui/                     # 通用 UI 原语（button/card/select/...）+ map.tsx（地图组件）
│   │   ├── panels/                 # ConfigPanel / NodeEditor / EdgeEditor / ParamConfig
│   │   │                           # ResultsPanel / TopologyGraph
│   │   └── map/
│   │       └── MapPanel.tsx        # 地图视图（基于 ui/map.tsx）
│   └── App.tsx                      # 主应用装配
└── game/                            # ⬇ 独立衍生游戏（见下）
```

### 主应用关键文件职责

| 文件 | 职责 |
| --- | --- |
| `src/lib/types.ts` | `NodeTier` / `TransportMode` / `Algorithm` / `LogiNode` / `LogiEdge` / `LogiSettings` / `RouteResult` / `RealRoute` 及标签、颜色常量 |
| `src/lib/graph.ts` | `buildAdjacency`（含真实/估算权重）、`dijkstra`、`computeRoute`、`computeAllAlgorithms` |
| `src/lib/osrm.ts` | `osrmRoute` / `osrmMetrics`，公共/本地 base 常量 |
| `src/store/useLogiStore.ts` | 节点/边增删改、`autoLink` / `autoConnectTiers` / `refreshMetrics` / `loadExample` / `recompute`、设置（含 `setRouteSource`） |
| `src/components/panels/TopologyGraph.tsx` | SVG 拓扑图（滚轮缩放、拖拽平移、复位） |
| `src/components/ui/map.tsx` | 通用地图组件 `Map` / `MapMarker` / `MapRoute` / `MapArc` |

## game/（衍生游戏《物流大亨》，独立工程）

```
game/
├── package.json                    # 自带依赖（react/maplibre-gl/lucide-react/tailwind...）
├── vite.config.ts                  # 端口 5190
├── tsconfig.json                   # include: ["src"]（自包含）
├── tailwind.config.js / postcss.config.js
├── index.html
├── src/
│   ├── lib/utils.ts                # cn 工具（vendored）
│   ├── game/
│   │   ├── types.ts                # City / NodeTier / Vehicle / Order / GameState ...
│   │   ├── content.ts              # NODE_TYPES / VEHICLE_TYPES / CARGO_TYPES / 费率常量
│   │   ├── cities.ts               # 40 个真实城市（WGS-84）+ getCity
│   │   ├── geo.ts                  # haversine + project（投影）
│   │   └── engine.ts               # 纯函数引擎：初始化/接单/派车/advanceDay/租赁/借贷/netWorth
│   ├── components/
│   │   ├── ui/map.tsx              # 地图组件（vendored snapshot，声明不回同步父项目）
│   │   ├── MapView.tsx / HUD.tsx / BuildPanel.tsx
│   │   ├── OrderBoard.tsx / FleetPanel.tsx / FinancePanel.tsx / EventLog.tsx
│   │   └── App.tsx                 # useState<GameState> 装配
│   └── index.css                    # 全局样式 + 自包含 dark 主题 token
└── scripts/qa-econ.ts              # （可选）经济机制自检脚本，不在 build 范围
```

> **独立性说明**：`game/` 不引用父项目任何源码；其 `map.tsx` 是父项目同名文件的有意复制，顶部有明确「VENDORED SNAPSHOT」声明。两个工程可分别 `npm install && npm run dev` 运行，互不依赖。

## 文档工程（docs/）

```
docs/
├── package.json                    # 自包含 VitePress 工程
├── .vitepress/
│   └── config.ts                   # 导航/侧边栏/本地搜索/关闭 markdown-it-attrs
├── index.md                        # 首页
├── guide/                          # 主应用指南（introduction/getting-started/architecture/
│   │                               #   data-sources/topology-model/route-calculation/
│   │                               #   local-osrm/ui）
├── game/                           # 游戏文档（index/mechanics/finance）
└── reference/                      # 参考（project-structure/build-deploy）
```

## 依赖关系图（精简）

```
主应用:  src/lib/*  ←  src/store/*  ←  src/components/*  ←  src/App.tsx
游戏:    game/src/game/*  ←  game/src/components/*  ←  game/src/App.tsx
文档:    docs/.vitepress/config.ts 驱动 docs/**/*.md
（主应用 与 游戏 之间：无任何引用）
```
