/**
 * 《物流大亨》经济机制独立验证脚本 (QA)
 * 运行：在 game 目录用 `npx tsx scripts/qa-econ.ts`
 *
 * 覆盖清单：
 *  1) 构建（单独 npm run build 验证，本脚本不重跑 tsc）
 *  2) 初始状态 debt===0 / 订单全 available 且 kind==='spot'
 *  3) 合同货依赖建点（无点不产生；建点后出现且两端已建；日生成量波动）
 *  4) 租赁合同经济（日租扣费=round(cost*0.02)、debt不变、事件含「租赁费」）
 *  5) 退租守卫（运输中不可退→state不变；空闲后可移除）
 *  6) 借贷经济（借款/日息/还清/超额拒绝）
 *  7) 稳定性（30天无 NaN/Inf，netWorth 不变量恒成立）
 *  8) 不变量（现货订单不受节点影响，仍可生成、两端可为任意城市）
 *
 * 本脚本只读调用引擎纯函数，不修改任何业务代码。
 */

import {
  createInitialState,
  buildNode,
  leaseVehicle,
  returnLease,
  borrowMoney,
  repayLoan,
  maxLoan,
  advanceDay,
  netWorth,
  nodeAsset,
  vehicleAsset,
  acceptOrder,
  dispatchOrder,
} from '../src/game/engine'
import {
  LEASE_DAILY_RATE,
  LOAN_DAILY_RATE,
  VEHICLE_TYPE_MAP,
} from '../src/game/content'
import type { GameState } from '../src/game/types'

// ---------- 轻量断言框架 ----------
let pass = 0
let fail = 0
const failures: string[] = []

function check(name: string, cond: boolean, detail = ''): void {
  if (cond) {
    pass++
    console.log(`  ✓ PASS: ${name}`)
  } else {
    fail++
    const d = detail ? `  -> ${detail}` : ''
    failures.push(`${name}${d}`)
    console.log(`  ✗ FAIL: ${name}${d}`)
  }
}

function eq(name: string, actual: unknown, expected: unknown): void {
  check(name, actual === expected, `(expected ${expected}, got ${actual})`)
}

// ---------- 关键数值示例（用于在报告中展示） ----------
const examples: Record<string, unknown> = {}

console.log('\n================ 经济机制验证 ================\n')

// ================= 2) 初始状态 =================
console.log('【2】初始状态')
{
  const s = createInitialState()
  eq('初始 debt === 0', s.debt, 0)
  check('初始生成 6 笔订单', s.orders.length === 6, `实际 ${s.orders.length}`)
  check(
    '初始所有订单 status === available',
    s.orders.every((o) => o.status === 'available')
  )
  check(
    '初始所有订单 kind === spot',
    s.orders.every((o) => o.kind === 'spot')
  )
  check('初始未使用租赁/借贷', s.usedLeaseOrLoan === false)
}

// ================= 3) 合同货依赖建点 =================
console.log('\n【3】合同货依赖建点')
{
  // 3a) 无任何节点：连续 5 天不应出现 contract
  let s = createInitialState()
  for (let i = 0; i < 5; i++) s = advanceDay(s)
  const contractsNoNode = s.orders.filter((o) => o.kind === 'contract')
  eq('无节点 5 天后 contract 数量 === 0', contractsNoNode.length, 0)

  // 3b) 建 3 个城市节点（station 最便宜，仅作网络存在性；base 取城市 tier）
  // 注：用「两个不同城市」已满足清单最低要求；但两城时每日 contract 结构性恒为 1，
  // 无法观察波动，故额外建第 3 城以验证「日生成量随天数波动」。
  for (const c of ['北京', '上海', '广州']) s = buildNode(s, c, 'station')
  check('建点后节点数 === 3', Object.keys(s.nodes).length === 3)

  // 3c) 多天推进，收集每日新生成 contract 数量（按 issuedDay 判定当日生成）
  const dailyCounts: number[] = []
  let allEndpointsBuilt = true
  let sawContract = false
  for (let i = 0; i < 30; i++) {
    s = advanceDay(s)
    const todays = s.orders.filter(
      (o) => o.kind === 'contract' && o.issuedDay === s.day
    )
    dailyCounts.push(todays.length)
    if (todays.length > 0) sawContract = true
    for (const o of todays) {
      if (!(o.fromCityId in s.nodes) || !(o.toCityId in s.nodes))
        allEndpointsBuilt = false
    }
  }
  check('建点后确实产生 contract 订单', sawContract)
  check('所有 contract 订单两端城市均已在 nodes 中', allEndpointsBuilt)

  const distinct = new Set(dailyCounts)
  check(
    '合同货日生成量非恒定（随天数波动）',
    distinct.size >= 2,
    `dailyCounts=[${dailyCounts.join(',')}]`
  )
  check(
    '合同货日生成量处于合理区间(>=1 且 <=3)',
    dailyCounts.every((c) => c >= 1 && c <= 3),
    `dailyCounts=[${dailyCounts.join(',')}]`
  )
  examples.contractDailyCounts = dailyCounts
  examples.contractDistinctValues = [...distinct].sort((a, b) => a - b)
}

// ================= 4) 租赁合同经济 =================
console.log('\n【4】租赁合同经济（htruck）')
{
  const htruckCost = VEHICLE_TYPE_MAP['htruck'].cost // 380000
  const expectedLeaseDaily = Math.round(htruckCost * LEASE_DAILY_RATE) // 7600
  eq('htruck 日租 = round(cost*0.02)', expectedLeaseDaily, Math.round(380000 * 0.02))
  examples.htruckCost = htruckCost
  examples.htruckLeaseDaily = expectedLeaseDaily

  let s = createInitialState()
  s = leaseVehicle(s, 'htruck')
  const leasedId = s.vehicles[s.vehicles.length - 1].id
  const leased = s.vehicles.find((v) => v.id === leasedId)!
  check('租赁车 owned === false', leased.owned === false)
  eq('租赁车 leaseDaily === 预期', leased.leaseDaily, expectedLeaseDaily)
  check('租赁车 leaseUntilDay === null（长租）', leased.leaseUntilDay === null)

  const moneyBefore = s.money
  const debtBefore = s.debt
  s = advanceDay(s)
  eq('advanceDay 后 money 减少额 === leaseDaily', moneyBefore - s.money, expectedLeaseDaily)
  eq('advanceDay 后 debt 不变', s.debt, debtBefore)
  check(
    '事件含「租赁费」字样',
    s.events.some((e) => e.text.includes('租赁费'))
  )
  // leaseUntilDay 为 null 时不自动退租
  check('长租（leaseUntilDay=null）未自动退租', s.vehicles.some((v) => v.id === leasedId))
}

// ================= 5) 退租守卫 =================
console.log('\n【5】退租守卫（运输中不可退 / 空闲后可退）')
{
  let s = createInitialState()
  s = buildNode(s, '北京', 'station')
  s = buildNode(s, '上海', 'station')
  // 用 train（载重 1500）确保任意合同货重量都能派车成功
  s = leaseVehicle(s, 'train')
  const leasedId = s.vehicles[s.vehicles.length - 1].id
  s = advanceDay(s) // 生成 北京<->上海 合同货
  const contract = s.orders.find(
    (o) => o.kind === 'contract' && o.status === 'available'
  )
  check('找到可派车的合同货', !!contract)
  if (contract) {
    s = acceptOrder(s, contract.id)
    s = dispatchOrder(s, contract.id, leasedId)
  }
  const afterDispatch = s.vehicles.find((v) => v.id === leasedId)!
  check('派车后 busyUntilDay 非空', afterDispatch.busyUntilDay !== null)

  const vLenBefore = s.vehicles.length
  const sBusy = returnLease(s, leasedId) // 运输中退租
  check('运输中退租被拒：车辆数不变', sBusy.vehicles.length === vLenBefore)
  const stillThere = sBusy.vehicles.find((v) => v.id === leasedId)!
  check('运输中退租被拒：车辆仍在', !!stillThere)
  check('运输中退租被拒：owned 仍 false', stillThere.owned === false)
  check('运输中退租被拒：busyUntilDay 仍非空', stillThere.busyUntilDay !== null)
  check(
    '运输中退租事件为 warn',
    sBusy.events.slice(-1)[0]?.kind === 'warn'
  )

  // 推进至车辆空闲
  let guard = 0
  let sIdle = sBusy
  while (
    sIdle.vehicles.find((v) => v.id === leasedId)?.busyUntilDay !== null &&
    guard++ < 60
  ) {
    sIdle = advanceDay(sIdle)
  }
  const idleV = sIdle.vehicles.find((v) => v.id === leasedId)!
  check('空闲后 busyUntilDay 为空', idleV.busyUntilDay === null)

  const vLenIdle = sIdle.vehicles.length
  const sReturned = returnLease(sIdle, leasedId)
  check(
    '空闲后成功退租：车辆被移除',
    sReturned.vehicles.length === vLenIdle - 1 &&
      !sReturned.vehicles.find((v) => v.id === leasedId)
  )
}

// ================= 6) 借贷经济 =================
console.log('\n【6】借贷经济')
{
  let s = createInitialState()
  const limit = maxLoan(s)
  examples.initialMaxLoan = limit
  check('maxLoan 为正数', limit > 0)

  const moneyBefore = s.money
  const debtBefore = s.debt
  s = borrowMoney(s, limit)
  eq('借款后 money 增加额 === limit', s.money - moneyBefore, limit)
  eq('借款后 debt 增加额 === limit', s.debt - debtBefore, limit)
  eq('借款后 debt === limit', s.debt, limit)

  const moneyBeforeAD = s.money
  const expectedInterest = Math.round(s.debt * LOAN_DAILY_RATE)
  examples.loanDailyInterest = expectedInterest
  s = advanceDay(s)
  eq('advanceDay 后 money 减少额 === 利息', moneyBeforeAD - s.money, expectedInterest)
  eq('advanceDay 后 debt 不变', s.debt, limit)
  check('事件含「利息」字样', s.events.some((e) => e.text.includes('利息')))

  // 还清
  const moneyBeforeRepay = s.money
  const debtBeforeRepay = s.debt
  s = repayLoan(s, debtBeforeRepay)
  eq('还清后 debt === 0', s.debt, 0)
  eq('还清后 money 减少额 === 还款前 debt', moneyBeforeRepay - s.money, debtBeforeRepay)

  // 超额借款应被拒（money/debt 不变，事件 warn）
  let s2 = createInitialState()
  const limit2 = maxLoan(s2)
  const m2 = s2.money
  const d2 = s2.debt
  s2 = borrowMoney(s2, limit2 + 1)
  eq('超额借款 money 不变', s2.money, m2)
  eq('超额借款 debt 不变', s2.debt, d2)
  check('超额借款事件为 warn', s2.events.slice(-1)[0]?.kind === 'warn')

  // 非法金额（<=0 / 非有限）应被拒
  const s3 = createInitialState()
  const s3neg = borrowMoney(s3, -100)
  eq('负数借款 money 不变', s3neg.money, s3.money)
  const s3zero = borrowMoney(s3, 0)
  eq('零借款 money 不变', s3zero.money, s3.money)
}

// ================= 7) 稳定性（30 天） =================
console.log('\n【7】稳定性（无节点起步→建4点/租2车/借一笔→连续 30 天）')
{
  let s = createInitialState()
  for (const c of ['北京', '上海', '广州', '深圳']) s = buildNode(s, c, 'station')
  s = leaseVehicle(s, 'ltruck') // leaseDaily = round(150000*0.02)=3000
  s = leaseVehicle(s, 'htruck') // 7600
  const lim = maxLoan(s)
  s = borrowMoney(s, lim)

  let stable = true
  let invariantOk = true
  let badDetail = ''
  for (let d = 0; d < 30; d++) {
    s = advanceDay(s)
    const nums = [
      s.money,
      s.debt,
      s.reputation,
      netWorth(s),
      nodeAsset(s),
      vehicleAsset(s),
    ]
    if (nums.some((n) => !Number.isFinite(n))) {
      stable = false
      badDetail = `day ${s.day} 出现非有限数值: [${nums.join(', ')}]`
      break
    }
    const expectedNW = s.money + nodeAsset(s) + vehicleAsset(s) - s.debt
    if (expectedNW !== netWorth(s)) {
      invariantOk = false
      badDetail = `day ${s.day} netWorth 不变量失配: 期望 ${expectedNW}, 实际 ${netWorth(s)}`
      break
    }
  }
  check('30 天全程无 NaN/Infinity', stable, badDetail)
  check('netWorth 不变量恒成立', invariantOk, badDetail)
  examples.stabilityFinalMoney = s.money
  examples.stabilityFinalDebt = s.debt
  examples.stabilityFinalNetWorth = netWorth(s)
}

// ================= 8) 不变量：现货订单不受节点影响 =================
console.log('\n【8】现货订单不变量（无节点时仍正常生成，两端可为任意城市）')
{
  let s = createInitialState()
  let sawSpot = false
  let spotEndpointUnconstrained = false
  for (let i = 0; i < 5; i++) {
    s = advanceDay(s)
    const spots = s.orders.filter((o) => o.kind === 'spot')
    if (spots.length > 0) sawSpot = true
    // 无节点状态下，所有现货订单端点必然不在 nodes 中（验证现货不要求建点）
    if (spots.some((o) => !(o.fromCityId in s.nodes) || !(o.toCityId in s.nodes)))
      spotEndpointUnconstrained = true
  }
  check('无节点时现货订单仍正常生成', sawSpot)
  check('现货订单两端可为任意城市（不要求建点）', spotEndpointUnconstrained)
  check('无节点时所有订单均为 spot（无 contract）', s.orders.every((o) => o.kind === 'spot'))
}

// ================= 报告 =================
console.log('\n================ 验证结果汇总 ================')
console.log(`通过用例: ${pass}`)
console.log(`失败用例: ${fail}`)
if (failures.length > 0) {
  console.log('\n失败明细:')
  for (const f of failures) console.log('  - ' + f)
}
console.log('\n关键数值示例:')
console.log(JSON.stringify(examples, null, 2))

console.log(
  `\n结论: ${fail === 0 ? '全部通过 ✅' : `存在 ${fail} 项失败 ❌`}`
)
process.exit(fail === 0 ? 0 : 1)
