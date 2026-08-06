import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type * as GeoJSON from 'geojson'
import { CITIES } from '../game/cities'
import { useWorld } from '../state/world'
import { useMyCompany } from '../state/myCompany'
import type { Lane, Node } from '../api/types'

function coord(id: string): [number, number] | null {
  const c = CITIES.find((x) => x.id === id)
  return c ? [c.lng, c.lat] : null
}

function buildLanes(lanes: Lane[]): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = []
  for (const l of lanes) {
    const a = coord(l.fromCityId)
    const b = coord(l.toCityId)
    if (!a || !b) continue
    features.push({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: [a, b] },
      properties: { mode: l.mode },
    })
  }
  return { type: 'FeatureCollection', features }
}

function buildNodes(nodes: Node[]): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = nodes.map((n) => ({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [n.lng, n.lat] },
    properties: { city: n.cityName, tier: n.tier },
  }))
  return { type: 'FeatureCollection', features }
}

export default function GameMap() {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const lanesRef = useRef<Lane[]>([])
  const nodesRef = useRef<Node[]>([])

  const lanes = useWorld((s) => s.lanes)
  const nodes = useMyCompany((s) => s.nodes)

  lanesRef.current = lanes
  nodesRef.current = nodes

  useEffect(() => {
    if (!containerRef.current) return
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      center: [104, 35],
      zoom: 3.4,
    })
    map.addControl(new maplibregl.NavigationControl(), 'top-right')
    mapRef.current = map

    map.on('load', () => {
      map.addSource('lanes', { type: 'geojson', data: buildLanes(lanesRef.current) })
      map.addLayer({
        id: 'lane-line',
        type: 'line',
        source: 'lanes',
        paint: { 'line-color': '#f59e0b', 'line-width': 1.5, 'line-opacity': 0.65 },
      })
      map.addSource('nodes', { type: 'geojson', data: buildNodes(nodesRef.current) })
      map.addLayer({
        id: 'node-circle',
        type: 'circle',
        source: 'nodes',
        paint: {
          'circle-radius': 6,
          'circle-color': '#22c55e',
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 1.5,
        },
      })
      for (const c of CITIES) {
        const el = document.createElement('div')
        el.style.cssText =
          'width:7px;height:7px;border-radius:9999px;background:#38bdf8;box-shadow:0 0 6px #38bdf8;'
        const popup = new maplibregl.Popup({ offset: 10 }).setText(`${c.name}（T${c.tier}）`)
        new maplibregl.Marker({ element: el }).setLngLat([c.lng, c.lat]).setPopup(popup).addTo(map)
      }
    })

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  // 响应式更新线路与自有节点图层。
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const laneSrc = map.getSource('lanes') as maplibregl.GeoJSONSource | undefined
    const nodeSrc = map.getSource('nodes') as maplibregl.GeoJSONSource | undefined
    if (laneSrc) laneSrc.setData(buildLanes(lanes))
    if (nodeSrc) nodeSrc.setData(buildNodes(nodes))
  }, [lanes, nodes])

  return <div ref={containerRef} className="absolute inset-0" />
}
