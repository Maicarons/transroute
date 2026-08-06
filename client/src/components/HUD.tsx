import { useWorld } from '../state/world'
import { useMyCompany } from '../state/myCompany'
import { useSession } from '../state/session'
import { formatMoney } from '../lib/utils'

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] uppercase tracking-wide text-slate-400">{label}</span>
      <span className={'font-semibold ' + (tone || 'text-slate-100')}>{value}</span>
    </div>
  )
}

export default function HUD({ onRefresh }: { onRefresh: () => void }) {
  const { connected, day, status, companies } = useWorld()
  const companyId = useSession((s) => s.companyId)
  const my = companies.find((c) => c.id === companyId)
  const { nodes, vehicles, company } = useMyCompany()

  return (
    <header className="h-16 shrink-0 flex items-center gap-6 px-4 bg-panel border-b border-panelborder">
      <div className="flex items-center gap-2">
        <span className={'w-2.5 h-2.5 rounded-full ' + (connected ? 'bg-emerald-400' : 'bg-red-400')} />
        <span className="text-sm text-slate-300">{connected ? '已连接' : '离线'}</span>
      </div>

      <Stat label="公司" value={company?.name || my?.name || '—'} />
      <Stat label="天数" value={`第 ${day} 天`} />
      <Stat label="状态" value={status || '—'} />

      <div className="flex-1" />

      <Stat label="现金" value={formatMoney(my?.cash ?? 0)} tone="text-emerald-300" />
      <Stat label="净资产" value={formatMoney(my?.netWorth ?? 0)} tone="text-sky-300" />
      <Stat
        label="负债"
        value={formatMoney((my?.cash ?? 0) - (my?.netWorth ?? 0))}
        tone="text-red-300"
      />
      <Stat label="声誉" value={String(my?.reputation ?? 0)} />
      <Stat label="排名" value={my ? `#${my.rank}` : '—'} tone="text-amber-300" />

      <div className="flex flex-col items-end">
        <span className="text-[10px] uppercase tracking-wide text-slate-400">节点/车辆</span>
        <span className="font-semibold text-slate-100">
          {nodes.length} / {vehicles.length}
        </span>
      </div>

      <button
        onClick={onRefresh}
        className="px-2 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
      >
        刷新
      </button>
    </header>
  )
}
