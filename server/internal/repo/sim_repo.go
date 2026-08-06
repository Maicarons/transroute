package repo

import (
	"github.com/google/uuid"

	"github.com/transroute/server/internal/model"
)

// UpsertCargoPool 为单个 OD 刷新当日货量池：删除该 OD 既有池后写入新池，
// 保证 D(OD) 为当日最新需求（窗口由 ExpiresDay 控制）。
func (r *Repos) UpsertCargoPool(worldID uuid.UUID, from, to string, totalTons float64, windowDays, generatedDay, expiresDay int) error {
	if err := r.DB.Where("world_id = ? AND from_city_id = ? AND to_city_id = ?",
		worldID, from, to).Delete(&model.CargoPool{}).Error; err != nil {
		return err
	}
	p := &model.CargoPool{
		ID:           uuid.New(),
		WorldID:      worldID,
		FromCityID:   from,
		ToCityID:     to,
		TotalTons:    totalTons,
		WindowDays:   windowDays,
		GeneratedDay: generatedDay,
		ExpiresDay:   expiresDay,
	}
	return r.DB.Create(p).Error
}

// ListCargoPools 列出世界内全部货量池（未过期由调用方判定）。
func (r *Repos) ListCargoPools(worldID uuid.UUID) ([]model.CargoPool, error) {
	var list []model.CargoPool
	if err := r.DB.Where("world_id = ?", worldID).Find(&list).Error; err != nil {
		return nil, err
	}
	return list, nil
}

// PruneCargoPools 删除 world 内已过期（CurrentDay > ExpiresDay）的货量池。
func (r *Repos) PruneCargoPools(worldID uuid.UUID, currentDay int) error {
	return r.DB.Where("world_id = ? AND expires_day < ?", worldID, currentDay).
		Delete(&model.CargoPool{}).Error
}

// DeleteRatings 清空世界评分快照。
func (r *Repos) DeleteRatings(worldID uuid.UUID) error {
	return r.DB.Where("world_id = ?", worldID).Delete(&model.Rating{}).Error
}

// BulkInsertRatings 批量写入评分快照。
func (r *Repos) BulkInsertRatings(rows []model.Rating) error {
	if len(rows) == 0 {
		return nil
	}
	return r.DB.Create(&rows).Error
}

// PruneFinishedOrders 删除世界内已结算/已过期且早于 beforeDay 的货单（控制表规模）。
func (r *Repos) PruneFinishedOrders(worldID uuid.UUID, beforeDay int) error {
	return r.DB.Where("world_id = ? AND status IN ? AND deadline_day < ?",
		worldID,
		[]string{string(model.OrderDelivered), string(model.OrderExpired)},
		beforeDay).
		Delete(&model.Order{}).Error
}
