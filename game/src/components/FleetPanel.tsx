import { VEHICLE_TYPES, MODE_LABEL, LEASE_DAILY_RATE } from '../game/content'
import { buyVehicle } from '../game/engine'
import type { GameState } from '../game/types'
import { cn, fmtMoney } from '../lib/utils'

export function FleetPanel({
  state,
  onBuy,
  onLease,
  onReturn,
}: {
  state: GameState
  onBuy: (typeId: string) => void
  onLease: (typeId: string) => void
  onReturn: (vehicleId: string) => void
}) {
  return (
    <div className="flex h-full flex-col rounded-xl bg-slate-900/60 ring-1 ring-white/10">
      <div className="border-b border-white/10 p-3">
        <h3 className="text-sm font-semibold text-slate-100">购车 / 租赁中心</h3>
        <p className="text-[11px] text-slate-400">
          不同运输方式适配不同线路（货轮仅限沿海城市）。资金紧张可租赁，按日付租。
        </p>
      </div>
      <div className="scroll-thin flex-1 space-y-2 overflow-y-auto p-2">
        {VEHICLE_TYPES.map((t) => {
          const afford = state.money >= t.cost
          const daily = Math.round(t.cost * LEASE_DAILY_RATE)
          return (
            <div
              key={t.id}
              className="rounded-lg bg-slate-800/50 p-3 ring-1 ring-white/10"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-100">
                  {t.name}
                </span>
                <span className="rounded bg-slate-700 px-1.5 py-0.5 text-[10px] text-slate-200">
                  {MODE_LABEL[t.mode]}
                </span>
              </div>
              <div className="mt-1 grid grid-cols-3 gap-1 text-[11px] text-slate-400">
                <span>载重 {t.capacity}t</span>
                <span>{t.speed}km/h</span>
                <span>油费 {t.fuelPerKm}/km</span>
              </div>
              <p className="mt-1 text-[10px] text-slate-500">{t.desc}</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  disabled={!afford}
                  onClick={() => onBuy(t.id)}
                  className={cn(
                    'rounded-md py-1.5 text-xs font-semibold transition',
                    afford
                      ? 'bg-sky-600 text-white hover:bg-sky-500'
                      : 'cursor-not-allowed bg-slate-700 text-slate-400'
                  )}
                >
                  {afford ? `购买 ${fmtMoney(t.cost)}` : '资金不足'}
                </button>
                <button
                  onClick={() => onLease(t.id)}
                  title={`日租 ${fmtMoney(daily)} 元，无押金`}
                  className="rounded-md border border-emerald-500/50 py-1.5 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/10"
                >
                  租赁（日租 {fmtMoney(daily)}）
                </button>
              </div>
            </div>
          )
        })}

        <div className="border-t border-white/10 pt-2">
          <h4 className="mb-1 text-xs font-semibold text-slate-300">
            我的车队（{state.vehicles.length}）
          </h4>
          {state.vehicles.length === 0 ? (
            <p className="text-[11px] text-slate-500">还没有车辆。</p>
          ) : (
            <div className="space-y-1">
              {state.vehicles.map((v) => {
                const busy = v.busyUntilDay !== null
                const leased = v.owned === false
                return (
                  <div
                    key={v.id}
                    className="flex items-center justify-between rounded-md bg-slate-800/40 px-2 py-1 text-[11px]"
                  >
                    <span className="text-slate-200">{v.name}</span>
                    <span
                      className={cn(
                        busy
                          ? 'text-sky-300'
                          : leased
                            ? 'text-amber-300'
                            : 'text-emerald-300'
                      )}
                    >
                      {busy
                        ? `运输至第${v.busyUntilDay}天`
                        : leased
                          ? `租赁·日租 ${fmtMoney(v.leaseDaily)}`
                          : '空闲'}
                    </span>
                    {leased && !busy && (
                      <button
                        onClick={() => onReturn(v.id)}
                        className="ml-1 rounded bg-rose-700/70 px-1.5 py-0.5 text-[10px] text-rose-100 transition hover:bg-rose-600"
                      >
                        退租
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
