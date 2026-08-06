// REST 客户端（§8.2 统一响应 { code, data, message }）。
// 所有请求走同源相对路径：开发由 Vite 代理转发到 Go 后端，生产由 Go 直接托管。

import { useSession } from '../state/session'
import type {
  User,
  World,
  Company,
  Node,
  Vehicle,
  Lane,
  Order,
  MarketListing,
  LedgerEvent,
  Alliance,
  CompanySnap,
  SnapshotMsg,
  OpponentSnap,
} from './types'

const BASE = ''

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = useSession.getState().token
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const merged: RequestInit = {
    ...init,
    headers: { ...headers, ...(init?.headers as Record<string, string> | undefined) },
  }
  const res = await fetch(BASE + path, merged)
  let body: any = null
  try {
    body = await res.json()
  } catch {
    // 非 JSON 响应（如健康检查）忽略
  }
  if (!res.ok) {
    throw new Error(body?.message || `HTTP ${res.status}`)
  }
  if (body && typeof body.code === 'number' && body.code !== 0) {
    throw new Error(body.message || '请求失败')
  }
  return (body?.data ?? null) as T
}

function post<T = unknown>(path: string, payload?: unknown): Promise<T> {
  return apiFetch<T>(path, {
    method: 'POST',
    body: payload ? JSON.stringify(payload) : undefined,
  })
}

// ---- 鉴权 ----
export const register = (username: string, password: string, email: string) =>
  post<{ token: string; userId: string }>('/api/auth/register', { username, password, email })
export const login = (username: string, password: string) =>
  post<{ token: string; userId: string }>('/api/auth/login', { username, password })
export const me = () => apiFetch<User>('/api/auth/me')

// ---- 世界 ----
export const listWorlds = () => apiFetch<World[]>('/api/worlds')
export const createWorld = (name: string, tickSeconds: number) =>
  post<World>('/api/worlds', { name, tickSeconds })
export const joinWorld = (worldId: string) =>
  post<{ companyId: string }>(`/api/worlds/${worldId}/join`)
export const worldState = (worldId: string) =>
  apiFetch<SnapshotMsg>(`/api/worlds/${worldId}/state`)

// ---- 公司 ----
export interface CompanyDetail {
  company: Company
  nodes: Node[]
  vehicles: Vehicle[]
  lanes: Lane[]
  ledger: LedgerEvent[]
}
export const getCompany = (companyId: string) =>
  apiFetch<CompanyDetail>(`/api/companies/${companyId}`)

export const createNode = (companyId: string, cityId: string, tier: string) =>
  post(`/api/companies/${companyId}/nodes`, { cityId, tier })
export const createVehicle = (companyId: string, typeId: string, lease: boolean, leaseDays = 0) =>
  post(`/api/companies/${companyId}/vehicles`, { typeId, lease, leaseDays })
export const returnVehicle = (companyId: string, vehicleId: string) =>
  post(`/api/companies/${companyId}/vehicles/${vehicleId}/return`, {})
export interface LaneInput {
  from: string
  to: string
  mode: string
  capacity: number
  price: number
  transitDays: number
  interline: boolean
}
export const createLane = (companyId: string, input: LaneInput) =>
  post(`/api/companies/${companyId}/lanes`, input)
export const dispatch = (companyId: string, orderId: string, vehicleId: string) =>
  post(`/api/companies/${companyId}/orders/${orderId}/dispatch`, { vehicleId })
export const borrow = (companyId: string, amount: number) =>
  post<{ debt: number; cash: number }>(`/api/companies/${companyId}/finance/borrow`, { amount })
export const repay = (companyId: string, amount: number) =>
  post<{ debt: number; cash: number }>(`/api/companies/${companyId}/finance/repay`, { amount })

// ---- 联盟 ----
export const createAlliance = (worldId: string, name: string) =>
  post<Alliance>(`/api/worlds/${worldId}/alliances`, { name })
export const joinAlliance = (allianceId: string, companyId: string) =>
  post(`/api/alliances/${allianceId}/join`, { companyId })
export const leaveAlliance = (allianceId: string, companyId: string) =>
  post(`/api/alliances/${allianceId}/leave`, { companyId })

// ---- 玩家市场 ----
export const marketList = (worldId: string) =>
  apiFetch<MarketListing[]>(`/api/worlds/${worldId}/market`)
export interface MarketInput {
  companyId: string
  type: string
  from: string
  to: string
  tons: number
  price: number
  mode: string
}
export const marketCreate = (input: MarketInput) =>
  post<MarketListing>('/api/market', input)
export const marketCancel = (listingId: string, companyId: string) =>
  post(`/api/market/${listingId}/cancel`, { companyId })
export const marketFill = (listingId: string, companyId: string, tons: number) =>
  post(`/api/market/${listingId}/fill`, { companyId, tons })

// ---- 排行榜 / 对手 ----
export const leaderboard = (worldId: string) =>
  apiFetch<CompanySnap[]>(`/api/worlds/${worldId}/leaderboard`)
export const opponents = (companyId: string) =>
  apiFetch<OpponentSnap[]>(`/api/companies/${companyId}/opponents`)
