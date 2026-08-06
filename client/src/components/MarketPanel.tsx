import { useEffect, useState } from 'react'
import { useSession } from '../state/session'
import * as api from '../api/rest'
import type { MarketListing } from '../api/types'
import { formatMoney, modeLabel } from '../lib/utils'

const TYPES = [
  { id: 'capacity_sell', label: '卖运力' },
  { id: 'cargo_buy', label: '求货' },
  { id: 'cargo_sell', label: '卖货' },
  { id: 'lane_lease', label: '租线路' },
]

export default function MarketPanel({ onChanged }: { onChanged: () => void }) {
  const companyId = useSession((s) => s.companyId)
  const worldId = useSession((s) => s.worldId)
  const [list, setList] = useState<MarketListing[]>([])
  const [type, setType] = useState('cargo_buy')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [tons, setTons] = useState(20)
  const [price, setPrice] = useState(800)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function load() {
    if (!worldId) return
    try {
      setList(await api.marketList(worldId))
    } catch (e) {
      setErr((e as Error).message)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [worldId])

  async function create() {
    if (!companyId) return
    setBusy(true)
    setErr(null)
    try {
      await api.marketCreate({
        companyId,
        type,
        from: from || '—',
        to: to || '—',
        tons: Math.max(0.1, tons),
        price: Math.max(1, Math.round(price)),
        mode: 'road',
      })
      await load()
      onChanged()
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function fill(l: MarketListing) {
    if (!companyId) return
    setBusy(true)
    setErr(null)
    try {
      await api.marketFill(l.id, companyId, l.tons)
      await load()
      onChanged()
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function cancel(l: MarketListing) {
    if (!companyId) return
    setBusy(true)
    setErr(null)
    try {
      await api.marketCancel(l.id, companyId)
      await load()
      onChanged()
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3 text-sm">
      <h2 className="font-semibold text-slate-200">玩家市场</h2>

      <div className="space-y-2 bg-slate-900 rounded p-2">
        <div className="text-xs text-slate-400">发布挂单</div>
        <select className="w-full px-2 py-1.5 rounded bg-slate-800 border border-panelborder" value={type} onChange={(e) => setType(e.target.value)}>
          {TYPES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-2">
          <input className="px-2 py-1.5 rounded bg-slate-800 border border-panelborder" placeholder="起(城市)" value={from} onChange={(e) => setFrom(e.target.value)} />
          <input className="px-2 py-1.5 rounded bg-slate-800 border border-panelborder" placeholder="讫(城市)" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input type="number" className="px-2 py-1.5 rounded bg-slate-800 border border-panelborder" placeholder="吨数" value={tons} onChange={(e) => setTons(Number(e.target.value))} />
          <input type="number" className="px-2 py-1.5 rounded bg-slate-800 border border-panelborder" placeholder="元/t" value={price} onChange={(e) => setPrice(Number(e.target.value))} />
        </div>
        <button onClick={create} disabled={busy} className="w-full py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white">
          发布
        </button>
      </div>

      {err && <div className="text-red-400 text-xs">{err}</div>}

      <div className="space-y-2">
        <h3 className="text-xs text-slate-400">开放挂单（{list.length}）</h3>
        <div className="max-h-64 overflow-y-auto space-y-1">
          {list.length === 0 && <div className="text-slate-500 text-xs">暂无挂单</div>}
          {list.map((l) => {
            const mine = l.listerCompanyId === companyId
            return (
              <div key={l.id} className="bg-slate-900 rounded p-2 text-xs space-y-1">
                <div className="flex justify-between">
                  <span>
                    {TYPES.find((t) => t.id === l.type)?.label} · {modeLabel(l.mode)}
                  </span>
                  <span className="text-amber-300">
                    {l.tons.toFixed(1)}t · {formatMoney(l.pricePerTon)}/t
                  </span>
                </div>
                <div className="text-slate-400">
                  {l.fromCityId} → {l.toCityId}
                </div>
                <div className="flex gap-1">
                  {mine ? (
                    <button onClick={() => cancel(l)} disabled={busy} className="px-2 py-1 rounded bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white">
                      撤单
                    </button>
                  ) : (
                    <button onClick={() => fill(l)} disabled={busy} className="px-2 py-1 rounded bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white">
                      成交
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
