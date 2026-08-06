import { useState } from 'react'
import { useSession } from '../state/session'
import * as api from '../api/rest'

export default function Login() {
  const set = useSession((s) => s.set)
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit() {
    setErr(null)
    if (!username || !password) {
      setErr('用户名与密码不能为空')
      return
    }
    setBusy(true)
    try {
      const data =
        mode === 'login'
          ? await api.login(username, password)
          : await api.register(username, password, email)
      set({ token: data.token, userId: data.userId, username })
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="h-full flex items-center justify-center bg-slate-950">
      <div className="w-96 p-6 rounded-xl bg-panel border border-panelborder shadow-lg">
        <h1 className="text-2xl font-bold mb-1">物流大亨 · 多人版</h1>
        <p className="text-slate-400 text-sm mb-4">注册或登录以进入物流世界</p>
        <div className="flex mb-4">
          <button
            onClick={() => setMode('login')}
            className={'flex-1 py-2 text-sm rounded-l ' + (mode === 'login' ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-300')}
          >
            登录
          </button>
          <button
            onClick={() => setMode('register')}
            className={'flex-1 py-2 text-sm rounded-r ' + (mode === 'register' ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-300')}
          >
            注册
          </button>
        </div>
        <div className="space-y-3">
          <input
            className="w-full px-3 py-2 rounded bg-slate-900 border border-panelborder outline-none focus:border-sky-500"
            placeholder="用户名"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            className="w-full px-3 py-2 rounded bg-slate-900 border border-panelborder outline-none focus:border-sky-500"
            type="password"
            placeholder="密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {mode === 'register' && (
            <input
              className="w-full px-3 py-2 rounded bg-slate-900 border border-panelborder outline-none focus:border-sky-500"
              placeholder="邮箱（可选）"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          )}
          {err && <div className="text-red-400 text-xs">{err}</div>}
          <button
            onClick={submit}
            disabled={busy}
            className="w-full py-2 rounded bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-medium"
          >
            {busy ? '处理中…' : mode === 'login' ? '登录' : '注册并进入'}
          </button>
        </div>
      </div>
    </div>
  )
}
