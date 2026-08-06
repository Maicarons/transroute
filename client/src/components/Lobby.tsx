import { useEffect, useState } from 'react'
import { useSession } from '../state/session'
import * as api from '../api/rest'
import type { World } from '../api/types'

export default function Lobby() {
  const token = useSession((s) => s.token)
  const set = useSession((s) => s.set)
  const [worlds, setWorlds] = useState<World[]>([])
  const [name, setName] = useState('')
  const [tick, setTick] = useState(10)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function load() {
    try {
      setWorlds(await api.listWorlds())
    } catch (e) {
      setErr((e as Error).message)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  async function join(wid: string) {
    setBusy(true)
    setErr(null)
    try {
      const r = await api.joinWorld(wid)
      set({ worldId: wid, companyId: r.companyId })
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function create() {
    setBusy(true)
    setErr(null)
    try {
      const w = await api.createWorld(name || '新世界', tick)
      await join(w.id)
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="h-full flex items-center justify-center bg-slate-950">
      <div className="w-[34rem] p-6 rounded-xl bg-panel border border-panelborder shadow-lg">
        <h1 className="text-2xl font-bold mb-4">选择世界</h1>
        {err && <div className="text-red-400 text-xs mb-2">{err}</div>}
        <div className="space-y-2 mb-4 max-h-72 overflow-y-auto">
          {worlds.length === 0 && <div className="text-slate-500 text-sm">暂无世界，创建一个吧。</div>}
          {worlds.map((w) => (
            <div
              key={w.id}
              className="flex items-center justify-between p-3 rounded bg-slate-900 border border-panelborder"
            >
              <div>
                <div className="font-medium">{w.name}</div>
                <div className="text-xs text-slate-400">
                  第 {w.currentDay} 天 · {w.status} · {w.tickSeconds}s/天
                </div>
              </div>
              <button
                onClick={() => join(w.id)}
                disabled={busy}
                className="px-3 py-1.5 text-sm rounded bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white"
              >
                加入
              </button>
            </div>
          ))}
        </div>
        <div className="border-t border-panelborder pt-3 space-y-2">
          <div className="text-sm text-slate-300">创建新世界</div>
          <div className="flex gap-2">
            <input
              className="flex-1 px-3 py-2 rounded bg-slate-900 border border-panelborder outline-none focus:border-sky-500"
              placeholder="世界名称"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              type="number"
              className="w-20 px-3 py-2 rounded bg-slate-900 border border-panelborder outline-none focus:border-sky-500"
              title="秒/天"
              value={tick}
              onChange={(e) => setTick(Number(e.target.value) || 10)}
            />
            <button
              onClick={create}
              disabled={busy}
              className="px-3 py-1.5 text-sm rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white"
            >
              创建并加入
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
