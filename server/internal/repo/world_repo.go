package repo

import (
	"time"

	"github.com/google/uuid"

	"github.com/transroute/server/internal/model"
)

// CreateWorld 创建世界（默认 setup 状态，CurrentDay=0）。
func (r *Repos) CreateWorld(name string, tickSeconds int) (*model.World, error) {
	if tickSeconds <= 0 {
		tickSeconds = model.DefaultTickSeconds
	}
	w := &model.World{
		ID:          uuid.New(),
		Name:        name,
		TickSeconds: tickSeconds,
		Status:      string(model.WorldSetup),
		CurrentDay:  0,
		CreatedAt:   time.Now(),
	}
	if err := r.DB.Create(w).Error; err != nil {
		return nil, err
	}
	return w, nil
}

// ListWorlds 列出全部世界。
func (r *Repos) ListWorlds() ([]model.World, error) {
	var list []model.World
	if err := r.DB.Order("created_at asc").Find(&list).Error; err != nil {
		return nil, err
	}
	return list, nil
}

// GetWorld 按 ID 查询世界。
func (r *Repos) GetWorld(id uuid.UUID) (*model.World, error) {
	var w model.World
	if err := r.DB.Where("id = ?", id).First(&w).Error; err != nil {
		return nil, err
	}
	return &w, nil
}

// SaveWorld 持久化世界（CurrentDay / Status 推进）。
func (r *Repos) SaveWorld(w *model.World) error {
	return r.DB.Save(w).Error
}

// GetRunningWorlds 取出所有 running 状态的世界（用于启动 ticker）。
func (r *Repos) GetRunningWorlds() ([]model.World, error) {
	var list []model.World
	if err := r.DB.Where("status = ?", string(model.WorldRunning)).Find(&list).Error; err != nil {
		return nil, err
	}
	return list, nil
}
