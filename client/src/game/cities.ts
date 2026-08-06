// 本文件是从 game/src/game 复制的 vendored snapshot，请勿 import 父工程，升级时直接改本文件。
import type { City } from './types'

// 真实 WGS84 坐标（公开 OSM/GeoNames 数据），用于游戏地图与里程计算。
export const CITIES: City[] = [
  { id: '北京', name: '北京', lng: 116.41, lat: 39.9, tier: 1, coastal: false },
  { id: '上海', name: '上海', lng: 121.47, lat: 31.23, tier: 1, coastal: true },
  { id: '广州', name: '广州', lng: 113.26, lat: 23.13, tier: 1, coastal: true },
  { id: '深圳', name: '深圳', lng: 114.06, lat: 22.55, tier: 1, coastal: true },
  { id: '成都', name: '成都', lng: 104.07, lat: 30.57, tier: 1, coastal: false },
  { id: '重庆', name: '重庆', lng: 106.55, lat: 29.56, tier: 1, coastal: false },
  { id: '武汉', name: '武汉', lng: 114.3, lat: 30.59, tier: 1, coastal: false },
  { id: '西安', name: '西安', lng: 108.94, lat: 34.34, tier: 1, coastal: false },
  { id: '杭州', name: '杭州', lng: 120.15, lat: 30.27, tier: 1, coastal: false },
  { id: '南京', name: '南京', lng: 118.8, lat: 32.06, tier: 1, coastal: false },
  { id: '天津', name: '天津', lng: 117.2, lat: 39.13, tier: 1, coastal: true },
  { id: '苏州', name: '苏州', lng: 120.62, lat: 31.3, tier: 1, coastal: true },
  { id: '郑州', name: '郑州', lng: 113.62, lat: 34.75, tier: 1, coastal: false },
  { id: '长沙', name: '长沙', lng: 112.94, lat: 28.23, tier: 1, coastal: false },

  { id: '沈阳', name: '沈阳', lng: 123.43, lat: 41.8, tier: 2, coastal: false },
  { id: '青岛', name: '青岛', lng: 120.38, lat: 36.07, tier: 2, coastal: true },
  { id: '大连', name: '大连', lng: 121.61, lat: 38.91, tier: 2, coastal: true },
  { id: '昆明', name: '昆明', lng: 102.83, lat: 24.88, tier: 2, coastal: false },
  { id: '哈尔滨', name: '哈尔滨', lng: 126.53, lat: 45.8, tier: 2, coastal: false },
  { id: '济南', name: '济南', lng: 117.0, lat: 36.65, tier: 2, coastal: false },
  { id: '福州', name: '福州', lng: 119.3, lat: 26.08, tier: 2, coastal: true },
  { id: '厦门', name: '厦门', lng: 118.09, lat: 24.48, tier: 2, coastal: true },
  { id: '南宁', name: '南宁', lng: 108.37, lat: 22.82, tier: 2, coastal: false },
  { id: '贵阳', name: '贵阳', lng: 106.71, lat: 26.57, tier: 2, coastal: false },
  { id: '石家庄', name: '石家庄', lng: 114.51, lat: 38.04, tier: 2, coastal: false },
  { id: '太原', name: '太原', lng: 112.55, lat: 37.87, tier: 2, coastal: false },
  { id: '合肥', name: '合肥', lng: 117.28, lat: 31.86, tier: 2, coastal: false },
  { id: '南昌', name: '南昌', lng: 115.86, lat: 28.68, tier: 2, coastal: false },
  { id: '长春', name: '长春', lng: 125.32, lat: 43.82, tier: 2, coastal: false },
  { id: '宁波', name: '宁波', lng: 121.55, lat: 29.87, tier: 2, coastal: true },
  { id: '无锡', name: '无锡', lng: 120.3, lat: 31.57, tier: 2, coastal: false },
  { id: '东莞', name: '东莞', lng: 113.75, lat: 23.02, tier: 2, coastal: true },
  { id: '佛山', name: '佛山', lng: 113.12, lat: 23.02, tier: 2, coastal: false },

  { id: '乌鲁木齐', name: '乌鲁木齐', lng: 87.62, lat: 43.82, tier: 3, coastal: false },
  { id: '拉萨', name: '拉萨', lng: 91.14, lat: 29.65, tier: 3, coastal: false },
  { id: '呼和浩特', name: '呼和浩特', lng: 111.75, lat: 40.84, tier: 3, coastal: false },
  { id: '银川', name: '银川', lng: 106.23, lat: 38.49, tier: 3, coastal: false },
  { id: '西宁', name: '西宁', lng: 101.78, lat: 36.62, tier: 3, coastal: false },
  { id: '海口', name: '海口', lng: 110.33, lat: 20.03, tier: 3, coastal: true },
]

const CITY_MAP: Record<string, City> = Object.fromEntries(
  CITIES.map((c) => [c.id, c])
)

export function getCity(id: string): City {
  const c = CITY_MAP[id]
  if (!c) throw new Error('未知城市: ' + id)
  return c
}
