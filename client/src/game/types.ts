// 本文件是从 game/src/game 复制的 vendored snapshot，请勿 import 父工程，升级时直接改本文件。
export type NodeTier = 'station' | 'local' | 'city' | 'hub'
export type TransportMode = 'road' | 'rail' | 'air' | 'sea'

export interface City {
  id: string
  name: string
  lng: number
  lat: number
  /** 城市重要度：1=一线枢纽 2=省会 3=其他 */
  tier: 1 | 2 | 3
  coastal: boolean
}

export interface NodeTypeInfo {
  label: string
  cost: number
  throughput: number
  handlingDays: number
  color: string
  desc: string
}

export interface VehicleType {
  id: string
  name: string
  mode: TransportMode
  capacity: number // 吨
  speed: number // km/h
  cost: number
  fuelPerKm: number
  desc: string
}

export interface Vehicle {
  id: string
  typeId: string
  name: string
  mode: TransportMode
  capacity: number
  speed: number
  fuelPerKm: number
  busyUntilDay: number | null
  assignedOrderId: string | null
  /** 是否自有车辆（false=租赁车） */
  owned: boolean
  /** 日租金（自有车为 0） */
  leaseDaily: number
  /** 租期到期日（null=长租，不自动退租） */
  leaseUntilDay: number | null
}

export type OrderStatus =
  | 'available'
  | 'accepted'
  | 'inTransit'
  | 'completed'
  | 'expired'

/** 货单来源：contract=合同/网络稳定货流，spot=市场现货/外部货运活 */
export type OrderKind = 'contract' | 'spot'
export interface Order {
  id: string
  fromCityId: string
  toCityId: string
  cargo: string
  weight: number // 吨
  reward: number
  fuelCost: number
  deadlineDay: number
  issuedDay: number
  status: OrderStatus
  vehicleId: string | null
  dispatchedDay: number | null
  arriveDay: number | null
  distanceKm: number
  /** 货单来源 */
  kind: OrderKind
}

export interface GameEvent {
  id: number
  day: number
  text: string
  kind: 'info' | 'success' | 'warn' | 'danger'
}

export interface GameState {
  day: number
  money: number
  reputation: number
  /** 负债总额（借款未还部分） */
  debt: number
  nodes: Record<string, NodeTier>
  vehicles: Vehicle[]
  orders: Order[]
  events: GameEvent[]
  selectedCityId: string | null
  selectedOrderId: string | null
  nextId: number
  /** 是否已使用过租赁或借贷（用于经营目标判定） */
  usedLeaseOrLoan?: boolean
}
