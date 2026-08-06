// Package content 服务端经营目录：物流点等级成本与车辆型号目录。
// 数值与 game/src/game/content.ts 对齐（金额单位：元），供 company 服务与校验使用。
package content

// NodeTypeInfo 物流点等级信息。
type NodeTypeInfo struct {
	Label        string
	Cost         int // 元
	Throughput   int
	HandlingDays float64
}

// NodeTypes 物流点等级目录（station/local/city/hub）。
var NodeTypes = map[string]NodeTypeInfo{
	"station": {Label: "物流站点", Cost: 200000, Throughput: 1, HandlingDays: 1.0},
	"local":   {Label: "物流中心", Cost: 500000, Throughput: 2, HandlingDays: 0.5},
	"city":    {Label: "城市节点", Cost: 1000000, Throughput: 4, HandlingDays: 0.3},
	"hub":     {Label: "中转枢纽", Cost: 2500000, Throughput: 8, HandlingDays: 0.2},
}

// VehicleType 车辆型号目录。
type VehicleType struct {
	ID        string
	Name      string
	Mode      string // road/rail/air/sea
	Capacity  int    // 吨
	Speed     int    // km/h
	Cost      int    // 元（购置价）
	FuelPerKm float64
}

// VehicleTypes 五种车型。
var VehicleTypes = []VehicleType{
	{ID: "ltruck", Name: "轻型厢货", Mode: "road", Capacity: 8, Speed: 80, Cost: 150000, FuelPerKm: 0.9},
	{ID: "htruck", Name: "重型卡车", Mode: "road", Capacity: 40, Speed: 70, Cost: 380000, FuelPerKm: 1.6},
	{ID: "train", Name: "货运列车", Mode: "rail", Capacity: 1500, Speed: 95, Cost: 3000000, FuelPerKm: 0.06},
	{ID: "plane", Name: "货运飞机", Mode: "air", Capacity: 120, Speed: 750, Cost: 9000000, FuelPerKm: 7},
	{ID: "ship", Name: "远洋货轮", Mode: "sea", Capacity: 6000, Speed: 33, Cost: 5500000, FuelPerKm: 0.03},
}

var vehicleTypeMap = func() map[string]VehicleType {
	m := make(map[string]VehicleType, len(VehicleTypes))
	for _, v := range VehicleTypes {
		m[v.ID] = v
	}
	return m
}()

// VehicleTypeByID 按型号 ID 取目录。
func VehicleTypeByID(id string) (VehicleType, bool) {
	v, ok := vehicleTypeMap[id]
	return v, ok
}

// NodeBuildCost 建点成本 = 等级基础成本 × 城市重要度系数（取整）。
func NodeBuildCost(tier string, cityTier int) int {
	info, ok := NodeTypes[tier]
	if !ok {
		return 0
	}
	return int(float64(info.Cost) * tierMult(cityTier))
}

func tierMult(tier int) float64 {
	switch tier {
	case 1:
		return 1.0
	case 2:
		return 0.8
	default:
		return 0.6
	}
}
