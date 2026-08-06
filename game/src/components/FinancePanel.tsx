import { useState } from 'react'
import { maxLoan } from '../game/engine'
import { LOAN_DAILY_RATE } from '../game/content'
import type { GameState } from '../game/types'
import { cn, fmtMoney } from '../lib/utils'

export function FinancePanel({
  state,
  onBorrow,
  onRepay,
}: {
  state: GameState
  onBorrow: (amount: number) => void
  onRepay: (amount: number) => void
}) {
  const [borrowAmt, setBorrowAmt] = useState('')
  const [repayAmt, setRepayAmt] = useState('')
  const limit = maxLoan(state)
  const dailyInterest = Math.round(state.debt * LOAN_DAILY_RATE)

  const doBorrow = () => {
    const a = Math.round(Number(borrowAmt))
    if (Number.isFinite(a) && a > 0) {
      onBorrow(a)
      setBorrowAmt('')
    }
  }
  const doRepay = () => {
    const a = Math.round(Number(repayAmt))
    if (Number.isFinite(a) && a > 0) {
      onRepay(a)
      setRepayAmt('')
    }
  }

  return (
    <div className="rounded-xl bg-slate-900/60 p-3 ring-1 ring-white/10">
      <h3 className="text-sm font-semibold text-slate-100">银行 / 金融</h3>
      <p className="text-[11px] text-slate-400">
        日利率 {Math.round(LOAN_DAILY_RATE * 10000) / 100}%（≈月 6%），可借额度随资产与声誉增长。
      </p>

      <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
        <div className="rounded-lg bg-slate-800/60 px-2 py-1.5">
          <div className="text-slate-400">当前负债</div>
          <div
            className={cn(
              'text-sm font-semibold',
              state.debt > 0 ? 'text-rose-300' : 'text-emerald-300'
            )}
          >
            {fmtMoney(state.debt)}
          </div>
        </div>
        <div className="rounded-lg bg-slate-800/60 px-2 py-1.5">
          <div className="text-slate-400">日息 / 可借</div>
          <div className="text-sm font-semibold text-amber-300">
            {fmtMoney(dailyInterest)} / {fmtMoney(limit)}
          </div>
        </div>
      </div>

      <div className="mt-2 space-y-1.5">
        <div className="flex gap-1">
          <input
            value={borrowAmt}
            onChange={(e) => setBorrowAmt(e.target.value.replace(/[^0-9]/g, ''))}
            placeholder="借款金额"
            inputMode="numeric"
            className="min-w-0 flex-1 rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-100 ring-1 ring-white/10 outline-none placeholder:text-slate-500"
          />
          <button
            onClick={doBorrow}
            className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-emerald-500"
          >
            借款
          </button>
        </div>
        <div className="flex gap-1">
          <input
            value={repayAmt}
            onChange={(e) => setRepayAmt(e.target.value.replace(/[^0-9]/g, ''))}
            placeholder="还款金额"
            inputMode="numeric"
            className="min-w-0 flex-1 rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-100 ring-1 ring-white/10 outline-none placeholder:text-slate-500"
          />
          <button
            onClick={doRepay}
            className="rounded-md bg-slate-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-slate-500"
          >
            还款
          </button>
        </div>
        <button
          onClick={() => onRepay(state.debt)}
          disabled={state.debt <= 0}
          className={cn(
            'w-full rounded-md py-1 text-xs font-medium transition',
            state.debt > 0
              ? 'bg-rose-700 text-rose-100 hover:bg-rose-600'
              : 'cursor-not-allowed bg-slate-700 text-slate-400'
          )}
        >
          还清全部负债
        </button>
      </div>
    </div>
  )
}
