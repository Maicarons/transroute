# TransRoute · 物流大亨

> 一款受 [AirlineSim](https://www.airlinesim.aero/) 启发的**物流大亨**游戏：从单机经营到多人在线。
> 玩家在城市间开设运输线路、调度车队、竞标共享货池、结盟联运、在玩家间市场交易，
> 并面对银行贷款、信用评级与破产清算。

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](LICENSE)

## 仓库结构

本仓库是一个 monorepo，包含单机版与多人版：

| 目录 | 说明 | 技术栈 |
|------|------|--------|
| 根目录（`src/`、`package.json`） | 单机版《物流大亨》前端 | Vite + React 18 + TypeScript + MapLibre + Tailwind + Zustand |
| `game/` | 单机版独立构建（standalone build） | 同单机版，已构建产物 |
| `server/` | 多人版后端（权威模拟 + 实时推送） | Go 1.22 + Fiber + fasthttp/websocket + GORM（SQLite，无 cgo） |
| `client/` | 多人版前端 | Vite + React + TypeScript + Zustand + reconnecting-websocket |
| `docs/` | 系统设计与玩法文档（VitePress） | Markdown + Mermaid |

## 核心玩法（对照 AirlineSim）

- **持久化游戏世界** + 真实时间流速的 tick 模拟
- **共享货池**：每个 OD 按各公司评分（价格 / 时效 / 覆盖 / 联运权重）比例分配货运需求
- **联盟与联运**：玩家结盟，跨公司转运货物
- **玩家间市场**：买卖车辆、挂单交易
- **金融系统**：银行贷款、信用评分、破产清算
- **排行榜 / 对手**：实时资产与评分排名
- **多世界**：可创建多个独立世界；种子世界自带 AI 对手

## 快速开始

### 单机版（根目录）

```bash
npm install
npm run dev      # 开发预览 http://localhost:5173
npm run build    # 产出 dist/
```

### 多人版后端（`server/`）

> 需要 Go 1.22+ 且能联网拉取依赖。

```bash
cd server
go mod tidy
go build ./...
go test ./...
go run ./cmd/server   # 默认 :3000，提供 REST + /ws
```

### 多人版前端（`client/`）

```bash
cd client
npm install
npm run dev
```

> 后端可配置直接托管 `client/dist`（见 `server/config` 的 `ServeClient`）。

## 文档

完整实体定义、评分公式、11 步 tick、WebSocket / REST / DB 契约见
[`docs/system_design.md`](docs/system_design.md)。
设计图：`docs/class-diagram.mermaid`、`docs/sequence-diagram.mermaid`。

## 本地真实路网（可选）

无需 Key 的本地 OSRM 路由服务见 `docker-compose.yml` + `scripts/setup-osrm.sh`：

```bash
bash scripts/setup-osrm.sh guangdong   # 下载并构建路网
docker compose up -d                    # 启动路由 + CORS 网关（localhost:5000）
```

## 开发说明

- 各子目录均含独立 `README.md`（`server/`、`client/`）。
- 单机版源码位于根目录 `src/`；`game/` 为单机版的独立构建产物，运行时不依赖 `server/`。
- 多人对局的服务端为权威模拟，客户端仅发送意图并渲染快照/增量。

## 许可证

本项目以 **GNU Affero General Public License v3.0 (AGPL-3.0)** 发布。详见 [LICENSE](LICENSE)。

> 依据 AGPL-3.0：若你通过网络（例如 SaaS）提供基于本项目的修改版本，
> 你必须向使用该服务的用户提供其对应源代码的完整副本。
