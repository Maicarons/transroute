import {
  NODE_TYPES,
  NODE_TIER_ORDER,
  buildCost,
  cityLabel,
} from '../game/content'
import { cityFreeSlots, cityUsedSlots } from '../game/engine'
import { getCity } from '../game/cities'
import type { GameState, NodeTier } from '../game/types'
import { cn, fmtMoney } from '../lib/utils'

export function BuildPanel({
  state,
  onBuild,
}: {
  state: GameState
  onBuild: (cityId: string, tier: NodeTier) => void
}) {
  const id = state.selectedCityId
  if (!id) {
    return (
      <div className="rounded-xl bg-slate-900/60 p-4 text-sm text-slate-400 ring-1 ring-white/10">
        在地图上点选一个城市，即可在此建设或升级物流点。
      </div>
    )
  }
  const city = getCity(id)
  const existing = state.nodes[id]
  const free = cityFreeSlots(state, id)
  const used = cityUsedSlots(state, id)

  return (
    <div className="rounded-xl bg-slate-900/60 p-4 ring-1 ring-white/10">
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className="text-base font-semibold text-slate-100">{city.name}</h3>
        <span className="text-[11px] text-slate-400">{cityLabel(city)}</span>
      </div>

      {existing ? (
        <div className="mb-3 rounded-lg bg-slate-800/60 px-3 py-2 text-xs text-slate-300 ring-1 ring-white/10">
          当前：
          <span style={{ color: NODE_TYPES[existing].color }}>
            {NODE_TYPES[existing].label}
          </span>
          ，处理仓位 {used}/{NODE_TYPES[existing].throughput}（空闲 {free}）
        </div>
      ) : (
        <div className="mb-3 rounded-lg bg-slate-800/40 px-3 py-2 text-xs text-slate-400 ring-1 ring-white/10">
          尚未建设物流点，无法在此收发货物。
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {NODE_TIER_ORDER.map((tier) => {
          const cost = buildCost(tier, city.tier)
          const isCurrent = existing === tier
          const isLower =
            existing &&
            NODE_TIER_ORDER.indexOf(tier) <=
              NODE_TIER_ORDER.indexOf(existing)
          const disabled = !!isLower || state.money < cost
          return (
            <button
              key={tier}
              disabled={disabled}
              onClick={() => onBuild(id, tier)}
              className={cn(
                'flex flex-col items-start rounded-lg border px-3 py-2 text-left transition',
                isCurrent
                  ? 'border-emerald-500/60 bg-emerald-500/10'
                  : 'border-white/10 bg-slate-800/50 hover:border-white/30',
                disabled && 'cursor-not-allowed opacity-40'
              )}
            >
              <span
                className="text-sm font-medium"
                style={{ color: NODE_TYPES[tier].color }}
              >
                {NODE_TYPES[tier].label}
              </span>
              <span className="text-[11px] text-slate-400">
                {isCurrent
                  ? '当前等级'
                  : isLower
                  ? '更低等级'
                  : fmtMoney(cost)}
              </span>
              <span className="mt-1 text-[10px] leading-tight text-slate-500">
                {NODE_TYPES[tier].desc}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
