package model

import "github.com/google/uuid"

// 关联实体（联盟 / 玩家市场 / 金融 / 账本 / 评分）。

// Alliance 联盟（联运加成开关）。
type Alliance struct {
	ID               uuid.UUID `gorm:"type:text;primaryKey" json:"id"`
	WorldID          uuid.UUID `gorm:"index" json:"worldId"`
	Name             string    `gorm:"size:128" json:"name"`
	InterlineEnabled bool      `json:"interlineEnabled"`
	CreatedDay       int       `json:"createdDay"`
}

// AllianceMember 联盟成员（多对多桥接）。
type AllianceMember struct {
	ID         uuid.UUID `gorm:"type:text;primaryKey" json:"id"`
	AllianceID uuid.UUID `gorm:"index" json:"allianceId"`
	CompanyID  uuid.UUID `gorm:"index" json:"companyId"`
	JoinedDay  int       `json:"joinedDay"`
	Role       string    `gorm:"size:16" json:"role"`
}

// MarketListing 玩家市场挂单（REST 即时成交为主）。
type MarketListing struct {
	ID              uuid.UUID  `gorm:"type:text;primaryKey" json:"id"`
	WorldID         uuid.UUID  `gorm:"index" json:"worldId"`
	ListerCompanyID uuid.UUID  `gorm:"index" json:"listerCompanyId"`
	Type            string     `gorm:"size:16" json:"type"`
	FromCityID      string     `gorm:"size:32" json:"fromCityId"`
	ToCityID        string     `gorm:"size:32" json:"toCityId"`
	Tons            float64    `json:"tons"`
	PricePerTon     int        `json:"pricePerTon"`
	Mode            string     `gorm:"size:8" json:"mode"`
	Status          string     `gorm:"size:16" json:"status"`
	CreatedDay      int        `json:"createdDay"`
	FilledDay       *int       `json:"filledDay,omitempty"`
	BuyerCompanyID  *uuid.UUID `json:"buyerCompanyId,omitempty"`
}

// Loan 借款记录。
type Loan struct {
	ID         uuid.UUID `gorm:"type:text;primaryKey" json:"id"`
	CompanyID  uuid.UUID `gorm:"index" json:"companyId"`
	Principal  int64     `json:"principal"`
	RatePerDay float64   `json:"ratePerDay"`
	TakenDay   int       `json:"takenDay"`
	DueDay     *int      `json:"dueDay,omitempty"`
	Repaid     bool      `json:"repaid"`
}

// LedgerEvent 账本事件（有符号金额，用于审计与对手监控）。
type LedgerEvent struct {
	ID        uuid.UUID `gorm:"type:text;primaryKey" json:"id"`
	CompanyID uuid.UUID `gorm:"index" json:"companyId"`
	WorldID   uuid.UUID `gorm:"index" json:"worldId"`
	Day       int       `json:"day"`
	Type      string    `gorm:"size:32" json:"type"`
	Amount    int64     `json:"amount"`
	Note      string    `gorm:"size:255" json:"note"`
}

// Rating 共享市场评分快照（每 tick 重算）。
type Rating struct {
	ID             uuid.UUID `gorm:"type:text;primaryKey" json:"id"`
	CompanyID      uuid.UUID `gorm:"index" json:"companyId"`
	WorldID        uuid.UUID `gorm:"index" json:"worldId"`
	FromCityID     string    `gorm:"size:32" json:"fromCityId"`
	ToCityID       string    `gorm:"size:32" json:"toCityId"`
	PriceScore     float64   `json:"priceScore"`
	TransitScore   float64   `json:"transitScore"`
	CoverageScore  float64   `json:"coverageScore"`
	InterlineScore float64   `json:"interlineScore"`
	Composite      float64   `json:"composite"`
	ComputedDay    int       `json:"computedDay"`
}
