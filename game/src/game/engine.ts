import { CITIES, getCity } from './cities'
import {
  NODE_TYPES,
  NODE_TIER_ORDER,
  VEHICLE_TYPE_MAP,
  CARGO_TYPES,
  buildCost,
  LEASE_DAILY_RATE,
  LOAN_DAILY_RATE,
  CONTRACT_BASE,
} from './content'
import { haversineKm } from './geo'
import type {
  City,
  GameEvent,
  GameState,
  NodeTier,
  Order,
  OrderKind,
  Vehicle,
} from './types'

const HOURS_PER_DAY = 10

// ---------- 事件辅助 ----------
function ev(
  s: GameState,
  text: string,
  kind: GameEvent['kind']
): GameEvent {
  return { id: s.nextId, day: s.day, text, kind }
}

function withEvent(
  s: GameState,
  text: string,
  kind: GameEvent['kind']
): GameState {
  const e = ev(s, text, kind)
  return {
    ...s,
    nextId: s.nextId + 1,
    events: [...s.events, e].slice(-80),
  }
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

/** 从数组中挑一个不等于 exclude 的元素 */
function pickOther(arr: string[], exclude: string): string | null {
  const pool = arr.filter((x) => x !== exclude)
  if (pool.length === 0) return null
  return pool[Math.floor(Math.random() * pool.length)]
}

/** 数字千分位格式化（与现有事件文案风格一致） */
function fm(n: number): string {
  return Math.round(n).toLocaleString('zh-CN')
}

// ---------- 订单生成 ----------
/**
 * 生成一笔货单的核心逻辑（现货与合同货共用）。
 * @param kind 'spot'=市场现货（外部货运活），'contract'=合同/网络稳定货流（价格×0.85）
 */
function makeOrderFields(
  day: number,
  nid: number,
  from: City,
  to: City,
  kind: OrderKind
): { order: Order; nid: number } {
  const d = haversineKm([from.lng, from.lat], [to.lng, to.lat])
  const r = Math.random()
  let weight: number
  if (r < 0.4) weight = 1 + Math.random() * 7 // 小件
  else if (r < 0.75) weight = 8 + Math.random() * 32 // 中件
  else if (r < 0.95) weight = 40 + Math.random() * 260 // 大件
  else weight = 300 + Math.random() * 300 // 超大件
  weight = Math.round(weight * 10) / 10

  const repMult = 1 + 50 / 200 // 基础系数，reputation 在 advanceDay 中影响生成量
  const rewardMult = kind === 'contract' ? 0.85 : 1 // 合同货为稳定价，略低于现货
  const reward = Math.round(
    (5000 + d * weight * 0.12 + weight * 200) * repMult * rewardMult
  )
  const deadline = day + Math.max(3, Math.ceil(d / 600) + 4)

  const order: Order = {
    id: 'o' + nid,
    fromCityId: from.id,
    toCityId: to.id,
    cargo: pick(CARGO_TYPES),
    weight,
    reward,
    fuelCost: 0,
    deadlineDay: deadline,
    issuedDay: day,
    status: 'available',
    vehicleId: null,
    dispatchedDay: null,
    arriveDay: null,
    distanceKm: d,
    kind,
  }
  return { order, nid: nid + 1 }
}

/** 现货货单：两端为随机城市 */
function makeOrder(day: number, nid: number): { order: Order; nid: number } {
  const from = pick(CITIES)
  let to = pick(CITIES)
  let guard = 0
  while (to.id === from.id && guard++ < 10) to = pick(CITIES)
  return makeOrderFields(day, nid, from, to, 'spot')
}

// ---------- 选择器 ----------
export function nodeAt(s: GameState, cityId: string): NodeTier | undefined {
  return s.nodes[cityId]
}

export function canService(s: GameState, o: Order): boolean {
  return !!nodeAt(s, o.fromCityId) && !!nodeAt(s, o.toCityId)
}

export function cityUsedSlots(s: GameState, cityId: string): number {
  return s.orders.filter(
    (o) =>
      (o.status === 'accepted' || o.status === 'inTransit') &&
      (o.fromCityId === cityId || o.toCityId === cityId)
  ).length
}

export function cityFreeSlots(s: GameState, cityId: string): number {
  const t = nodeAt(s, cityId)
  if (!t) return 0
  return NODE_TYPES[t].throughput - cityUsedSlots(s, cityId)
}

export function modeValid(s: GameState, o: Order, v: Vehicle): boolean {
  if (v.mode !== 'sea') return true
  return getCity(o.fromCityId).coastal && getCity(o.toCityId).coastal
}

export function eligibleVehicles(s: GameState, o: Order): Vehicle[] {
  return s.vehicles.filter(
    (v) => !v.busyUntilDay && v.capacity >= o.weight && modeValid(s, o, v)
  )
}

export function tripInfo(
  s: GameState,
  o: Order,
  v: Vehicle
): { distanceKm: number; days: number; fuelCost: number } {
  const a = getCity(o.fromCityId)
  const b = getCity(o.toCityId)
  const d = haversineKm([a.lng, a.lat], [b.lng, b.lat])
  const tf = NODE_TYPES[nodeAt(s, o.fromCityId)!].handlingDays
  const tt = NODE_TYPES[nodeAt(s, o.toCityId)!].handlingDays
  const handlingDays = (tf + tt) / 2
  const travelDays = d / (v.speed * HOURS_PER_DAY)
  const days = Math.max(1, Math.ceil(travelDays + handlingDays))
  const fuelCost = Math.round(d * v.fuelPerKm)
  return { distanceKm: d, days, fuelCost }
}

export function orderLabel(o: Order): string {
  return `${getCity(o.fromCityId).name} → ${getCity(o.toCityId).name}`
}

// ---------- 初始化 ----------
export function createInitialState(): GameState {
  let s: GameState = {
    day: 1,
    money: 1000000,
    reputation: 50,
    debt: 0,
    nodes: {},
    vehicles: [],
    orders: [],
    events: [],
    selectedCityId: null,
    selectedOrderId: null,
    nextId: 1,
    usedLeaseOrLoan: false,
  }
  let nid = 1
  for (let i = 0; i < 6; i++) {
    const { order, nid: nn } = makeOrder(1, nid)
    s.orders.push(order)
    nid = nn
  }
  s = withEvent(
    s,
    '欢迎来到《物流大亨》！先在地图上点选两个城市、建好物流点，就能承接货运订单赚钱。',
    'info'
  )
  return s
}

// ---------- 动作 ----------
export function buildNode(
  s: GameState,
  cityId: string,
  tier: NodeTier
): GameState {
  const city = getCity(cityId)
  const existing = s.nodes[cityId]
  const cityTier = city.tier
  if (existing) {
    const exIdx = NODE_TIER_ORDER.indexOf(existing)
    const newIdx = NODE_TIER_ORDER.indexOf(tier)
    if (newIdx <= exIdx)
      return withEvent(s, `${city.name} 已是同级或更高等级。`, 'warn')
    const cost = buildCost(tier, cityTier) - buildCost(existing, cityTier)
    if (s.money < cost)
      return withEvent(s, `资金不足，无法将 ${city.name} 升级。`, 'warn')
    return withEvent(
      {
        ...s,
        money: s.money - cost,
        nodes: { ...s.nodes, [cityId]: tier },
      },
      `${city.name} 物流点升级为「${NODE_TYPES[tier].label}」。`,
      'success'
    )
  }
  const cost = buildCost(tier, cityTier)
  if (s.money < cost)
    return withEvent(s, `资金不足，无法在 ${city.name} 建设。`, 'warn')
  return withEvent(
    {
      ...s,
      money: s.money - cost,
      nodes: { ...s.nodes, [cityId]: tier },
    },
    `${city.name} 建成「${NODE_TYPES[tier].label}」（耗资 ${cost.toLocaleString(
      'zh-CN'
    )} 元）。`,
    'success'
  )
}

export function buyVehicle(s: GameState, typeId: string): GameState {
  const t = VEHICLE_TYPE_MAP[typeId]
  if (!t) return s
  if (s.money < t.cost)
    return withEvent(s, `资金不足，买不起 ${t.name}。`, 'warn')
  const v: Vehicle = {
    id: 'v' + s.nextId,
    typeId: t.id,
    name: t.name,
    mode: t.mode,
    capacity: t.capacity,
    speed: t.speed,
    fuelPerKm: t.fuelPerKm,
    busyUntilDay: null,
    assignedOrderId: null,
    owned: true,
    leaseDaily: 0,
    leaseUntilDay: null,
  }
  return withEvent(
    {
      ...s,
      money: s.money - t.cost,
      nextId: s.nextId + 1,
      vehicles: [...s.vehicles, v],
    },
    `购入 ${t.name}（载重 ${t.capacity} 吨）。`,
    'success'
  )
}

// ---------- 车辆租赁 ----------
export function leaseVehicle(s: GameState, typeId: string): GameState {
  const t = VEHICLE_TYPE_MAP[typeId]
  if (!t) return s
  const leaseDaily = Math.round(t.cost * LEASE_DAILY_RATE)
  const v: Vehicle = {
    id: 'v' + s.nextId,
    typeId: t.id,
    name: t.name,
    mode: t.mode,
    capacity: t.capacity,
    speed: t.speed,
    fuelPerKm: t.fuelPerKm,
    busyUntilDay: null,
    assignedOrderId: null,
    owned: false,
    leaseDaily,
    leaseUntilDay: null,
  }
  const added: GameState = {
    ...s,
    nextId: s.nextId + 1,
    vehicles: [...s.vehicles, v],
    usedLeaseOrLoan: true,
  }
  // 纯日租、无押金，资金不足也允许（靠借贷周转），但给出提醒
  if (s.money < 0) {
    return withEvent(
      added,
      `资金不足，靠借贷租赁 ${t.name}（日租 ${fm(leaseDaily)} 元）。`,
      'warn'
    )
  }
  return withEvent(
    added,
    `租赁 ${t.name}（日租 ${fm(leaseDaily)} 元）。`,
    'success'
  )
}

export function returnLease(s: GameState, vehicleId: string): GameState {
  const v = s.vehicles.find((x) => x.id === vehicleId)
  if (!v) return s
  if (v.owned !== false)
    return withEvent(s, `${v.name} 为自有车辆，无需退租。`, 'warn')
  if (v.busyUntilDay !== null)
    return withEvent(s, `运输中无法退租 ${v.name}。`, 'warn')
  return withEvent(
    { ...s, vehicles: s.vehicles.filter((x) => x.id !== vehicleId) },
    `已退租 ${v.name}，停止日租。`,
    'info'
  )
}

// ---------- 资金借贷 ----------
export function maxLoan(s: GameState): number {
  return Math.round(netWorth(s) * 0.6 + s.reputation * 8000)
}

export function borrowMoney(s: GameState, amount: number): GameState {
  if (!Number.isFinite(amount) || amount <= 0)
    return withEvent(s, '借款金额无效。', 'warn')
  const limit = maxLoan(s)
  if (amount > limit)
    return withEvent(s, `借款额超过上限 ${fm(limit)} 元。`, 'warn')
  const debt = s.debt + amount
  return withEvent(
    { ...s, money: s.money + amount, debt, usedLeaseOrLoan: true },
    `借款 ${fm(amount)} 元（负债 ${fm(debt)}，日息 ${fm(
      Math.round(debt * LOAN_DAILY_RATE)
    )} 元）。`,
    'info'
  )
}

export function repayLoan(s: GameState, amount: number): GameState {
  if (!Number.isFinite(amount) || amount <= 0)
    return withEvent(s, '还款金额无效。', 'warn')
  const pay = Math.min(amount, s.debt, Math.max(0, s.money))
  if (pay <= 0)
    return withEvent(s, '无可还款项（现金或负债不足）。', 'warn')
  return withEvent(
    {
      ...s,
      money: s.money - pay,
      debt: s.debt - pay,
    },
    `还款 ${fm(pay)} 元，剩余负债 ${fm(s.debt - pay)} 元。`,
    'info'
  )
}

export function acceptOrder(s: GameState, orderId: string): GameState {
  const o = s.orders.find((x) => x.id === orderId)
  if (!o || o.status !== 'available') return s
  if (!canService(s, o))
    return withEvent(s, `订单「${orderLabel(o)}」两端城市尚未建点，无法承接。`, 'warn')
  if (cityFreeSlots(s, o.fromCityId) <= 0 || cityFreeSlots(s, o.toCityId) <= 0)
    return withEvent(
      s,
      `${orderLabel(o)} 的城市处理仓位已满，先升级物流点或等运单完成。`,
      'warn'
    )
  const orders = s.orders.map((x) =>
    x.id === orderId ? { ...x, status: 'accepted' as const } : x
  )
  return withEvent(
    { ...s, orders },
    `已承接订单：${orderLabel(o)}（${o.cargo} ${o.weight} 吨），等待派车。`,
    'info'
  )
}

export function dispatchOrder(
  s: GameState,
  orderId: string,
  vehicleId: string
): GameState {
  const o = s.orders.find((x) => x.id === orderId)
  const v = s.vehicles.find((x) => x.id === vehicleId)
  if (!o || !v) return s
  if (o.status !== 'accepted') return s
  if (v.busyUntilDay) return withEvent(s, '该车辆正在执行其他任务。', 'warn')
  if (v.capacity < o.weight)
    return withEvent(s, '车辆载重不足。', 'warn')
  if (!modeValid(s, o, v))
    return withEvent(
      s,
      '该车辆运输方式不支持此线路（货轮需两端皆为沿海城市）。',
      'warn'
    )
  if (!canService(s, o)) return withEvent(s, '两端城市未建点。', 'warn')

  const ti = tripInfo(s, o, v)
  const arriveDay = s.day + ti.days
  const orders = s.orders.map((x) =>
    x.id === orderId
      ? {
          ...x,
          status: 'inTransit' as const,
          vehicleId,
          dispatchedDay: s.day,
          arriveDay,
          fuelCost: ti.fuelCost,
          distanceKm: ti.distanceKm,
        }
      : x
  )
  const vehicles = s.vehicles.map((x) =>
    x.id === vehicleId
      ? { ...x, busyUntilDay: arriveDay, assignedOrderId: orderId }
      : x
  )
  return withEvent(
    { ...s, orders, vehicles, selectedOrderId: null },
    `派车成功：${v.name} 从 ${getCity(o.fromCityId).name} → ${
      getCity(o.toCityId).name
    }，约 ${ti.days} 天（油费 ${ti.fuelCost.toLocaleString('zh-CN')} 元）。`,
    'success'
  )
}

export function advanceDay(s: GameState): GameState {
  const day = s.day + 1
  let money = s.money
  let reputation = s.reputation
  const newEvents: GameEvent[] = []
  let nid = s.nextId

  const push = (text: string, kind: GameEvent['kind']) => {
    newEvents.push({ id: nid, day, text, kind })
    nid += 1
  }

  // 1) 到达结算
  const arriving = s.orders.filter(
    (o) => o.status === 'inTransit' && day >= (o.arriveDay ?? Infinity)
  )
  for (const o of arriving) {
    const profit = o.reward - o.fuelCost
    money += profit
    reputation = Math.min(100, reputation + 1)
    push(
      `订单完成：${orderLabel(o)} 送达，结算 ${
        profit >= 0 ? '+' : ''
      }${Math.round(profit).toLocaleString('zh-CN', {
        style: 'currency',
        currency: 'CNY',
        maximumFractionDigits: 0,
      })}（含油费 ${o.fuelCost.toLocaleString('zh-CN')} 元）。`,
      profit >= 0 ? 'success' : 'warn'
    )
  }

  // 2) 状态迁移：在途→完成；已接单超期→过期
  let orders = s.orders.map((o) => {
    if (o.status === 'inTransit' && day >= (o.arriveDay ?? Infinity))
      return { ...o, status: 'completed' as const }
    if (o.status === 'accepted' && day > o.deadlineDay)
      return { ...o, status: 'expired' as const }
    return o
  })

  // 3) 释放车辆
  let vehicles = s.vehicles.map((v) =>
    v.busyUntilDay && v.busyUntilDay <= day
      ? { ...v, busyUntilDay: null, assignedOrderId: null }
      : v
  )

  // 4) 过期惩罚
  const expiredAccepted = orders.filter((o) => o.status === 'expired')
  for (const o of expiredAccepted) {
    reputation = Math.max(0, reputation - 3)
    push(`订单超时未送达：「${orderLabel(o)}」流失，声誉 -3。`, 'danger')
  }

  // 5) 清理过期可接订单（无惩罚）
  const before = orders.length
  orders = orders.filter(
    (o) => !(o.status === 'available' && day > o.deadlineDay)
  )
  if (orders.length < before) push('部分过期货单已从板上移除。', 'info')

  // 6) 生成新订单（现货）
  const genCount = 2 + Math.floor(reputation / 25) + Math.floor(Math.random() * 3)
  for (let i = 0; i < genCount; i++) {
    const { order, nid: nn } = makeOrder(day, nid)
    orders.push(order)
    nid = nn
  }
  push(`第 ${day} 天开始，新增 ${genCount} 笔现货货单。`, 'info')

  // 6b) 合同货：仅当玩家已在两端城市都建点才产生；数量随城市重要度与波动变化
  const builtCityIds = Object.keys(s.nodes)
  if (builtCityIds.length >= 2) {
    const usedPairs = new Set<string>()
    let contractCount = 0
    for (const fromId of builtCityIds) {
      const fromCity = getCity(fromId)
      const base = CONTRACT_BASE[fromCity.tier]
      const wave = 0.4 + Math.random() * 1.2 // 0.4 ~ 1.6，体现货流不稳定
      const want = Math.round(base * wave)
      for (let k = 0; k < want; k++) {
        const toId = pickOther(builtCityIds, fromId)
        if (!toId) break
        const key = [fromId, toId].sort().join('|')
        if (usedPairs.has(key)) continue // 每对城市每天最多 1 笔
        usedPairs.add(key)
        const { order, nid: nn } = makeOrderFields(
          day,
          nid,
          fromCity,
          getCity(toId),
          'contract'
        )
        orders.push(order)
        nid = nn
        contractCount += 1
      }
    }
    if (contractCount > 0)
      push(`物流网络产生 ${contractCount} 笔合同货（稳定货流）。`, 'info')
  }

  // 7) 租赁车日租 & 到期自动退租
  let leaseTotal = 0
  const autoReturned: string[] = []
  vehicles = vehicles.filter((v) => {
    if (v.owned === false) {
      if (v.leaseUntilDay !== null && v.leaseUntilDay <= day) {
        autoReturned.push(v.name)
        return false
      }
      leaseTotal += v.leaseDaily
    }
    return true
  })
  if (leaseTotal > 0) {
    money -= leaseTotal
    push(`车辆租赁费支出 ${fm(leaseTotal)} 元。`, 'warn')
  }
  for (const name of autoReturned)
    push(`租赁到期，${name} 已自动退租。`, 'info')

  // 8) 贷款利息
  if (s.debt > 0) {
    const interest = Math.round(s.debt * LOAN_DAILY_RATE)
    money -= interest
    push(`贷款利息支出 ${fm(interest)} 元。`, 'warn')
  }

  // 9) 资不抵债检查（允许现金为负，靠利息压力倒逼还款，不做硬性 game over）
  const preview: GameState = { ...s, day, money, reputation, orders, vehicles }
  if (netWorth(preview) < 0)
    push('资不抵债！尽快还款或处理资产。', 'danger')

  return {
    ...s,
    day,
    money,
    reputation,
    orders,
    vehicles,
    nextId: nid,
    events: [...s.events, ...newEvents].slice(-80),
  }
}

// ---------- 派生资产 ----------
export function nodeAsset(s: GameState): number {
  let v = 0
  for (const [cityId, tier] of Object.entries(s.nodes)) {
    const city = getCity(cityId)
    v += buildCost(tier, city.tier)
  }
  return v
}

export function vehicleAsset(s: GameState): number {
  return s.vehicles.reduce(
    (sum, v) =>
      sum + (v.owned === false ? 0 : VEHICLE_TYPE_MAP[v.typeId]?.cost ?? 0),
    0
  )
}

export function netWorth(s: GameState): number {
  return s.money + nodeAsset(s) + vehicleAsset(s) - (s.debt ?? 0)
}
