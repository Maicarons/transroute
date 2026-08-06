import { useMemo } from 'react'
import {
  Map,
  MapMarker,
  MarkerContent,
  MarkerLabel,
  MapArc,
  MapControls,
} from './ui/map'
import { CITIES, getCity } from '../game/cities'
import { NODE_TYPES } from '../game/content'
import { nodeAt } from '../game/engine'
import type { GameState, NodeTier } from '../game/types'
import { cn } from '../lib/utils'

export function MapView({
  state,
  onSelect,
}: {
  state: GameState
  onSelect: (id: string) => void
}) {
  const arcs = useMemo(
    () =>
      state.orders
        .filter((o) => o.status === 'inTransit')
        .map((o) => {
          const a = getCity(o.fromCityId)
          const b = getCity(o.toCityId)
          return {
            id: o.id,
            from: [a.lng, a.lat] as [number, number],
            to: [b.lng, b.lat] as [number, number],
            // 合同货绿色系，现货粉色系
            color: o.kind === 'contract' ? '#34d399' : '#f472b6',
          }
        }),
    [state.orders]
  )

  return (
    <div className="rounded-xl bg-slate-900/60 p-2 ring-1 ring-white/10">
      <div className="h-[520px] w-full overflow-hidden rounded-lg">
        <Map
          theme="dark"
          center={[104, 36]}
          zoom={3.6}
          attributionControl={{ compact: true }}
        >
          <MapControls />

          {CITIES.map((c) => {
            const tier = nodeAt(state, c.id) as NodeTier | undefined
            const sel = state.selectedCityId === c.id
            const built = !!tier
            const baseSize = built ? (c.tier === 1 ? 15 : 12) : 9
            const size = sel ? baseSize + 3 : baseSize
            const color = built ? NODE_TYPES[tier as NodeTier].color : '#475569'
            return (
              <MapMarker
                key={c.id}
                longitude={c.lng}
                latitude={c.lat}
                onClick={() => onSelect(c.id)}
              >
                <MarkerContent>
                  <div
                    style={{
                      width: size,
                      height: size,
                      borderRadius: '9999px',
                      background: color,
                      border: sel ? '2px solid #fff' : '1px solid #0b1220',
                      boxShadow: '0 0 6px rgba(0,0,0,0.6)',
                      cursor: 'pointer',
                    }}
                  />
                </MarkerContent>
                {(c.tier === 1 || sel) && (
                  <MarkerLabel>
                    <span className="text-slate-200">{c.name}</span>
                  </MarkerLabel>
                )}
              </MapMarker>
            )
          })}

          {arcs.length > 0 && (
            <MapArc
              data={arcs}
              curvature={0.25}
              paint={{
                'line-color': ['get', 'color'],
                'line-width': 2,
                'line-opacity': 0.85,
              }}
              interactive={false}
            />
          )}
        </Map>
      </div>

      {/* 图例 */}
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 px-1 text-[11px] text-slate-300">
        {(['station', 'local', 'city', 'hub'] as NodeTier[]).map((t) => (
          <span key={t} className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ background: NODE_TYPES[t].color }}
            />
            {NODE_TYPES[t].label}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full bg-slate-500" />
          未建点
        </span>
        <span className="ml-2 inline-flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 rounded-full bg-[#34d399]" />
          合同货流
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 rounded-full bg-[#f472b6]" />
          现货运单
        </span>
      </div>
    </div>
  )
}
