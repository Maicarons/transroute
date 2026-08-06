import { create } from 'zustand'
import type { Company, Node, Vehicle, Lane, LedgerEvent } from '../api/types'

interface MyCompanyState {
  company: Company | null
  nodes: Node[]
  vehicles: Vehicle[]
  lanes: Lane[]
  ledger: LedgerEvent[]
  setDetail: (d: {
    company: Company
    nodes: Node[]
    vehicles: Vehicle[]
    lanes: Lane[]
    ledger: LedgerEvent[]
  }) => void
  setCompany: (c: Company | null) => void
}

export const useMyCompany = create<MyCompanyState>((set) => ({
  company: null,
  nodes: [],
  vehicles: [],
  lanes: [],
  ledger: [],
  setDetail: (d) =>
    set({
      company: d.company,
      nodes: d.nodes,
      vehicles: d.vehicles,
      lanes: d.lanes,
      ledger: d.ledger,
    }),
  setCompany: (c) => set({ company: c }),
}))
