import { netWorth } from '../game/engine'
import type { GameState } from '../game/types'
import { cn, fmtMoney } from '../lib/utils'

function Stat({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: 'good' | 'warn'
}) {
  return (
    <div className="flex flex-col rounded-lg bg-slate-800/60 px-3 py-2 ring-1 ring-white/10">
      <span className="text-[11px] text-slate-400">{label}</span>
      <span
        className={cn(
          'text-base font-semibold tabular-nums',
          tone === 'good' && 'text-emerald-300',
          tone === 'warn' && 'text-amber-300'
        )}
      >
        {value}
      </span>
    </div>
  )
}

export function HUD({
  state,
  onAdvance,
  onFastForward,
  onReset,
}: {
  state: GameState
  onAdvance: () => void
  onFastForward: () => void
  onReset: () => void
}) {
  const inTransit = state.orders.filter((o) => o.status === 'inTransit').length
  const repTone = state.reputation >= 60 ? 'good' : state.reputation < 30 ? 'warn' : undefined

  return (
    <header className="flex flex-wrap items-center gap-3 rounded-xl bg-slate-900/80 px-4 py-3 ring-1 ring-white/10">
      <div className="mr-2 flex flex-col">
        <span className="text-lg font-bold tracking-wide text-slate-100">
          物流大亨
        </span>
        <span className="text-[11px] text-slate-400">Logistics Tycoon</span>
      </div>

      <Stat label="现金" value={fmtMoney(state.money)} tone={state.money < 0 ? 'warn' : 'good'} />
      <Stat label="第几天" value={`第 ${state.day} 天`} />
      <Stat label="声誉" value={`${state.reputation}`} tone={repTone} />
      <Stat label="总资产" value={fmtMoney(netWorth(state))} />
      <Stat label="在途运单" value={`${inTransit}`} />
      <Stat label="物流点" value={`${Object.keys(state.nodes).length}`} />
      <Stat label="车队" value={`${state.vehicles.length}`} />
      <Stat
        label="负债"
        value={state.debt > 0 ? fmtMoney(state.debt) : '无'}
        tone={state.debt > 0 ? 'warn' : undefined}
      />

      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={onFastForward}
          className="rounded-lg bg-slate-700 px-3 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-600"
        >
          快进 5 天
        </button>
        <button
          onClick={onAdvance}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
        >
          下一天 ▶
        </button>
        <button
          onClick={onReset}
          className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-300 ring-1 ring-white/10 transition hover:bg-slate-700"
        >
          重开
        </button>
      </div>
    </header>
  )
}
