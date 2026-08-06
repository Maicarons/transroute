import { useState } from 'react'
import { useSession } from '../state/session'
import { useMyCompany } from '../state/myCompany'
import * as api from '../api/rest'

export default function AlliancePanel({ onChanged }: { onChanged: () => void }) {
  const companyId = useSession((s) => s.companyId)
  const worldId = useSession((s) => s.worldId)
  const company = useMyCompany((s) => s.company)
  const [name, setName] = useState('')
  const [allianceId, setAllianceId] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function create() {
    if (!worldId) return
    setBusy(true)
    setErr(null)
    try {
      await api.createAlliance(worldId, name || '新联盟')
      setName('')
      onChanged()
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function join() {
    if (!companyId || !allianceId) return
    setBusy(true)
    setErr(null)
    try {
      await api.joinAlliance(allianceId, companyId)
      setAllianceId('')
      onChanged()
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function leave() {
    if (!companyId || !company?.allianceId) return
    setBusy(true)
    setErr(null)
    try {
      await api.leaveAlliance(company.allianceId, companyId)
      onChanged()
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3 text-sm">
      <h2 className="font-semibold text-slate-200">联盟 / 联运</h2>
      <div className="text-xs text-slate-400">
        当前联盟：
        <span className="text-slate-200">{company?.allianceId ? company.allianceId : '未加入'}</span>
      </div>

      <div className="space-y-2 bg-slate-900 rounded p-2">
        <div className="text-xs text-slate-400">创建联盟</div>
        <input className="w-full px-2 py-1.5 rounded bg-slate-800 border border-panelborder" placeholder="联盟名称" value={name} onChange={(e) => setName(e.target.value)} />
        <button onClick={create} disabled={busy} className="w-full py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white">
          创建
        </button>
      </div>

      <div className="space-y-2 bg-slate-900 rounded p-2">
        <div className="text-xs text-slate-400">加入联盟</div>
        <input className="w-full px-2 py-1.5 rounded bg-slate-800 border border-panelborder" placeholder="联盟 ID" value={allianceId} onChange={(e) => setAllianceId(e.target.value)} />
        <button onClick={join} disabled={busy || !allianceId} className="w-full py-1.5 rounded bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white">
          加入
        </button>
      </div>

      {company?.allianceId && (
        <button onClick={leave} disabled={busy} className="w-full py-1.5 rounded bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white">
          退出当前联盟
        </button>
      )}

      {err && <div className="text-red-400 text-xs">{err}</div>}
    </div>
  )
}
