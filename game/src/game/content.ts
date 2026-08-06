import type { City, NodeTier, NodeTypeInfo, VehicleType } from './types'

export const NODE_TYPES: Record<NodeTier, NodeTypeInfo> = {
  station: {
    label: '物流站点',
    cost: 200000,
    throughput: 1,
    handlingDays: 1.0,
    color: '#34d399',
    desc: '末端收发点，可同时处理 1 笔订单',
  },
  local: {
    label: '物流中心',
    cost: 500000,
    throughput: 2,
    handlingDays: 0.5,
    color: '#38bdf8',
    desc: '区县级集散中心，处理 2 笔',
  },
  city: {
    label: '城市节点',
    cost: 1000000,
    throughput: 4,
    handlingDays: 0.3,
    color: '#f59e0b',
    desc: '地级市枢纽，处理 4 笔',
  },
  hub: {
    label: '中转枢纽',
    cost: 2500000,
    throughput: 8,
    handlingDays: 0.2,
    color: '#a78bfa',
    desc: '区域中转中心，处理 8 笔，可作干线节点',
  },
}

export const NODE_TIER_ORDER: NodeTier[] = ['station', 'local', 'city', 'hub']

export const VEHICLE_TYPES: VehicleType[] = [
  {
    id: 'ltruck',
    name: '轻型厢货',
    mode: 'road',
    capacity: 8,
    speed: 80,
    cost: 150000,
    fuelPerKm: 0.9,
    desc: '城配利器，8 吨，灵活便宜',
  },
  {
    id: 'htruck',
    name: '重型卡车',
    mode: 'road',
    capacity: 40,
    speed: 70,
    cost: 380000,
    fuelPerKm: 1.6,
    desc: '干线公路王，40 吨',
  },
  {
    id: 'train',
    name: '货运列车',
    mode: 'rail',
    capacity: 1500,
    speed: 95,
    cost: 3000000,
    fuelPerKm: 0.06,
    desc: '大宗铁路，1500 吨超省钱',
  },
  {
    id: 'plane',
    name: '货运飞机',
    mode: 'air',
    capacity: 120,
    speed: 750,
    cost: 9000000,
    fuelPerKm: 7,
    desc: '极速空运，120 吨，烧钱',
  },
  {
    id: 'ship',
    name: '远洋货轮',
    mode: 'sea',
    capacity: 6000,
    speed: 33,
    cost: 5500000,
    fuelPerKm: 0.03,
    desc: '海运巨无霸，6000 吨，仅限沿海',
  },
]

export const VEHICLE_TYPE_MAP: Record<string, VehicleType> =
  Object.fromEntries(VEHICLE_TYPES.map((v) => [v.id, v]))

export const CARGO_TYPES = [
  '电子产品',
  '生鲜冷链',
  '服装百货',
  '工业原料',
  '汽车配件',
  '医药用品',
  '建材家居',
  '图书文具',
  '农副产品',
  '精密仪器',
]

export const MODE_LABEL: Record<string, string> = {
  road: '公路',
  rail: '铁路',
  air: '航空',
  sea: '海运',
}

export function cityTierMult(tier: 1 | 2 | 3): number {
  return tier === 1 ? 1 : tier === 2 ? 0.8 : 0.6
}

export function buildCost(tier: NodeTier, cityTier: 1 | 2 | 3): number {
  return Math.round(NODE_TYPES[tier].cost * cityTierMult(cityTier))
}

export function cityLabel(c: City): string {
  return c.tier === 1 ? '一线枢纽' : c.tier === 2 ? '省会城市' : '其他城市'
}

/** 租赁日租金比例：日租 = round(车价 * 该比例) */
export const LEASE_DAILY_RATE = 0.02

/** 贷款日利率：0.2%/天（约月 6%） */
export const LOAN_DAILY_RATE = 0.002

/** 合同货基础货量（按城市重要度 tier 1/2/3） */
export const CONTRACT_BASE: Record<1 | 2 | 3, number> = {
  1: 3,
  2: 2.4,
  3: 1.8,
}
