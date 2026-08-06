# 《物流大亨》多人化后端（server）

基于 **Go + Fiber v2 + WebSocket（fasthttp/websocket）** 的服务器权威（server-authoritative）
多人物流模拟后端。所有经济结算、货量分配、tick 主循环均在服务端完成，客户端仅做展示与指令上报。

## 技术栈

- **Web 框架**：[go-fiber/fiber v2](https://github.com/gofiber/fiber)
- **WebSocket**：[fasthttp/websocket](https://github.com/fasthttp/websocket)（Fiber 基于 fasthttp，须用此分支而非 gorilla/websocket）
- **ORM / 数据库**：[GORM](https://gorm.io) + [glebarez/sqlite](https://github.com/glebarez/sqlite)（纯 Go，无 cgo）
- **鉴权**：[golang-jwt/jwt v5](https://github.com/golang-jwt/jwt) + bcrypt
- **其他**：google/uuid、stretchr/testify（单测）

## 目录结构

```
server/
├── cmd/server/main.go        # 入口：装配 DB / repo / handler / WS / ticker
├── config.yaml               # 运行配置（§8.4）
├── go.mod
├── internal/
│   ├── config/               # 配置加载（yaml + 环境变量覆盖）
│   ├── model/                # 实体 / 枚举 / 常量（§8.3 / §8.4）
│   ├── geo/                  # 40 城地理数据 + 距离计算
│   ├── content/              # 物流点等级 / 车型目录
│   ├── repo/                 # GORM 仓储（CRUD + 联盟 + 模拟）
│   ├── auth/                 # JWT 签发 / 密码哈希 / 中间件
│   ├── handler/              # REST 路由（auth/world/company/alliance/market/leaderboard/ws）
│   ├── company/              # 公司业务规则（建点/购车/线路/派单/借贷）
│   ├── market/               # 玩家市场（挂单/撤单/即时成交）
│   ├── sim/                  # 模拟引擎（货量池 / 评分 / 分配 / 11 步 tick）
│   ├── world/                # 世界运行时（订阅 / 快照 / ticker）
│   ├── ws/                   # WebSocket 连接封装 / Hub / 消息 schema
│   └── seed/                 # 启动期 NPC 竞品种子数据
└── seed/seed.go
```

## 启动

```bash
cd server
go mod download            # 首次需联网拉取依赖
go run ./cmd/server        # 默认监听 :8080，读取同目录 config.yaml
```

### config.yaml（关键字段，§8.4）

| 字段 | 含义 | 默认 |
| --- | --- | --- |
| `http_port` | HTTP/WS 监听端口 | 8080 |
| `tick_seconds` | 1 游戏日 = N 秒 | 10 |
| `jwt_secret` | JWT 签名密钥（生产务必修改） | dev-secret |
| `db_path` | SQLite 文件路径 | transroute.db |
| `client_dir` | 前端静态目录（可选托管） | ./client/dist |
| `serve_client` | 是否托管前端 | true |

> 所有配置项均可被环境变量覆盖（见 `internal/config` 的 `applyEnv`）。

## 统一响应（§8.2）

所有 REST 响应包裹为：

```json
{ "code": 0, "data": <payload>, "message": "ok" }
```

`code != 0` 表示业务错误；HTTP 状态码同时反映（如 400/401/404/409/500）。

## REST 端点一览

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/api/auth/register` | 注册 |
| POST | `/api/auth/login` | 登录（返回 token） |
| GET | `/api/auth/me` | 当前用户 |
| GET | `/api/worlds` | 世界列表 |
| POST | `/api/worlds` | 创建世界 |
| POST | `/api/worlds/:id/join` | 加入世界（自动建公司） |
| GET | `/api/worlds/:id/state` | 世界全量快照 |
| GET | `/api/companies/:id` | 公司详情（资产/线路/负债/账本） |
| POST | `/api/companies/:id/nodes` | 建/升物流点 |
| POST | `/api/companies/:id/vehicles` | 购车 / 租赁 |
| POST | `/api/companies/:id/lanes` | 开通线路 |
| POST | `/api/companies/:id/orders/:orderId/dispatch` | 派单 |
| POST | `/api/companies/:id/finance/borrow` | 借款 |
| POST | `/api/companies/:id/finance/repay` | 还款 |
| POST | `/api/worlds/:id/alliances` | 创建联盟 |
| POST | `/api/alliances/:id/join` | 加入联盟 |
| POST | `/api/alliances/:id/leave` | 退出联盟 |
| GET | `/api/worlds/:id/market` | 世界挂单列表 |
| POST | `/api/market` | 发布挂单 |
| POST | `/api/market/:id/cancel` | 撤单 |
| POST | `/api/market/:id/fill` | 即时成交 |
| GET | `/api/worlds/:id/leaderboard` | 排行榜 |
| GET | `/api/companies/:id/opponents` | 对手监控 |
| GET | `/ws?token=&worldId=` | WebSocket 升级端点 |

鉴权方式：除注册/登录外，所有 `/api/*` 需在 `Authorization: Bearer <token>` 或 `?token=` 中携带 JWT。

## WebSocket 协议（§8.1）

客户端上行：`auth` / `join_world` / `ping`
服务端下行：`welcome` / `world_snapshot` / `delta`（每 tick 广播）/ `pong` / `error`

建连后服务端立即下发 `welcome` + 当前 `world_snapshot`；之后每个 tick 向同世界连接广播 `delta`。
服务端每 25s 发 WS ping 保活，超过 `WSHeartbeatSeconds`(30s) 无活动则断连。

## 模拟引擎（§3.5 / §3.6）

每个 tick 按 11 步推进世界一天：

1. 截断过期 `CargoPool`，为活跃 OD 生成当日需求
2. 评分（价格 0.35 / 时效 0.30 / 覆盖 0.20 / 联运 0.15，clamp 0.2~2.0）+ 按比例分配 → 生成合同货单
3. 到达结算（在途且当日达：扣油费、加现金、加声誉）
4. 超时迁移（pending/in_transit 且 deadline < day → expired；散单无归属直接超时）
5. 释放到期忙车辆
6. 租赁扣费 + 到期退租
7. 贷款计息（Debt×0.002）
8. 玩家市场过期单清理
9. 重算净资产 + 写评分快照
10. 破产检查（NetWorth < -1,000,000 → 标记出局）
11. 推进天数 + 构造 `delta` 广播

## 测试

```bash
go test ./internal/sim/... ./internal/company/...
```

覆盖：评分 clamp/加权合成、比例分配求和为需求、无效竞品过滤、净资产/利息/破产地板。

## 已知限制 / 偏差（需仲裁）

- **NPC 种子数据**：`seed.SeedNPCs` 以中文城市名（如 `"北京"`）作为 `CityID`，与 `geo` 城市目录的中文 ID 完全一致（`GetCity`/`DistanceKm` 按中文名查 `cityMap`）。
  经主理人源码复核，NPC 线路能正常命中目录并参与共享货量分配，非 bug，维持现状。
- 所有金额使用 `int64`（元），时间以服务端 `World.CurrentDay` 为准。
