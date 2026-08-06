// 服务端 DTO 类型（与 server/internal/model 的 JSON 标签对齐，§8.2/§8.3）。

export interface User {
  id: string
  username: string
  email: string
  createdAt: string
}

export interface World {
  id: string
  name: string
  tickSeconds: number
  status: string
  currentDay: number
  seedConfig: string
  createdAt: string
}

export interface Company {
  id: string
  worldId: string
  ownerId: string
  name: string
  cash: number
  reputation: number
  debt: number
  netWorth: number
  allianceId: string | null
  broke: boolean
  createdAt: string
}

export interface Node {
  id: string
  companyId: string
  worldId: string
  cityId: string
  cityName: string
  tier: string
  builtDay: number
  capacity: number
  handlingDays: number
  lat: number
  lng: number
}

export interface Vehicle {
  id: string
  companyId: string
  typeId: string
  mode: string
  capacityTons: number
  speedKmh: number
  owned: boolean
  leaseDaily: number
  leaseUntilDay: number | null
  busyUntilDay: number | null
  status: string
}

export interface Lane {
  id: string
  companyId: string
  worldId: string
  fromCityId: string
  toCityId: string
  mode: string
  capacityTonsPerDay: number
  pricePerTon: number
  transitDays: number
  interline: boolean
  active: boolean
  createdDay: number
}

export interface Order {
  id: string
  worldId: string
  companyId: string
  kind: string
  fromCityId: string
  toCityId: string
  tons: number
  pricePerTon: number
  reward: number
  mode: string
  acceptedDay: number
  deadlineDay: number
  status: string
  vehicleId: string | null
  laneId: string | null
}

export interface CargoPool {
  id: string
  worldId: string
  fromCityId: string
  toCityId: string
  totalTons: number
  windowDays: number
  generatedDay: number
  expiresDay: number
}

export interface MarketListing {
  id: string
  worldId: string
  listerCompanyId: string
  type: string
  fromCityId: string
  toCityId: string
  tons: number
  pricePerTon: number
  mode: string
  status: string
  createdDay: number
  filledDay: number | null
  buyerCompanyId: string | null
}

export interface LedgerEvent {
  id: string
  companyId: string
  worldId: string
  day: number
  type: string
  amount: number
  note: string
}

export interface Alliance {
  id: string
  worldId: string
  name: string
  interlineEnabled: boolean
  createdDay: number
}

export interface CompanySnap {
  id: string
  name: string
  cash: number
  reputation: number
  netWorth: number
  rank: number
  broke: boolean
}

export interface CargoPoolSnap {
  from: string
  to: string
  totalTons: number
  expiresDay: number
}

export interface EventSnap {
  day: number
  type: string
  amount: number
  note: string
}

export interface SnapshotMsg {
  type: 'world_snapshot'
  day: number
  companies: CompanySnap[]
  cargoPools: CargoPoolSnap[]
  market: MarketListing[]
  lanes: Lane[]
}

export interface DeltaMsg {
  type: 'delta'
  day: number
  companies: CompanySnap[]
  newOrders: Order[]
  market: MarketListing[]
  events: EventSnap[]
}

export interface WelcomeMsg {
  type: 'welcome'
  you: {
    companyId: string
    name: string
    cash: number
    reputation: number
    netWorth: number
  }
  world: {
    id: string
    name: string
    day: number
    status: string
  }
}

export interface OpponentSnap {
  id: string
  name: string
  cash: number
  reputation: number
  netWorth: number
  rank: number
  broke: boolean
}
