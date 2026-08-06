import { useOpponents } from '../state/opponents'
import { formatMoney } from '../lib/utils'

export default function OpponentMonitor() {
  const list = useOpponents((s) => s.list)

  return (
    <div className="bg-panel rounded-lg border border-panelborder p-3">
      <h3 className="text-sm font-semibold text-slate-200 mb-2">对手监控</h3>
      <div className="space-y-1 max-h-72 overflow-y-auto">
        {list.length === 0 && <div className="text-slate-500 text-xs">暂无对手</div>}
        {list.map((o) => (
          <div key={o.id} className="text-xs bg-slate-900 rounded px-2 py-1 space-y-0.5">
            <div className="flex justify-between">
              <span className={o.broke ? 'text-red-400 line-through' : 'text-slate-200'}>{o.name}</span>
              <span className="text-slate-400">#{o.rank}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>净资产 {formatMoney(o.netWorth)}</span>
              <span>声誉 {o.reputation}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
