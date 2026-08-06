// Package geo 提供服务端使用的城市坐标目录（从 game/src/game/cities.ts 复制的
// vendored 快照，零坐标偏移），以及两点间大圆距离（haversine）计算。
// 模拟引擎据此估算 OD 运输距离、时效基准与货量需求。
package geo

import "math"

// City 城市静态目录（WGS84 真实坐标）。
type City struct {
	ID      string
	Name    string
	Lng     float64
	Lat     float64
	Tier    int // 1=一线枢纽 2=省会 3=其他
	Coastal bool
}

// Cities 40 个真实城市坐标（与 game/src/game/cities.ts 完全一致）。
var Cities = []City{
	{ID: "北京", Name: "北京", Lng: 116.41, Lat: 39.9, Tier: 1, Coastal: false},
	{ID: "上海", Name: "上海", Lng: 121.47, Lat: 31.23, Tier: 1, Coastal: true},
	{ID: "广州", Name: "广州", Lng: 113.26, Lat: 23.13, Tier: 1, Coastal: true},
	{ID: "深圳", Name: "深圳", Lng: 114.06, Lat: 22.55, Tier: 1, Coastal: true},
	{ID: "成都", Name: "成都", Lng: 104.07, Lat: 30.57, Tier: 1, Coastal: false},
	{ID: "重庆", Name: "重庆", Lng: 106.55, Lat: 29.56, Tier: 1, Coastal: false},
	{ID: "武汉", Name: "武汉", Lng: 114.3, Lat: 30.59, Tier: 1, Coastal: false},
	{ID: "西安", Name: "西安", Lng: 108.94, Lat: 34.34, Tier: 1, Coastal: false},
	{ID: "杭州", Name: "杭州", Lng: 120.15, Lat: 30.27, Tier: 1, Coastal: false},
	{ID: "南京", Name: "南京", Lng: 118.8, Lat: 32.06, Tier: 1, Coastal: false},
	{ID: "天津", Name: "天津", Lng: 117.2, Lat: 39.13, Tier: 1, Coastal: true},
	{ID: "苏州", Name: "苏州", Lng: 120.62, Lat: 31.3, Tier: 1, Coastal: true},
	{ID: "郑州", Name: "郑州", Lng: 113.62, Lat: 34.75, Tier: 1, Coastal: false},
	{ID: "长沙", Name: "长沙", Lng: 112.94, Lat: 28.23, Tier: 1, Coastal: false},

	{ID: "沈阳", Name: "沈阳", Lng: 123.43, Lat: 41.8, Tier: 2, Coastal: false},
	{ID: "青岛", Name: "青岛", Lng: 120.38, Lat: 36.07, Tier: 2, Coastal: true},
	{ID: "大连", Name: "大连", Lng: 121.61, Lat: 38.91, Tier: 2, Coastal: true},
	{ID: "昆明", Name: "昆明", Lng: 102.83, Lat: 24.88, Tier: 2, Coastal: false},
	{ID: "哈尔滨", Name: "哈尔滨", Lng: 126.53, Lat: 45.8, Tier: 2, Coastal: false},
	{ID: "济南", Name: "济南", Lng: 117.0, Lat: 36.65, Tier: 2, Coastal: false},
	{ID: "福州", Name: "福州", Lng: 119.3, Lat: 26.08, Tier: 2, Coastal: true},
	{ID: "厦门", Name: "厦门", Lng: 118.09, Lat: 24.48, Tier: 2, Coastal: true},
	{ID: "南宁", Name: "南宁", Lng: 108.37, Lat: 22.82, Tier: 2, Coastal: false},
	{ID: "贵阳", Name: "贵阳", Lng: 106.71, Lat: 26.57, Tier: 2, Coastal: false},
	{ID: "石家庄", Name: "石家庄", Lng: 114.51, Lat: 38.04, Tier: 2, Coastal: false},
	{ID: "太原", Name: "太原", Lng: 112.55, Lat: 37.87, Tier: 2, Coastal: false},
	{ID: "合肥", Name: "合肥", Lng: 117.28, Lat: 31.86, Tier: 2, Coastal: false},
	{ID: "南昌", Name: "南昌", Lng: 115.86, Lat: 28.68, Tier: 2, Coastal: false},
	{ID: "长春", Name: "长春", Lng: 125.32, Lat: 43.82, Tier: 2, Coastal: false},
	{ID: "宁波", Name: "宁波", Lng: 121.55, Lat: 29.87, Tier: 2, Coastal: true},
	{ID: "无锡", Name: "无锡", Lng: 120.3, Lat: 31.57, Tier: 2, Coastal: false},
	{ID: "东莞", Name: "东莞", Lng: 113.75, Lat: 23.02, Tier: 2, Coastal: true},
	{ID: "佛山", Name: "佛山", Lng: 113.12, Lat: 23.02, Tier: 2, Coastal: false},

	{ID: "乌鲁木齐", Name: "乌鲁木齐", Lng: 87.62, Lat: 43.82, Tier: 3, Coastal: false},
	{ID: "拉萨", Name: "拉萨", Lng: 91.14, Lat: 29.65, Tier: 3, Coastal: false},
	{ID: "呼和浩特", Name: "呼和浩特", Lng: 111.75, Lat: 40.84, Tier: 3, Coastal: false},
	{ID: "银川", Name: "银川", Lng: 106.23, Lat: 38.49, Tier: 3, Coastal: false},
	{ID: "西宁", Name: "西宁", Lng: 101.78, Lat: 36.62, Tier: 3, Coastal: false},
	{ID: "海口", Name: "海口", Lng: 110.33, Lat: 20.03, Tier: 3, Coastal: true},
}

var cityMap = func() map[string]City {
	m := make(map[string]City, len(Cities))
	for _, c := range Cities {
		m[c.ID] = c
	}
	return m
}()

// GetCity 按城市 ID 取静态目录。
func GetCity(id string) (City, bool) {
	c, ok := cityMap[id]
	return c, ok
}

// HasCity 判断城市 ID 是否在目录内。
func HasCity(id string) bool {
	_, ok := cityMap[id]
	return ok
}

// TierMult 城市重要度系数：一线 1.0 / 省会 0.8 / 其他 0.6（§8.4）。
func TierMult(tier int) float64 {
	switch tier {
	case 1:
		return 1.0
	case 2:
		return 0.8
	default:
		return 0.6
	}
}

// DistanceKm 两城市间大圆距离（公里）。任一城市未知则返回 0。
func DistanceKm(a, b string) float64 {
	ca, ok1 := cityMap[a]
	cb, ok2 := cityMap[b]
	if !ok1 || !ok2 {
		return 0
	}
	return HaversineKm(ca.Lng, ca.Lat, cb.Lng, cb.Lat)
}

// HaversineKm 经纬度（度）间大圆距离（公里）。
func HaversineKm(lng1, lat1, lng2, lat2 float64) float64 {
	const R = 6371.0
	dLat := (lat2 - lat1) * math.Pi / 180
	dLng := (lng2 - lng1) * math.Pi / 180
	la1 := lat1 * math.Pi / 180
	la2 := lat2 * math.Pi / 180
	h := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(la1)*math.Cos(la2)*math.Sin(dLng/2)*math.Sin(dLng/2)
	return 2 * R * math.Asin(math.Sqrt(h))
}
