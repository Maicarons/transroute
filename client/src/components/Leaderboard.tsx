import { useWorld } from '../state/world'
import { formatMoney } from '../lib/utils'

export default function Leaderboard() {
  const companies = useWorld((s) => s.companies)
  const ranked = [...companies].sort((a, b) => a.rank - b.rank)

  return (
    <div className="bg-panel rounded-lg border border-panelborder p-3">
      <h3 className="text-sm font-semibold text-slate-200 mb-2">排行榜（净资产）</h3>
      <div className="space-y-1 max-h-72 overflow-y-auto">
        {ranked.length === 0 && <div className="text-slate-500 text-xs">暂无数据</div>}
        {ranked.map((c) => (
          <div key={c.id} className="flex items-center justify-between text-xs bg-slate-900 rounded px-2 py-1">
            <span className="flex items-center gap-2">
              <span className={'w-5 text-center ' + (c.rank === 1 ? 'text-amber-300' : 'text-slate-400')}>
                {c.rank}
              </span>
              <span className={c.broke ? 'text-red-400 line-through' : 'text-slate-200'}>{c.name}</span>
            </span>
            <span className="text-sky-300">{formatMoney(c.netWorth)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
