import { create } from 'zustand'
import type { SnapshotMsg, DeltaMsg, CompanySnap, CargoPoolSnap, MarketListing, Lane, Order, EventSnap } from '../api/types'

interface WorldState {
  connected: boolean
  day: number
  status: string
  companies: CompanySnap[]
  cargoPools: CargoPoolSnap[]
  market: MarketListing[]
  lanes: Lane[]
  orders: Order[]
  events: EventSnap[]

  setConnected: (c: boolean) => void
  applySnapshot: (s: SnapshotMsg) => void
  applyDelta: (d: DeltaMsg) => void
  removeOrder: (id: string) => void
}

export const useWorld = create<WorldState>((set) => ({
  connected: false,
  day: 0,
  status: '',
  companies: [],
  cargoPools: [],
  market: [],
  lanes: [],
  orders: [],
  events: [],

  setConnected: (c) => set({ connected: c }),

  applySnapshot: (s) =>
    set({
      day: s.day,
      companies: s.companies,
      cargoPools: s.cargoPools,
      market: s.market,
      lanes: s.lanes,
    }),

  applyDelta: (d) =>
    set((prev) => {
      const map = new Map<string, Order>(prev.orders.map((o) => [o.id, o]))
      d.newOrders.forEach((o) => map.set(o.id, o))
      return {
        day: d.day,
        companies: d.companies,
        market: d.market,
        events: [...d.events, ...prev.events].slice(0, 60),
        orders: Array.from(map.values()),
      }
    }),

  removeOrder: (id) =>
    set((prev) => ({ orders: prev.orders.filter((o) => o.id !== id) })),
}))
