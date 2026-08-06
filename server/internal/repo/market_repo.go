package repo

import (
	"github.com/google/uuid"

	"github.com/transroute/server/internal/model"
)

// AddListing 新增玩家市场挂单（open）。
func (r *Repos) AddListing(l *model.MarketListing) error {
	l.CreatedDay = 0 // 由调用方设置 CurrentDay
	l.Status = string(model.ListingOpen)
	return r.DB.Create(l).Error
}

// GetListing 按 ID 取挂单。
func (r *Repos) GetListing(id uuid.UUID) (*model.MarketListing, error) {
	var l model.MarketListing
	if err := r.DB.Where("id = ?", id).First(&l).Error; err != nil {
		return nil, err
	}
	return &l, nil
}

// ListOpenListings 列出世界内 open 挂单。
func (r *Repos) ListOpenListings(worldID uuid.UUID) ([]model.MarketListing, error) {
	var list []model.MarketListing
	if err := r.DB.Where("world_id = ? AND status = ?", worldID, string(model.ListingOpen)).
		Order("created_day asc").Find(&list).Error; err != nil {
		return nil, err
	}
	return list, nil
}

// SaveListing 持久化挂单。
func (r *Repos) SaveListing(l *model.MarketListing) error { return r.DB.Save(l).Error }

// PruneMarket 清理世界内已成交/已撤单且早于 beforeDay 的挂单（控制表规模）。
func (r *Repos) PruneMarket(worldID uuid.UUID, beforeDay int) error {
	return r.DB.Where("world_id = ? AND status <> ? AND created_day < ?",
		worldID, string(model.ListingOpen), beforeDay).
		Delete(&model.MarketListing{}).Error
}

// ---- 联盟 / 联运 ----

// AddAlliance 创建联盟（interlineEnabled 默认开启）。
func (r *Repos) AddAlliance(a *model.Alliance) error { return r.DB.Create(a).Error }

// GetAlliance 按 ID 取联盟。
func (r *Repos) GetAlliance(id uuid.UUID) (*model.Alliance, error) {
	var a model.Alliance
	if err := r.DB.Where("id = ?", id).First(&a).Error; err != nil {
		return nil, err
	}
	return &a, nil
}

// ListWorldAlliances 列出世界内全部联盟。
func (r *Repos) ListWorldAlliances(worldID uuid.UUID) ([]model.Alliance, error) {
	var list []model.Alliance
	if err := r.DB.Where("world_id = ?", worldID).Find(&list).Error; err != nil {
		return nil, err
	}
	return list, nil
}

// AddAllianceMember 加入联盟。
func (r *Repos) AddAllianceMember(m *model.AllianceMember) error {
	return r.DB.Create(m).Error
}

// GetAllianceMember 取公司在某联盟的成员关系。
func (r *Repos) GetAllianceMember(allianceID, companyID uuid.UUID) (*model.AllianceMember, error) {
	var m model.AllianceMember
	if err := r.DB.Where("alliance_id = ? AND company_id = ?", allianceID, companyID).
		First(&m).Error; err != nil {
		return nil, err
	}
	return &m, nil
}

// RemoveAllianceMember 移除成员关系。
func (r *Repos) RemoveAllianceMember(allianceID, companyID uuid.UUID) error {
	return r.DB.Where("alliance_id = ? AND company_id = ?", allianceID, companyID).
		Delete(&model.AllianceMember{}).Error
}

// ListAllianceMembers 列出联盟全部成员。
func (r *Repos) ListAllianceMembers(allianceID uuid.UUID) ([]model.AllianceMember, error) {
	var list []model.AllianceMember
	if err := r.DB.Where("alliance_id = ?", allianceID).Find(&list).Error; err != nil {
		return nil, err
	}
	return list, nil
}

// SetCompanyAlliance 更新公司所属联盟（nil 表示退出）。
func (r *Repos) SetCompanyAlliance(companyID uuid.UUID, allianceID *uuid.UUID) error {
	return r.DB.Model(&model.Company{}).Where("id = ?", companyID).
		Update("alliance_id", allianceID).Error
}
