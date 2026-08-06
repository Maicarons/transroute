import { useState } from 'react'
import { useSession } from '../state/session'
import { useMyCompany } from '../state/myCompany'
import * as api from '../api/rest'
import { formatMoney } from '../lib/utils'

export default function FinancePanel({ onChanged }: { onChanged: () => void }) {
  const companyId = useSession((s) => s.companyId)
  const { company, ledger } = useMyCompany()
  const [amount, setAmount] = useState(100000)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function action(kind: 'borrow' | 'repay') {
    if (!companyId) return
    setBusy(true)
    setErr(null)
    try {
      if (kind === 'borrow') await api.borrow(companyId, amount)
      else await api.repay(companyId, amount)
      onChanged()
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3 text-sm">
      <h2 className="font-semibold text-slate-200">金融</h2>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-slate-900 rounded p-2">
          <div className="text-slate-400">现金</div>
          <div className="text-emerald-300 font-semibold">{formatMoney(company?.cash ?? 0)}</div>
        </div>
        <div className="bg-slate-900 rounded p-2">
          <div className="text-slate-400">负债</div>
          <div className="text-red-300 font-semibold">{formatMoney(company?.debt ?? 0)}</div>
        </div>
      </div>
      <div>
        <label className="text-xs text-slate-400">金额</label>
        <input
          type="number"
          className="w-full px-2 py-1.5 rounded bg-slate-900 border border-panelborder"
          value={amount}
          onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
        />
      </div>
      <div className="flex gap-2">
        <button onClick={() => action('borrow')} disabled={busy} className="flex-1 py-2 rounded bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white">
          借款
        </button>
        <button onClick={() => action('repay')} disabled={busy} className="flex-1 py-2 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white">
          还款
        </button>
      </div>
      {err && <div className="text-red-400 text-xs">{err}</div>}
      <div className="space-y-1">
        <h3 className="text-xs text-slate-400">近期账本</h3>
        <div className="max-h-48 overflow-y-auto space-y-1">
          {ledger.length === 0 && <div className="text-slate-500 text-xs">暂无记录</div>}
          {ledger.slice(0, 20).map((e) => (
            <div key={e.id} className="flex justify-between text-xs bg-slate-900 rounded px-2 py-1">
              <span className="text-slate-400">
                第{e.day}天 · {e.note}
              </span>
              <span className={e.amount >= 0 ? 'text-emerald-300' : 'text-red-300'}>
                {e.amount >= 0 ? '+' : ''}
                {formatMoney(e.amount)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
