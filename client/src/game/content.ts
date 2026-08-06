// 前端经营目录（与 server/internal/content/catalog.go 对齐，金额单位：元）。
// 用于 UI 展示建点成本 / 车型价格等（服务端不向客户端下发此目录，故前端自持）。

export interface NodeTypeInfo {
  id: string
  label: string
  cost: number
  throughput: number
  handlingDays: number
  color: string
}

export const NODE_TYPES: Record<string, NodeTypeInfo> = {
  station: { id: 'station', label: '物流站点', cost: 200000, throughput: 1, handlingDays: 1.0, color: '#64748b' },
  local: { id: 'local', label: '物流中心', cost: 500000, throughput: 2, handlingDays: 0.5, color: '#0ea5e9' },
  city: { id: 'city', label: '城市节点', cost: 1000000, throughput: 4, handlingDays: 0.3, color: '#22c55e' },
  hub: { id: 'hub', label: '中转枢纽', cost: 2500000, throughput: 8, handlingDays: 0.2, color: '#f59e0b' },
}

export interface VehicleTypeInfo {
  id: string
  name: string
  mode: string
  capacity: number
  speed: number
  cost: number
  fuelPerKm: number
}

export const VEHICLE_TYPES: VehicleTypeInfo[] = [
  { id: 'ltruck', name: '轻型厢货', mode: 'road', capacity: 8, speed: 80, cost: 150000, fuelPerKm: 0.9 },
  { id: 'htruck', name: '重型卡车', mode: 'road', capacity: 40, speed: 70, cost: 380000, fuelPerKm: 1.6 },
  { id: 'train', name: '货运列车', mode: 'rail', capacity: 1500, speed: 95, cost: 3000000, fuelPerKm: 0.06 },
  { id: 'plane', name: '货运飞机', mode: 'air', capacity: 120, speed: 750, cost: 9000000, fuelPerKm: 7 },
  { id: 'ship', name: '远洋货轮', mode: 'sea', capacity: 6000, speed: 33, cost: 5500000, fuelPerKm: 0.03 },
]

export const VEHICLE_TYPE_MAP: Record<string, VehicleTypeInfo> = Object.fromEntries(
  VEHICLE_TYPES.map((v) => [v.id, v]),
)
