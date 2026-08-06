package model

import (
	"time"

	"github.com/google/uuid"
)

// 核心实体（GORM 表名默认小写复数，见 §8.3）。

// User 注册用户。
type User struct {
	ID           uuid.UUID `gorm:"type:text;primaryKey" json:"id"`
	Username     string    `gorm:"uniqueIndex;size:64" json:"username"`
	PasswordHash string    `gorm:"size:128" json:"-"`
	Email        string    `gorm:"size:128" json:"email"`
	CreatedAt    time.Time `json:"createdAt"`
}

// World 多人在线世界（包含公司、货量池、联盟）。
type World struct {
	ID          uuid.UUID `gorm:"type:text;primaryKey" json:"id"`
	Name        string    `gorm:"size:128" json:"name"`
	TickSeconds int       `json:"tickSeconds"`
	Status      string    `gorm:"size:16" json:"status"`
	CurrentDay  int       `json:"currentDay"`
	SeedConfig  string    `gorm:"type:text" json:"seedConfig"`
	CreatedAt   time.Time `json:"createdAt"`
}

// Company 玩家在某一世界内的化身（聚合根）。
type Company struct {
	ID         uuid.UUID  `gorm:"type:text;primaryKey" json:"id"`
	WorldID    uuid.UUID  `gorm:"index" json:"worldId"`
	OwnerID    uuid.UUID  `json:"ownerId"`
	Name       string     `gorm:"size:128" json:"name"`
	Cash       int64      `json:"cash"`
	Reputation int        `json:"reputation"`
	Debt       int64      `json:"debt"`
	NetWorth   int64      `json:"netWorth"`
	AllianceID *uuid.UUID `gorm:"index" json:"allianceId,omitempty"`
	CreatedAt  time.Time  `json:"createdAt"`
	// 运行期标记：已破产则停止模拟。
	Broke bool `gorm:"default:false" json:"broke"`
}

// Node 物流点（建在世界某城市）。
type Node struct {
	ID           uuid.UUID `gorm:"type:text;primaryKey" json:"id"`
	CompanyID    uuid.UUID `gorm:"index" json:"companyId"`
	WorldID      uuid.UUID `json:"worldId"`
	CityID       string    `gorm:"size:32" json:"cityId"`
	CityName     string    `gorm:"size:32" json:"cityName"`
	Tier         string    `gorm:"size:16" json:"tier"`
	BuiltDay     int       `json:"builtDay"`
	Capacity     int       `json:"capacity"`
	HandlingDays float64   `json:"handlingDays"`
	Lat          float64   `json:"lat"`
	Lng          float64   `json:"lng"`
}

// Vehicle 车辆（自有或租赁）。
type Vehicle struct {
	ID            uuid.UUID `gorm:"type:text;primaryKey" json:"id"`
	CompanyID     uuid.UUID `gorm:"index" json:"companyId"`
	TypeID        string    `gorm:"size:32" json:"typeId"`
	Mode          string    `gorm:"size:8" json:"mode"`
	CapacityTons  int       `json:"capacityTons"`
	SpeedKmh      int       `json:"speedKmh"`
	Owned         bool      `json:"owned"`
	LeaseDaily    int64     `json:"leaseDaily"`
	LeaseUntilDay *int      `json:"leaseUntilDay,omitempty"`
	BusyUntilDay  *int      `json:"busyUntilDay,omitempty"`
	Status        string    `gorm:"size:16" json:"status"`
}

// Lane 运营线路（定价/时效/联运）。
type Lane struct {
	ID                 uuid.UUID `gorm:"type:text;primaryKey" json:"id"`
	CompanyID          uuid.UUID `gorm:"index" json:"companyId"`
	WorldID            uuid.UUID `gorm:"index" json:"worldId"`
	FromCityID         string    `gorm:"size:32" json:"fromCityId"`
	ToCityID           string    `gorm:"size:32" json:"toCityId"`
	Mode               string    `gorm:"size:8" json:"mode"`
	CapacityTonsPerDay int       `json:"capacityTonsPerDay"`
	PricePerTon        int       `json:"pricePerTon"`
	TransitDays        float64   `json:"transitDays"`
	Interline          bool      `json:"interline"`
	Active             bool      `json:"active"`
	CreatedDay         int       `json:"createdDay"`
}

// CargoPool 共享货量池（按 OD 生成，窗口期有效）。
type CargoPool struct {
	ID           uuid.UUID `gorm:"type:text;primaryKey" json:"id"`
	WorldID      uuid.UUID `gorm:"index" json:"worldId"`
	FromCityID   string    `gorm:"size:32" json:"fromCityId"`
	ToCityID     string    `gorm:"size:32" json:"toCityId"`
	TotalTons    float64   `json:"totalTons"`
	WindowDays   int       `json:"windowDays"`
	GeneratedDay int       `json:"generatedDay"`
	ExpiresDay   int       `json:"expiresDay"`
}

// Order 货单（按 rating 分配或世界散单）。
type Order struct {
	ID          uuid.UUID  `gorm:"type:text;primaryKey" json:"id"`
	WorldID     uuid.UUID  `gorm:"index" json:"worldId"`
	CompanyID   uuid.UUID  `gorm:"index" json:"companyId"`
	Kind        string     `gorm:"size:16" json:"kind"`
	FromCityID  string     `gorm:"size:32" json:"fromCityId"`
	ToCityID    string     `gorm:"size:32" json:"toCityId"`
	Tons        float64    `json:"tons"`
	PricePerTon int        `json:"pricePerTon"`
	Reward      int64      `json:"reward"`
	Mode        string     `gorm:"size:8" json:"mode"`
	AcceptedDay int        `json:"acceptedDay"`
	DeadlineDay int        `json:"deadlineDay"`
	Status      string     `gorm:"size:16" json:"status"`
	VehicleID   *uuid.UUID `json:"vehicleId,omitempty"`
	LaneID      *uuid.UUID `json:"laneId,omitempty"`
}
