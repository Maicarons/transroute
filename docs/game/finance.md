# 金融与资产

《物流大亨》提供**车辆租赁**与**资金借贷**两套杠杆，让玩家不必一次性重资产投入即可扩张。相关常量在 `src/game/content.ts`，动作在 `src/game/engine.ts`，面板为 `FinancePanel.tsx`。

## 车辆租赁

> 现实：不必每辆车都买断。短期用车可租赁，按天付租、可退。

- `Vehicle.owned`：`true`=自有，`false`=租赁。
- `Vehicle.leaseDaily`：日租金（自有车为 0）。
- `Vehicle.leaseUntilDay`：租期到期日（`null`=长租，不自动退租）。

### 租赁 `leaseVehicle(typeId)`

```ts
const leaseDaily = Math.round(t.cost * LEASE_DAILY_RATE)  // LEASE_DAILY_RATE = 0.02
```

- 获得一辆该型车，`owned=false`，`leaseDaily = 车价 × 2%`，`leaseUntilDay=null`；
- **不扣购车全款**（纯日租、无押金）；
- 资金不足也允许（靠借贷周转），但给 warn 提示；
- 置位 `usedLeaseOrLoan = true`。

例：重型卡车车价 38 万 → 日租 `round(380000 × 0.02) = 7600` 元/天。

### 退租 `returnLease(vehicleId)`

- 仅当车辆**空闲**（`busyUntilDay` 为 null）可退；
- **运输中不可退**（返回 warn「运输中无法退租」）；
- 退租后从车队移除，停止日租；
- 自有车被守卫拦截（「自有车辆，无需退租」）。

### 每日结算中的租赁

`advanceDay` 对每辆租赁车从 `money` 扣 `leaseDaily`（汇总一条「车辆租赁费支出 X 元」事件）；若 `leaseUntilDay ≤ 当日` 则自动退租。

## 资金借贷

> 现实：物流扩张常靠杠杆。借钱周转、付日息、再还款。

- `GameState.debt`：负债总额（默认 0）。
- `LOAN_DAILY_RATE = 0.002`（0.2%/天 ≈ 月 6%）。

### 借款上限 `maxLoan(s)`

```ts
maxLoan = round(netWorth(s) × 0.6 + reputation × 8000)
```

随净资产与声誉增长。

### 借款 `borrowMoney(amount)`

- `amount ≤ 0` 或 `amount > maxLoan` → warn 拒绝；
- 通过则 `money += amount`，`debt += amount`，置位 `usedLeaseOrLoan`；
- 事件提示当前负债与日息。

### 还款 `repayLoan(amount)`

```ts
pay = min(amount, debt, max(0, money))
```

- 实际还款取「请求额 / 负债 / 可用现金」三者最小；
- `money -= pay`，`debt -= pay`；
- `pay ≤ 0` → warn（无现金或已无负债）。

## 净资产（netWorth）

```ts
netWorth = money + nodeAsset + vehicleAsset(仅自有车) − debt
```

- `nodeAsset`：所有已建物流点造价之和；
- `vehicleAsset`：**仅算 `owned=true` 的自有车**（租赁车不计入资产，但每天产生租金负债）；
- 资不抵债（`netWorth < 0`）时推 danger 事件，但**不做硬性 Game Over**——靠每日利息压力倒逼玩家还款或处置资产，保持可玩性。

## 金融面板（FinancePanel）

- 显示当前**负债**、**日息**（`round(debt × 0.002)`）、**可借额度**（`maxLoan`）；
- 借款金额输入 + 「借款」按钮；
- 还款金额输入 + 「还款」按钮 + 「一键还清」；
- HUD 额外显示「负债」统计（负债 > 0 时红色 warn 色调）。

## 数值与可调点

以下均为当前采用值，可按手感调整（集中在 `content.ts`）：

| 常量 | 值 | 含义 |
| --- | --- | --- |
| `LEASE_DAILY_RATE` | 0.02 | 日租 = 车价 × 2% |
| `LOAN_DAILY_RATE` | 0.002 | 日息 0.2%/天 |
| `CONTRACT_BASE` | {1:3, 2:2.4, 3:1.8} | 合同货基础货量（按城市重要度） |
| 合同货价系数 | 0.85 | 合同货 price = 基准 × 0.85 |

若觉得利率太高/太低、租赁太贵/太便宜、初始资金不够，告诉我即可调。
