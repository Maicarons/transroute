import { create } from 'zustand'
import type { CompanySnap } from '../api/types'

// 对手快照（排除自己），主要来自世界快照的 companies 列表。
interface OpponentState {
  list: CompanySnap[]
  set: (list: CompanySnap[]) => void
}

export const useOpponents = create<OpponentState>((set) => ({
  list: [],
  set: (list) => set({ list }),
}))
