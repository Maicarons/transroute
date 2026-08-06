import { useState } from 'react'
import {
  acceptOrder,
  canService,
  cityFreeSlots,
  eligibleVehicles,
  orderLabel,
} from '../game/engine'
import { getCity } from '../game/cities'
import { MODE_LABEL } from '../game/content'
import type { GameState, Order } from '../game/types'
import { cn, fmtKm, fmtMoney } from '../lib/utils'

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={cn(
        'inline-block h-2 w-2 rounded-full',
        ok ? 'bg-emerald-400' : 'bg-slate-500'
      )}
    />
  )
}

function AvailableCard({
  o,
  state,
  onAccept,
}: {
  o: Order
  state: GameState
  onAccept: (id: string) => void
}) {
  const serviceable = canService(state, o)
  const slotsOk =
    cityFreeSlots(state, o.fromCityId) > 0 &&
    cityFreeSlots(state, o.toCityId) > 0
  const daysLeft = o.deadlineDay - state.day
  let reason = ''
  if (!serviceable) reason = '两端需建点'
  else if (!slotsOk) reason = '城市仓位满'

  return (
    <div className="rounded-lg bg-slate-800/50 p-3 ring-1 ring-white/10">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-medium text-slate-100">
          {orderLabel(o)}
        </span>
        <span
          className={cn(
            'shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium',
            o.kind === 'contract'
              ? 'bg-emerald-500/20 text-emerald-300'
              : 'bg-sky-500/20 text-sky-300'
          )}
        >
          {o.kind === 'contract' ? '合同' : '现货'}
        </span>
      </div>
      <div className="mt-0.5 flex items-center justify-between">
        <span className="text-[11px] text-slate-400">
          限 {daysLeft} 天内
        </span>
      </div>
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-400">
        <span>{o.cargo}</span>
        <span>{o.weight} 吨</span>
        <span>{fmtKm(o.distanceKm)}</span>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-emerald-300">
          {fmtMoney(o.reward)}
        </span>
        <button
          disabled={!serviceable || !slotsOk}
          onClick={() => onAccept(o.id)}
          className={cn(
            'rounded-md px-3 py-1 text-xs font-medium transition',
            serviceable && slotsOk
              ? 'bg-emerald-600 text-white hover:bg-emerald-500'
              : 'cursor-not-allowed bg-slate-700 text-slate-400'
          )}
        >
          {reason || '承接'}
        </button>
      </div>
      {!serviceable && (
        <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-500">
          <StatusDot ok={false} /> 需在该线路两端城市建设物流点
        </div>
      )}
    </div>
  )
}

function DispatchChips({
  o,
  state,
  onDispatch,
}: {
  o: Order
  state: GameState
  onDispatch: (orderId: string, vehicleId: string) => void
}) {
  const vehicles = eligibleVehicles(state, o)
  if (vehicles.length === 0) {
    return (
      <div className="mt-1 text-[10px] text-slate-500">
        暂无合适空闲车辆（需载重 ≥ {o.weight} 吨
        {getCity(o.fromCityId).coastal && getCity(o.toCityId).coastal
          ? ''
          : '，且海运仅限沿海'}
        ）
      </div>
    )
  }
  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {vehicles.map((v) => (
        <button
          key={v.id}
          onClick={() => onDispatch(o.id, v.id)}
          className="rounded-md bg-slate-700 px-2 py-1 text-[11px] text-slate-100 transition hover:bg-emerald-600"
          title={`${MODE_LABEL[v.mode]} · ${v.speed}km/h`}
        >
          {v.name}（{v.capacity}t）
        </button>
      ))}
    </div>
  )
}

function MineCard({
  o,
  state,
  onDispatch,
}: {
  o: Order
  state: GameState
  onDispatch: (orderId: string, vehicleId: string) => void
}) {
  if (o.status === 'inTransit') {
    const total =
      (o.arriveDay ?? o.dispatchedDay ?? state.day) -
      (o.dispatchedDay ?? state.day)
    const done = state.day - (o.dispatchedDay ?? state.day)
    const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 100
    const v = state.vehicles.find((x) => x.id === o.vehicleId)
    return (
      <div className="rounded-lg bg-slate-800/50 p-3 ring-1 ring-white/10">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-100">
            {orderLabel(o)}
          </span>
          <span className="text-[11px] text-sky-300">运输中</span>
        </div>
        <div className="mt-1 text-[11px] text-slate-400">
          {v?.name} · 第 {o.arriveDay} 天送达
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-700">
          <div
            className="h-full rounded-full bg-sky-400 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    )
  }
  // accepted
  return (
    <div className="rounded-lg bg-slate-800/50 p-3 ring-1 ring-white/10">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-100">
          {orderLabel(o)}
        </span>
        <span className="text-[11px] text-amber-300">
          待派车 · {o.weight}t
        </span>
      </div>
      <div className="mt-1 text-[11px] text-slate-400">
        {o.cargo} · {fmtMoney(o.reward)}
      </div>
      <DispatchChips o={o} state={state} onDispatch={onDispatch} />
    </div>
  )
}

export function OrderBoard({
  state,
  onAccept,
  onDispatch,
}: {
  state: GameState
  onAccept: (id: string) => void
  onDispatch: (orderId: string, vehicleId: string) => void
}) {
  const [tab, setTab] = useState<'available' | 'mine'>('available')

  const available = state.orders.filter((o) => o.status === 'available')
  const mine = state.orders.filter(
    (o) => o.status === 'accepted' || o.status === 'inTransit'
  )
  const history = state.orders
    .filter((o) => o.status === 'completed' || o.status === 'expired')
    .slice(-5)
    .reverse()

  return (
    <div className="flex h-full flex-col rounded-xl bg-slate-900/60 ring-1 ring-white/10">
      <div className="flex items-center gap-1 border-b border-white/10 p-2">
        <button
          onClick={() => setTab('available')}
          className={cn(
            'rounded-md px-3 py-1 text-sm font-medium transition',
            tab === 'available'
              ? 'bg-slate-700 text-white'
              : 'text-slate-400 hover:text-slate-200'
          )}
        >
          可接货单 ({available.length})
        </button>
        <button
          onClick={() => setTab('mine')}
          className={cn(
            'rounded-md px-3 py-1 text-sm font-medium transition',
            tab === 'mine'
              ? 'bg-slate-700 text-white'
              : 'text-slate-400 hover:text-slate-200'
          )}
        >
          我的运单 ({mine.length})
        </button>
      </div>

      <div className="scroll-thin flex-1 space-y-2 overflow-y-auto p-2">
        {tab === 'available' &&
          (available.length ? (
            available.map((o) => (
              <AvailableCard
                key={o.id}
                o={o}
                state={state}
                onAccept={onAccept}
              />
            ))
          ) : (
            <p className="p-3 text-center text-xs text-slate-500">
              暂无货单，点「下一天」会刷新新的货运需求。
            </p>
          ))}

        {tab === 'mine' &&
          (mine.length ? (
            mine.map((o) => (
              <MineCard
                key={o.id}
                o={o}
                state={state}
                onDispatch={onDispatch}
              />
            ))
          ) : (
            <p className="p-3 text-center text-xs text-slate-500">
              还没有运单。去「可接货单」承接，并购车派送吧。
            </p>
          ))}

        {tab === 'mine' && history.length > 0 && (
          <div className="mt-2 border-t border-white/10 pt-2">
            <p className="mb-1 text-[10px] text-slate-500">近期记录</p>
            {history.map((o) => (
              <div
                key={o.id}
                className="flex items-center justify-between py-0.5 text-[11px]"
              >
                <span className="text-slate-400">{orderLabel(o)}</span>
                <span
                  className={
                    o.status === 'completed'
                      ? 'text-emerald-400'
                      : 'text-rose-400'
                  }
                >
                  {o.status === 'completed' ? '已完成' : '已流失'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
