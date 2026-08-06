import type { GameState, GameEvent } from '../game/types'
import { cn } from '../lib/utils'

const KIND_COLOR: Record<GameEvent['kind'], string> = {
  info: 'text-slate-300',
  success: 'text-emerald-300',
  warn: 'text-amber-300',
  danger: 'text-rose-300',
}

export function EventLog({ state }: { state: GameState }) {
  const events = [...state.events].reverse()
  return (
    <div className="flex h-full flex-col rounded-xl bg-slate-900/60 ring-1 ring-white/10">
      <div className="border-b border-white/10 p-3">
        <h3 className="text-sm font-semibold text-slate-100">动态日志</h3>
      </div>
      <div className="scroll-thin flex-1 space-y-1 overflow-y-auto p-2 text-[11px] leading-relaxed">
        {events.length === 0 && (
          <p className="text-slate-500">暂无事件。</p>
        )}
        {events.map((e) => (
          <div key={e.id} className="flex gap-2">
            <span className="shrink-0 text-slate-500">D{e.day}</span>
            <span className={cn('min-w-0', KIND_COLOR[e.kind])}>{e.text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
