import { useCallback, useEffect, useState } from 'react'
import { useSession } from './state/session'
import { useWorld } from './state/world'
import { useMyCompany } from './state/myCompany'
import { useOpponents } from './state/opponents'
import { WorldSocket } from './api/ws'
import * as api from './api/rest'
import Login from './components/Login'
import Lobby from './components/Lobby'
import HUD from './components/HUD'
import GameMap from './components/GameMap'
import BuildPanel from './components/BuildPanel'
import FleetPanel from './components/FleetPanel'
import LanePanel from './components/LanePanel'
import MarketPanel from './components/MarketPanel'
import FinancePanel from './components/FinancePanel'
import AlliancePanel from './components/AlliancePanel'
import Leaderboard from './components/Leaderboard'
import OpponentMonitor from './components/OpponentMonitor'

type Tab = 'build' | 'fleet' | 'lane' | 'market' | 'finance' | 'alliance'

const TABS: { id: Tab; label: string }[] = [
  { id: 'build', label: '建点' },
  { id: 'fleet', label: '车队' },
  { id: 'lane', label: '线路' },
  { id: 'market', label: '市场' },
  { id: 'finance', label: '金融' },
  { id: 'alliance', label: '联盟' },
]

export default function App() {
  const token = useSession((s) => s.token)
  const worldId = useSession((s) => s.worldId)
  const companyId = useSession((s) => s.companyId)

  const setConnected = useWorld((s) => s.setConnected)
  const applySnapshot = useWorld((s) => s.applySnapshot)
  const applyDelta = useWorld((s) => s.applyDelta)
  const companies = useWorld((s) => s.companies)
  const setDetail = useMyCompany((s) => s.setDetail)
  const setOpponents = useOpponents((s) => s.set)

  const [tab, setTab] = useState<Tab>('build')

  const inGame = !!token && !!worldId && !!companyId

  const refresh = useCallback(async () => {
    if (!companyId) return
    try {
      const d = await api.getCompany(companyId)
      setDetail(d)
    } catch {
      // 忽略刷新错误（如网络抖动）
    }
  }, [companyId, setDetail])

  // 建立世界 WebSocket 连接，接收 snapshot / delta。
  useEffect(() => {
    if (!inGame || !token || !worldId) return
    const sock = new WorldSocket(token, worldId)
    sock.onStatus = (c) => setConnected(c)
    sock.onMessage = (msg) => {
      if (!msg || !msg.type) return
      if (msg.type === 'world_snapshot') applySnapshot(msg)
      else if (msg.type === 'delta') applyDelta(msg)
    }
    sock.connect()
    refresh()
    return () => sock.close()
  }, [inGame, token, worldId, applySnapshot, applyDelta, setConnected, refresh])

  // 由世界快照派生对手列表（排除自己）。
  useEffect(() => {
    if (!companyId) return
    setOpponents(companies.filter((c) => c.id !== companyId))
  }, [companies, companyId, setOpponents])

  if (!token) return <Login />
  if (!worldId || !companyId) return <Lobby />

  return (
    <div className="h-full flex flex-col">
      <HUD onRefresh={refresh} />
      <div className="flex-1 flex min-h-0">
        <aside className="w-80 shrink-0 border-r border-panelborder bg-panel overflow-y-auto flex flex-col">
          <div className="flex flex-wrap gap-1 p-2 border-b border-panelborder">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={
                  'px-2 py-1 text-xs rounded ' +
                  (tab === t.id
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700')
                }
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="p-3">
            {tab === 'build' && <BuildPanel onChanged={refresh} />}
            {tab === 'fleet' && <FleetPanel onChanged={refresh} />}
            {tab === 'lane' && <LanePanel onChanged={refresh} />}
            {tab === 'market' && <MarketPanel onChanged={refresh} />}
            {tab === 'finance' && <FinancePanel onChanged={refresh} />}
            {tab === 'alliance' && <AlliancePanel onChanged={refresh} />}
          </div>
        </aside>

        <main className="flex-1 min-w-0 relative">
          <GameMap />
        </main>

        <aside className="w-72 shrink-0 border-l border-panelborder bg-panel overflow-y-auto p-3 space-y-3">
          <Leaderboard />
          <OpponentMonitor />
        </aside>
      </div>
    </div>
  )
}
