# 《物流大亨》概览

《物流大亨》是 TransRoute 的**衍生经营模拟游戏**，位于独立的 `game/` 工程。它复用主项目的真实城市坐标（`src/game/cities.ts`，40 个中国真实城市 WGS-84）与同一套 MapLibre 地图组件，但拥有自己的依赖、状态机与玩法，与主应用**完全解耦**（不 import 主应用源码）。

游戏目标：从零开始，在全国真实城市上承接货运订单、建设物流网点、购置/租赁车辆、必要时借贷周转，把一家小物流公司做成物流大亨。

## 工程独立性

- `game/` 自带 `package.json`（依赖：react / react-dom / maplibre-gl / lucide-react / tailwindcss 等），无 `file:` / `workspace:` 指向父项目。
- `tsconfig.json` 仅 `include: ["src"]`，自包含。
- 可整体拷贝到任意目录 `npm install && npm run dev` 直接运行。
- 地图组件 `game/src/components/ui/map.tsx` 是主项目 `map.tsx` 的有意复制（vendored snapshot），顶部有明确声明「请勿从父项目 import 或同步」，升级直接改本文件。

## 技术栈

Vite + React 18 + TypeScript + Tailwind CSS（shadcn 风格）。状态为不可变纯函数引擎（`src/game/engine.ts`），UI 通过 `App.tsx` 的 `useState<GameState>` 驱动。

## 玩法总览

| 模块 | 文件 | 作用 |
| --- | --- | --- |
| 地图 | `MapView.tsx` | MapLibre 真实底图，城市点按已建/未建着色，在途运单画成弧线（合同货绿、现货粉） |
| 顶部统计 | `HUD.tsx` | 现金 / 第几天 / 声誉 / 总资产 / 在途 / 物流点 / 车队 / 负债 |
| 建设面板 | `BuildPanel.tsx` | 选城市 → 建/升级物流点（四级） |
| 订单板 | `OrderBoard.tsx` | 可接货单（合同/现货）与我的运单（已接/在途） |
| 车队面板 | `FleetPanel.tsx` | 购车 / 租赁、我的车队、退租 |
| 金融面板 | `FinancePanel.tsx` | 借款 / 还款 / 负债与日息 |
| 事件日志 | `EventLog.tsx` | 每日结算与操作事件 |

## 核心循环

```
建物流点（两端城市）→ 出现合同货 + 接现货 → 购车/租赁 → 派车 → 推进天数结算
        ↑                                                      │
        └──────── 赚到钱再扩张网点 / 车队 / 借贷 ──────────────┘
```

两个关键现实逻辑（详见[核心机制](/game/mechanics)）：

- **物流公司一直有货**：你建了物流点的城市对之间，每天自动产生「合同货」（稳定但随机波动）；只有「现货」才是外部随机接活。
- **金融杠杆**：车辆可租赁（日租，不占用全款），资金可借贷（日息），靠周转扩张而非一次性重资产。

## 启动

```bash
cd game
npm install
npm run dev      # 默认 http://localhost:5190/
```

构建：`cd game && NODE_OPTIONS="" npm run build`（含 `tsc` 类型检查）。

> 沙箱/受控环境下若构建报 `[safe-delete] 操作失败`，同样在命令前加 `NODE_OPTIONS=""`，见[构建与部署](/reference/build-deploy)。
