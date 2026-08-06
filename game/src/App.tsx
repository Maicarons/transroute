import { useState } from 'react'
import { HUD } from './components/HUD'
import { MapView } from './components/MapView'
import { BuildPanel } from './components/BuildPanel'
import { OrderBoard } from './components/OrderBoard'
import { FleetPanel } from './components/FleetPanel'
import { FinancePanel } from './components/FinancePanel'
import { EventLog } from './components/EventLog'
import {
  acceptOrder,
  advanceDay,
  buildNode,
  buyVehicle,
  borrowMoney,
  createInitialState,
  dispatchOrder,
  leaseVehicle,
  netWorth,
  repayLoan,
  returnLease,
} from './game/engine'
import type { GameState, NodeTier } from './game/types'
import { cn, fmtMoney } from './lib/utils'

function Goals({ state }: { state: GameState }) {
  const nw = netWorth(state)
  const items = [
    { label: '资产突破 ¥5,000,000', done: nw >= 5_000_000 },
    { label: '建成 8 个物流点', done: Object.keys(state.nodes).length >= 8 },
    { label: '车队规模达到 10 辆', done: state.vehicles.length >= 10 },
    { label: '声誉达到 80', done: state.reputation >= 80 },
    { label: '单日自然增长到 第 60 天', done: state.day >= 60 },
    {
      label: '使用过租赁或借贷',
      done: state.usedLeaseOrLoan === true,
    },
  ]
  return (
    <div className="rounded-xl bg-slate-900/60 p-4 ring-1 ring-white/10">
      <h3 className="mb-2 text-sm font-semibold text-slate-100">经营目标</h3>
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {items.map((it) => (
          <div key={it.label} className="flex items-center gap-2 text-xs">
            <span
              className={cn(
                'flex h-4 w-4 items-center justify-center rounded-full text-[10px]',
                it.done
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-700 text-slate-400'
              )}
            >
              {it.done ? '✓' : ''}
            </span>
            <span className={it.done ? 'text-emerald-300' : 'text-slate-400'}>
              {it.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Intro({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-w-lg rounded-2xl bg-slate-900 p-6 ring-1 ring-white/15">
        <h2 className="text-xl font-bold text-slate-100">🚚 物流大亨 · 玩法</h2>
        <ul className="mt-3 space-y-2 text-sm text-slate-300">
          <li>
            1️⃣ <b>建设物流点</b>：在地图上点选城市，建「物流站点 / 物流中心 /
            城市节点 / 中转枢纽」。两端都建点才能收发货物。
          </li>
          <li>
            2️⃣ <b>承接货单</b>：左侧「可接货单」里点「承接」。货单分两种——
            <b>现货</b>（蓝色，外部随机货运活）与<b>合同货</b>（绿色，你已建点的城市间每天产生的稳定货流，数量会波动）。等级越高的物流点，能同时处理的订单越多。
          </li>
          <li>
            3️⃣ <b>购车 / 租赁派送</b>：在「购车·租赁中心」买车或<b>按日租租赁</b>车辆（无押金，空闲时可退租），再在「我的运单」里点车辆派送。里程与耗时基于真实城市坐标，油费随车型不同。
          </li>
          <li>
            4️⃣ <b>资金周转</b>：现金紧张可在右下「银行 / 金融」<b>借款</b>（日息约 0.2%）或租赁车辆；注意利息与租金压力，靠经营还款。现金可为负，但资不抵债会报警。
          </li>
          <li>
            5️⃣ <b>推进时间</b>：点「下一天」结算到达的订单、扣除租赁费与贷款利息、刷新新需求。订单超时会流失并扣声誉。
          </li>
          <li>
            6️⃣ <b>壮大网络</b>：升级物流点、扩充车队、提升声誉，冲击经营目标！
          </li>
        </ul>
        <button
          onClick={onClose}
          className="mt-5 w-full rounded-lg bg-emerald-600 py-2.5 font-semibold text-white transition hover:bg-emerald-500"
        >
          开始经营 →
        </button>
      </div>
    </div>
  )
}

export default function App() {
  const [state, setState] = useState<GameState>(createInitialState)
  const [showIntro, setShowIntro] = useState(true)

  const onSelect = (cityId: string) =>
    setState((s) => ({ ...s, selectedCityId: cityId }))
  const onBuild = (cityId: string, tier: NodeTier) =>
    setState((s) => buildNode(s, cityId, tier))
  const onBuy = (typeId: string) => setState((s) => buyVehicle(s, typeId))
  const onLease = (typeId: string) => setState((s) => leaseVehicle(s, typeId))
  const onReturn = (vehicleId: string) =>
    setState((s) => returnLease(s, vehicleId))
  const onAccept = (id: string) => setState((s) => acceptOrder(s, id))
  const onDispatch = (orderId: string, vehicleId: string) =>
    setState((s) => dispatchOrder(s, orderId, vehicleId))
  const onBorrow = (amount: number) =>
    setState((s) => borrowMoney(s, amount))
  const onRepay = (amount: number) => setState((s) => repayLoan(s, amount))
  const onAdvance = () => setState((s) => advanceDay(s))
  const onFastForward = () =>
    setState((s) => {
      let ns = s
      for (let i = 0; i < 5; i++) ns = advanceDay(ns)
      return ns
    })
  const onReset = () => setState(createInitialState())

  return (
    <div className="mx-auto max-w-[1400px] space-y-3 p-3">
      {showIntro && <Intro onClose={() => setShowIntro(false)} />}

      <HUD
        state={state}
        onAdvance={onAdvance}
        onFastForward={onFastForward}
        onReset={onReset}
      />

      <div className="grid gap-3 lg:grid-cols-12">
        {/* 左：订单板 */}
        <div className="lg:col-span-3 h-[72vh]">
          <OrderBoard state={state} onAccept={onAccept} onDispatch={onDispatch} />
        </div>

        {/* 中：地图 + 建设 + 目标 */}
        <div className="space-y-3 lg:col-span-6">
          <MapView state={state} onSelect={onSelect} />
          <BuildPanel state={state} onBuild={onBuild} />
          <Goals state={state} />
        </div>

        {/* 右：车队 + 日志 */}
        <div className="space-y-3 lg:col-span-3">
          <div className="h-[40vh]">
            <FleetPanel
              state={state}
              onBuy={onBuy}
              onLease={onLease}
              onReturn={onReturn}
            />
          </div>
          <FinancePanel
            state={state}
            onBorrow={onBorrow}
            onRepay={onRepay}
          />
          <div className="h-[30vh]">
            <EventLog state={state} />
          </div>
        </div>
      </div>

      <p className="pb-4 text-center text-[11px] text-slate-500">
        地图与里程基于真实城市坐标（WGS84）。这是基于 transroute 物流拓扑项目衍生的经营小游戏。
      </p>
    </div>
  )
}
