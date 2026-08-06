export function haversineKm(
  a: [number, number],
  b: [number, number]
): number {
  const R = 6371
  const dLat = ((b[1] - a[1]) * Math.PI) / 180
  const dLng = ((b[0] - a[0]) * Math.PI) / 180
  const la1 = (a[1] * Math.PI) / 180
  const la2 = (b[1] * Math.PI) / 180
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

const MIN_LNG = 72
const MAX_LNG = 136
const MIN_LAT = 16
const MAX_LAT = 55
const PAD = 26

/** 经纬度等距投影到画布坐标（中国范围） */
export function project(
  lng: number,
  lat: number,
  w: number,
  h: number
): { x: number; y: number } {
  const x = PAD + ((lng - MIN_LNG) / (MAX_LNG - MIN_LNG)) * (w - 2 * PAD)
  const y = PAD + ((MAX_LAT - lat) / (MAX_LAT - MIN_LAT)) * (h - 2 * PAD)
  return { x, y }
}
