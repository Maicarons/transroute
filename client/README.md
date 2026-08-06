# 《物流大亨》多人化前端（client）

基于 **React 18 + Vite + TypeScript + Zustand + MapLibre GL** 的多人物流模拟客户端。
通过 REST（axios 风格封装）拉取世界状态，通过 WebSocket（自动重连）接收服务端 tick 增量。

## 技术栈

- **React 18** + **TypeScript**（strict）
- **Vite 5** 构建
- **Zustand 4** 全局状态（session / world / myCompany / opponents）
- **reconnecting-websocket 4** WebSocket 自动重连
- **maplibre-gl 4** 世界地图渲染
- **tailwindcss 3** 样式
- **lucide-react** 图标

## 目录结构

```
client/
├── index.html
├── vite.config.ts          # /api → :8080, /ws → ws://:8080 代理
├── tsconfig.json           # 排除 src/components/ui/map.tsx（vendored snapshot）
├── tailwind.config.js
└── src/
    ├── main.tsx            # 入口
    ├── App.tsx             # 路由：Login → Lobby → Game（含 WS 连接与 Tab 切换）
    ├── api/
    │   ├── types.ts        # 与服务端 model JSON tag 对齐的 DTO
    │   ├── rest.ts         # apiFetch 封装 + 各 REST 调用
    │   └── ws.ts           # WorldSocket（ReconnectingWebSocket + onmessage 分发）
    ├── state/              # zustand stores：session / world / myCompany / opponents
    ├── game/               # vendored snapshot（从 game/ 复制，勿改父工程）
    │   ├── cities.ts       # 40 城数据镜像
    │   ├── types.ts        # 实体类型镜像
    │   └── content.ts      # 物流点等级 / 车型目录镜像
    ├── lib/utils.ts        # cn / formatMoney / formatTons / modeLabel
    └── components/
        ├── Login.tsx, Lobby.tsx, HUD.tsx
        ├── GameMap.tsx      # 原生 maplibre-gl 渲染（不引用 vendored map.tsx）
        ├── BuildPanel.tsx   # 建点 / 购车 / 开线路
        ├── FleetPanel.tsx   # 车队 + 派单
        ├── LanePanel.tsx, MarketPanel.tsx, FinancePanel.tsx
        ├── AlliancePanel.tsx, Leaderboard.tsx, OpponentMonitor.tsx
        └── ui/map.tsx       # 从 game/ 复制的 vendored 资产（已排除 tsc，仅作资产保留）
```

## 开发

```bash
cd client
npm install
npm run dev        # Vite 开发服务器，默认 :5173，API/WS 经代理转发到 :8080
```

## 生产构建

```bash
cd client
NODE_OPTIONS="" npm install
NODE_OPTIONS="" npm run build     # 输出 dist/，由 server 的 serve_client 托管
```

> 说明：`NODE_OPTIONS=""` 用于规避某些环境下 `.cache` 清理脚本（genie-safe-delete.cjs）对构建的干扰。

## 与后端约定

- REST 统一响应 `{ code, data, message }`（`code=0` 成功），见 `api/rest.ts` 的 `apiFetch`。
- WebSocket 建连地址：`/ws?token=<jwt>&worldId=<uuid>`，收到 `welcome` + `world_snapshot` 后进入游戏；
  每个 tick 收到 `delta` 更新世界。
- 金额单位为「元」（`int64`），由 `formatMoney` 展示；时间以服务端 `day` 为准。

## 关于 vendored 快照

`src/game/*` 与 `src/components/ui/map.tsx` 是从单人版 `game/` 目录**有意复制**的资产快照，
头部带有「请勿 import 父工程」注释。升级时直接修改本目录文件，保持与后端 `model` 的字段对齐即可。
`map.tsx` 因体量大被 `tsconfig.json` 排除在类型检查之外（仅作为资产保留），游戏地图使用 `GameMap.tsx` 原生 maplibre 实现。
