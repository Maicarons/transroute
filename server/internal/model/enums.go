package model

// 枚举与状态常量集中定义，避免散落字符串字面量。

// NodeTier 物流点等级。
type NodeTier string

const (
	TierStation NodeTier = "station" // 站点
	TierLocal   NodeTier = "local"   // 本地仓
	TierCity    NodeTier = "city"    // 城市分拨
	TierHub     NodeTier = "hub"     // 枢纽
)

// TransportMode 运输方式。
type TransportMode string

const (
	ModeRoad TransportMode = "road"
	ModeRail TransportMode = "rail"
	ModeAir  TransportMode = "air"
	ModeSea  TransportMode = "sea"
)

// OrderKind 货单来源。
type OrderKind string

const (
	KindContract OrderKind = "contract" // 按 rating 分配的合同货流
	KindSpot     OrderKind = "spot"     // 世界随机散单（额外小单）
)

// OrderStatus 货单状态机。
type OrderStatus string

const (
	OrderPending   OrderStatus = "pending"    // 已生成，待派车
	OrderInTransit OrderStatus = "in_transit" // 运输中
	OrderDelivered OrderStatus = "delivered"  // 已送达（已结算）
	OrderExpired   OrderStatus = "expired"    // 超时未达，声誉受损
)

// ListingType 玩家市场挂单类型。
type ListingType string

const (
	ListingCapacitySell ListingType = "capacity_sell" // 卖运力
	ListingCargoBuy     ListingType = "cargo_buy"     // 求货
	ListingCargoSell    ListingType = "cargo_sell"    // 卖货
	ListingLaneLease    ListingType = "lane_lease"    // 租线路
)

// ListingStatus 挂单状态。
type ListingStatus string

const (
	ListingOpen     ListingStatus = "open"
	ListingFilled   ListingStatus = "filled"
	ListingCanceled ListingStatus = "canceled"
)

// MemberRole 联盟成员角色。
type MemberRole string

const (
	RoleLeader MemberRole = "leader"
	RoleMember MemberRole = "member"
)

// WorldStatus 世界运行状态。
type WorldStatus string

const (
	WorldSetup   WorldStatus = "setup"
	WorldRunning WorldStatus = "running"
	WorldPaused  WorldStatus = "paused"
)

// VehicleStatus 车辆占用状态。
type VehicleStatus string

const (
	VehicleIdle    VehicleStatus = "idle"
	VehicleBusy    VehicleStatus = "busy"
	VehicleRetired VehicleStatus = "retired"
)

// ValidMode 校验运输方式合法性。
func ValidMode(m string) bool {
	switch TransportMode(m) {
	case ModeRoad, ModeRail, ModeAir, ModeSea:
		return true
	}
	return false
}

// ValidListingType 校验玩家市场挂单类型合法性。
func ValidListingType(t string) bool {
	switch ListingType(t) {
	case ListingCapacitySell, ListingCargoBuy, ListingCargoSell, ListingLaneLease:
		return true
	}
	return false
}

// ValidTier 校验物流点等级合法性。
func ValidTier(t string) bool {
	switch NodeTier(t) {
	case TierStation, TierLocal, TierCity, TierHub:
		return true
	}
	return false
}
