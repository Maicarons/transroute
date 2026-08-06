import { create } from 'zustand'

interface SessionState {
  token: string | null
  userId: string | null
  username: string | null
  worldId: string | null
  companyId: string | null
  set: (s: Partial<SessionState>) => void
  reset: () => void
}

export const useSession = create<SessionState>((set) => ({
  token: null,
  userId: null,
  username: null,
  worldId: null,
  companyId: null,
  set: (s) => set(s),
  reset: () =>
    set({ token: null, userId: null, username: null, worldId: null, companyId: null }),
}))
