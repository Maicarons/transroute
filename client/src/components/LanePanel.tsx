import { useState } from 'react'
import { useSession } from '../state/session'
import { useMyCompany } from '../state/myCompany'
import * as api from '../api/rest'
import { modeLabel } from '../lib/utils'

const MODES = [
  { id: 'road', label: '公路' },
  { id: 'rail', label: '铁路' },
  { id: 'air', label: '航空' },
  { id: 'sea', label: '海运' },
]

export default function LanePanel({ onChanged }: { onChanged: () => void }) {
  const companyId = useSession((s) => s.companyId)
  const nodes = useMyCompany((s) => s.nodes)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [mode, setMode] = useState('road')
  const [capacity, setCapacity] = useState(10)
  const [price, setPrice] = useState(800)
  const [transitDays, setTransitDays] = useState(2)
  const [interline, setInterline] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const owned = nodes.map((n) => n.cityId)
  const effectiveFrom = from || owned[0] || ''
  const effectiveTo = to || owned[1] || owned[0] || ''

  async function create() {
    if (!companyId) return
    if (effectiveFrom === effectiveTo) {
      setErr('起讫城市不能相同')
      return
    }
    setBusy(true)
    setErr(null)
    try {
      await api.createLane(companyId, {
        from: effectiveFrom,
        to: effectiveTo,
        mode,
        capacity: Math.max(1, Math.round(capacity)),
        price: Math.max(1, Math.round(price)),
        transitDays: Math.max(0.1, transitDays),
        interline,
      })
      onChanged()
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  if (owned.length < 2) {
    return (
      <div className="text-sm text-slate-400 space-y-2">
        <h2 className="font-semibold text-slate-200">开通运营线路</h2>
        <div className="text-amber-400 text-xs">需先在至少两个城市建点（≥2 个物流点）。</div>
      </div>
    )
  }

  return (
    <div className="space-y-3 text-sm">
      <h2 className="font-semibold text-slate-200">开通运营线路</h2>
      <div className="grid grid-cols-2 gap-2">
        <select className="px-2 py-1.5 rounded bg-slate-900 border border-panelborder" value={effectiveFrom} onChange={(e) => setFrom(e.target.value)}>
          {owned.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select className="px-2 py-1.5 rounded bg-slate-900 border border-panelborder" value={effectiveTo} onChange={(e) => setTo(e.target.value)}>
          {owned.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-xs text-slate-400">运输方式</label>
        <select className="w-full px-2 py-1.5 rounded bg-slate-900 border border-panelborder" value={mode} onChange={(e) => setMode(e.target.value)}>
          {MODES.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-xs text-slate-400">日运力(t)</label>
          <input type="number" className="w-full px-2 py-1.5 rounded bg-slate-900 border border-panelborder" value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} />
        </div>
        <div>
          <label className="text-xs text-slate-400">报价(元/t)</label>
          <input type="number" className="w-full px-2 py-1.5 rounded bg-slate-900 border border-panelborder" value={price} onChange={(e) => setPrice(Number(e.target.value))} />
        </div>
        <div>
          <label className="text-xs text-slate-400">时效(天)</label>
          <input type="number" step="0.1" className="w-full px-2 py-1.5 rounded bg-slate-900 border border-panelborder" value={transitDays} onChange={(e) => setTransitDays(Number(e.target.value))} />
        </div>
      </div>
      <label className="flex items-center gap-2 text-xs text-slate-400">
        <input type="checkbox" checked={interline} onChange={(e) => setInterline(e.target.checked)} />
        开启联运（同联盟加成）
      </label>
      <div className="text-xs text-slate-500">
        运力 {capacity}t · {modeLabel(mode)} · 报价 {price}元/t · 时效 {transitDays}天
      </div>
      {err && <div className="text-red-400 text-xs">{err}</div>}
      <button onClick={create} disabled={busy} className="w-full py-2 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white">
        {busy ? '处理中…' : '开通线路'}
      </button>
    </div>
  )
}
