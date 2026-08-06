# 核心机制

本章说明《物流大亨》的引擎规则（`src/game/engine.ts`）。所有状态变更均为**不可变更新**，并通过 `withEvent()` 追加事件日志。

## 物流点与城市

- 城市数据来自 `src/game/cities.ts`（40 个真实中国城市，含 `tier: 1|2|3` 重要度、`coastal` 沿海标记）。
- 玩家在已选城市建物流点，层级 `NodeTier = 'station' | 'local' | 'city' | 'hub'`，对应 `NODE_TYPES`：

| 层级 | 标签 | 基础造价 | 并发处理 | 中转时长 |
| --- | --- | --- | --- | --- |
| station | 物流站点 | 20 万 | 1 笔 | 1.0 天 |
| local | 物流中心 | 50 万 | 2 笔 | 0.5 天 |
| city | 城市节点 | 100 万 | 4 笔 | 0.3 天 |
| hub | 中转枢纽 | 250 万 | 8 笔 | 0.2 天 |

- 实际造价随城市重要度打折：`buildCost(tier, cityTier) = round(基础造价 × cityTierMult)`，其中 `cityTierMult: 一线1.0 / 省会0.8 / 其他0.6`。
- 升级：只能向更高级升级，差价 = 目标级造价 − 当前级造价。

## 订单：合同货 vs 现货

```ts
export type OrderKind = 'contract' | 'spot'
```

这是游戏最关键的现实逻辑区分：

| 类型 | 含义 | 来源 | 价格 | 产生条件 |
| --- | --- | --- | --- | --- |
| `contract` 合同货 | 物流公司自己的稳定网络货流 | 你已建点的城市对 | 基准 × 0.85（稳定价） | **仅当两端城市都已建点** |
| `spot` 现货 | 外部货运公司随机接的活 | 任意随机城市对 | 基准 × 1.0 | 每天固定生成 |

> 现实映射：**物流公司在两点间一直有货源**（不稳定、随机波动），只有货运公司才随机接活。因此合同货代表「自有网络货流」，现货代表「市场外活」。

### 合同货生成规则（`advanceDay` 内）

- 仅当已建点城市数 `≥ 2` 才产生；
- 每个已建点源城市：`want = round(base[tier] × 波动)`，其中 `base = CONTRACT_BASE`（一线 3 / 省会 2.4 / 其他 1.8），**波动系数 `0.4 + random×1.2`（即 0.4~1.6）**，体现货流不稳定；
- 同一城市对每天**最多 1 笔**（去重）；
- 未建任何点 → 只有现货。

### 现货生成

`genCount = 2 + floor(reputation/25) + floor(random×3)`，随声誉增加。两端为随机城市，无需建点。

## 接单与派车

- `acceptOrder(orderId)`：要求订单两端城市都已建点（`canService`），且两端处理仓位未满（`cityFreeSlots > 0`）。
- `dispatchOrder(orderId, vehicleId)`：校验车辆空闲、载重 ≥ 货重、运输方式合法（`modeValid`：货轮需两端皆沿海）、两端已建点。
- 行程天数：`tripInfo()` 基于 haversine 距离 + 车速 + 两端中转时长，`days = max(1, ceil(travelDays + handlingDays))`；油费 `fuelCost = round(距离 × fuelPerKm)`。

## 推进天数（advanceDay）

每日结算按固定顺序执行：

1. **到达结算**：在途且当日达的订单，`money += reward − fuelCost`，声誉 +1；
2. **状态迁移**：在途 → 完成；已接单超 `deadlineDay` → 过期；
3. **释放车辆**：`busyUntilDay ≤ 当日` 的车辆重置为空闲；
4. **超时惩罚**：过期订单声誉 −3；
5. **清理**：移除过期的可接订单（无惩罚）；
6. **生成新订单**：现货 +（若有建点）合同货；
7. **租赁扣费 & 到期退租**：每辆租赁车扣 `leaseDaily`，到期自动退租；
8. **贷款利息**：`debt > 0` 时扣 `round(debt × LOAN_DAILY_RATE)`；
9. **资不抵债检查**：`netWorth < 0` 推 danger 事件（允许现金为负，靠利息倒逼还款，**不硬性 Game Over**）。

## 初始状态

```
day = 1, money = 1,000,000, reputation = 50, debt = 0,
nodes = {}, vehicles = [], orders = 6 笔现货
```

## 车辆

`VEHICLE_TYPES`（5 种）：

| id | 名称 | 模式 | 载重(吨) | 速度(km/h) | 车价 | 油费(元/km) |
| --- | --- | --- | --- | --- | --- | --- |
| ltruck | 轻型厢货 | road | 8 | 80 | 15 万 | 0.9 |
| htruck | 重型卡车 | road | 40 | 70 | 38 万 | 1.6 |
| train | 货运列车 | rail | 1500 | 95 | 300 万 | 0.06 |
| plane | 货运飞机 | air | 120 | 750 | 900 万 | 7 |
| ship | 远洋货轮 | sea | 6000 | 33 | 550 万 | 0.03 |

> 货轮仅限沿海城市间（`coastal` 两端皆 true）。载重大、单位油费低，适合大宗；飞机极速但烧钱。

## 声誉

- 完成订单 +1（封顶 100）；
- 超时流失 −3（下限 0）；
- 影响现货生成量与借款上限（`maxLoan` 含 `reputation × 8000`）。
