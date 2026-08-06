import { useState } from 'react'
import { useSession } from '../state/session'
import { CITIES } from '../game/cities'
import { NODE_TYPES } from '../game/content'
import * as api from '../api/rest'
import { formatMoney } from '../lib/utils'

export default function BuildPanel({ onChanged }: { onChanged: () => void }) {
  const companyId = useSession((s) => s.companyId)
  const [cityId, setCityId] = useState(CITIES[0]?.id || '')
  const [tier, setTier] = useState('station')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const base = NODE_TYPES[tier]?.cost ?? 0
  const cityTier = CITIES.find((c) => c.id === cityId)?.tier ?? 3
  const mult = cityTier === 1 ? 1.0 : cityTier === 2 ? 0.8 : 0.6
  const actual = Math.round(base * mult)

  async function build() {
    if (!companyId) return
    setBusy(true)
    setErr(null)
    try {
      await api.createNode(companyId, cityId, tier)
      onChanged()
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3 text-sm">
      <h2 className="font-semibold text-slate-200">建设物流点</h2>
      <div>
        <label className="text-xs text-slate-400">城市</label>
        <select
          className="w-full px-2 py-1.5 rounded bg-slate-900 border border-panelborder"
          value={cityId}
          onChange={(e) => setCityId(e.target.value)}
        >
          {CITIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}（T{c.tier}）
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-xs text-slate-400">等级</label>
        <select
          className="w-full px-2 py-1.5 rounded bg-slate-900 border border-panelborder"
          value={tier}
          onChange={(e) => setTier(e.target.value)}
        >
          {Object.values(NODE_TYPES).map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      <div className="text-xs text-slate-400">
        建点成本（含城市系数）：<span className="text-amber-300">{formatMoney(actual)}</span>
      </div>
      {err && <div className="text-red-400 text-xs">{err}</div>}
      <button
        onClick={build}
        disabled={busy}
        className="w-full py-2 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white"
      >
        {busy ? '处理中…' : '建点'}
      </button>
    </div>
  )
}
