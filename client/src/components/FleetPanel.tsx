import { useState } from 'react'
import { useSession } from '../state/session'
import { useMyCompany } from '../state/myCompany'
import { useWorld } from '../state/world'
import { VEHICLE_TYPES, VEHICLE_TYPE_MAP } from '../game/content'
import * as api from '../api/rest'
import { formatMoney, modeLabel } from '../lib/utils'

export default function FleetPanel({ onChanged }: { onChanged: () => void }) {
  const companyId = useSession((s) => s.companyId)
  const { vehicles } = useMyCompany()
  const orders = useWorld((s) => s.orders)
  const removeOrder = useWorld((s) => s.removeOrder)
  const [typeId, setTypeId] = useState('ltruck')
  const [lease, setLease] = useState(false)
  const [leaseDays, setLeaseDays] = useState(30)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const vt = VEHICLE_TYPE_MAP[typeId]
  const available = orders.filter((o) => o.status === 'pending')

  async function acquire() {
    if (!companyId) return
    setBusy(true)
    setErr(null)
    try {
      await api.createVehicle(companyId, typeId, lease, leaseDays)
      onChanged()
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function retire(vehicleId: string) {
    if (!companyId) return
    setBusy(true)
    setErr(null)
    try {
      await api.returnVehicle(companyId, vehicleId)
      onChanged()
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function dispatch(orderId: string, vehicleId: string) {
    if (!companyId) return
    setBusy(true)
    setErr(null)
    try {
      await api.dispatch(companyId, orderId, vehicleId)
      removeOrder(orderId)
      onChanged()
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4 text-sm">
      <div className="space-y-2">
        <h2 className="font-semibold text-slate-200">购置 / 租赁车辆</h2>
        <select
          className="w-full px-2 py-1.5 rounded bg-slate-900 border border-panelborder"
          value={typeId}
          onChange={(e) => setTypeId(e.target.value)}
        >
          {VEHICLE_TYPES.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}（{modeLabel(v.mode)} · {v.capacity}t · {formatMoney(v.cost)}）
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-xs text-slate-400">
          <input type="checkbox" checked={lease} onChange={(e) => setLease(e.target.checked)} />
          租赁（按日付租金，不占用现金购置）
        </label>
        {lease && (
          <label className="flex items-center gap-2 text-xs text-slate-400">
            租赁天数（0=无限期）
            <input
              type="number"
              min={0}
              value={leaseDays}
              onChange={(e) => setLeaseDays(Number(e.target.value) || 0)}
              className="w-20 px-1 py-0.5 rounded bg-slate-900 border border-panelborder"
            />
          </label>
        )}
        <div className="text-xs text-slate-400">
          单价：<span className="text-amber-300">{formatMoney(vt?.cost ?? 0)}</span>
          {lease && (
            <span>
              {' '}· 日租 ≈ {formatMoney(Math.round((vt?.cost ?? 0) * 0.02))}
            </span>
          )}
        </div>
        {err && <div className="text-red-400 text-xs">{err}</div>}
        <button
          onClick={acquire}
          disabled={busy}
          className="w-full py-2 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white"
        >
          {lease ? '租赁' : '购买'}
        </button>
      </div>

      <div className="space-y-2">
        <h3 className="font-semibold text-slate-200">我的车队（{vehicles.length}）</h3>
        <div className="max-h-40 overflow-y-auto space-y-1">
          {vehicles.length === 0 && <div className="text-slate-500 text-xs">暂无车辆</div>}
          {vehicles.map((v) => (
            <div key={v.id} className="flex justify-between items-center text-xs bg-slate-900 rounded px-2 py-1">
              <span>
                {VEHICLE_TYPE_MAP[v.typeId]?.name || v.typeId} · {modeLabel(v.mode)} · {v.capacityTons}t
              </span>
              <span className="flex items-center gap-2">
                <span
                  className={
                    v.status === 'idle'
                      ? 'text-emerald-300'
                      : v.status === 'retired'
                        ? 'text-slate-500'
                        : 'text-amber-300'
                  }
                >
                  {v.status === 'idle' ? '空闲' : v.status === 'retired' ? '已退役' : '忙碌'}
                </span>
                <button
                  onClick={() => retire(v.id)}
                  disabled={v.status !== 'idle' || busy}
                  className="px-1.5 py-0.5 rounded bg-rose-700 hover:bg-rose-600 disabled:opacity-40 text-white"
                >
                  退租/退役
                </button>
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="font-semibold text-slate-200">可派货单（{available.length}）</h3>
        <div className="max-h-56 overflow-y-auto space-y-2">
          {available.length === 0 && <div className="text-slate-500 text-xs">暂无待派货单</div>}
          {available.map((o) => {
            const candidates = vehicles.filter(
              (v) => v.status === 'idle' && v.mode === o.mode && v.capacityTons >= o.tons,
            )
            return (
              <div key={o.id} className="bg-slate-900 rounded p-2 space-y-1">
                <div className="flex justify-between text-xs">
                  <span>
                    {o.fromCityId} → {o.toCityId} · {modeLabel(o.mode)}
                  </span>
                  <span className="text-emerald-300">
                    {o.tons.toFixed(1)}t / {formatMoney(o.reward)}
                  </span>
                </div>
                <div className="flex gap-1">
                  <select
                    id={`veh-${o.id}`}
                    className="flex-1 px-1 py-1 text-xs rounded bg-slate-800 border border-panelborder"
                    defaultValue=""
                  >
                    <option value="" disabled>
                      选择车辆
                    </option>
                    {candidates.map((v) => (
                      <option key={v.id} value={v.id}>
                        {VEHICLE_TYPE_MAP[v.typeId]?.name || v.typeId}
                      </option>
                    ))}
                  </select>
                  <button
                    disabled={candidates.length === 0 || busy}
                    onClick={() => {
                      const sel = (document.getElementById(`veh-${o.id}`) as HTMLSelectElement).value
                      if (sel) dispatch(o.id, sel)
                    }}
                    className="px-2 py-1 text-xs rounded bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white"
                  >
                    派单
                  </button>
                </div>
                {candidates.length === 0 && (
                  <div className="text-[10px] text-amber-400">无匹配空闲车辆（需同方式且运力≥货量）</div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
