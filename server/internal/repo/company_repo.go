package repo

import (
	"time"

	"github.com/google/uuid"

	"github.com/transroute/server/internal/model"
)

// CreateCompany 在世界内为用户创建化身公司（初始现金/声誉见 constants）。
func (r *Repos) CreateCompany(ownerID, worldID uuid.UUID, name string) (*model.Company, error) {
	c := &model.Company{
		ID:         uuid.New(),
		WorldID:    worldID,
		OwnerID:    ownerID,
		Name:       name,
		Cash:       model.InitCash,
		Reputation: model.InitReputation,
		Debt:       0,
		NetWorth:   model.InitCash,
		CreatedAt:  time.Now(),
		Broke:      false,
	}
	if err := r.DB.Create(c).Error; err != nil {
		return nil, err
	}
	return c, nil
}

// GetCompanyByUserWorld 取用户在某世界的公司（用于加入/鉴权）。
func (r *Repos) GetCompanyByUserWorld(userID, worldID uuid.UUID) (*model.Company, error) {
	var c model.Company
	if err := r.DB.Where("owner_id = ? AND world_id = ?", userID, worldID).First(&c).Error; err != nil {
		return nil, err
	}
	return &c, nil
}

// GetCompany 按 ID 取公司。
func (r *Repos) GetCompany(id uuid.UUID) (*model.Company, error) {
	var c model.Company
	if err := r.DB.Where("id = ?", id).First(&c).Error; err != nil {
		return nil, err
	}
	return &c, nil
}

// ListCompanies 列出世界内全部公司。
func (r *Repos) ListCompanies(worldID uuid.UUID) ([]model.Company, error) {
	var list []model.Company
	if err := r.DB.Where("world_id = ?", worldID).Order("net_worth desc").Find(&list).Error; err != nil {
		return nil, err
	}
	return list, nil
}

// SaveCompany 持久化公司。
func (r *Repos) SaveCompany(c *model.Company) error {
	return r.DB.Save(c).Error
}

// HasNodeAt 判断公司是否在指定城市建有物流点。
func (r *Repos) HasNodeAt(companyID uuid.UUID, cityID string) (bool, error) {
	var count int64
	if err := r.DB.Model(&model.Node{}).
		Where("company_id = ? AND city_id = ?", companyID, cityID).
		Count(&count).Error; err != nil {
		return false, err
	}
	return count > 0, nil
}

// AddNode 新增物流点。
func (r *Repos) AddNode(n *model.Node) error { return r.DB.Create(n).Error }

// ListNodes 列出公司全部物流点。
func (r *Repos) ListNodes(companyID uuid.UUID) ([]model.Node, error) {
	var list []model.Node
	if err := r.DB.Where("company_id = ?", companyID).Find(&list).Error; err != nil {
		return nil, err
	}
	return list, nil
}

// AddVehicle 新增车辆。
func (r *Repos) AddVehicle(v *model.Vehicle) error { return r.DB.Create(v).Error }

// ListVehicles 列出公司全部车辆。
func (r *Repos) ListVehicles(companyID uuid.UUID) ([]model.Vehicle, error) {
	var list []model.Vehicle
	if err := r.DB.Where("company_id = ?", companyID).Find(&list).Error; err != nil {
		return nil, err
	}
	return list, nil
}

// GetVehicle 取公司所属车辆。
func (r *Repos) GetVehicle(id, companyID uuid.UUID) (*model.Vehicle, error) {
	var v model.Vehicle
	if err := r.DB.Where("id = ? AND company_id = ?", id, companyID).First(&v).Error; err != nil {
		return nil, err
	}
	return &v, nil
}

// SaveVehicle 持久化车辆。
func (r *Repos) SaveVehicle(v *model.Vehicle) error { return r.DB.Save(v).Error }

// ListLeasedVehicles 列出世界内全部租赁（非自有）车辆。
func (r *Repos) ListLeasedVehicles(worldID uuid.UUID) ([]model.Vehicle, error) {
	var list []model.Vehicle
	if err := r.DB.Where("owned = ? AND company_id IN (SELECT id FROM companies WHERE world_id = ?)",
		false, worldID).Find(&list).Error; err != nil {
		return nil, err
	}
	return list, nil
}

// ReleaseIdleVehicles 释放世界内到期（BusyUntilDay ≤ day）的忙车辆，置为空闲。
func (r *Repos) ReleaseIdleVehicles(worldID uuid.UUID, day int) error {
	return r.DB.Exec(`UPDATE vehicles SET status = ?, busy_until_day = NULL
		WHERE status = ? AND busy_until_day IS NOT NULL AND busy_until_day <= ?
		AND company_id IN (SELECT id FROM companies WHERE world_id = ?)`,
		string(model.VehicleIdle), string(model.VehicleBusy), day, worldID).Error
}

// DeleteVehicle 删除车辆（租赁到期退租）。
func (r *Repos) DeleteVehicle(id uuid.UUID) error {
	return r.DB.Where("id = ?", id).Delete(&model.Vehicle{}).Error
}

// AddLane 新增线路。
func (r *Repos) AddLane(l *model.Lane) error { return r.DB.Create(l).Error }

// SaveLane 持久化线路。
func (r *Repos) SaveLane(l *model.Lane) error { return r.DB.Save(l).Error }

// ListWorldLanes 列出世界内全部（运营中）线路，供分配引擎使用。
func (r *Repos) ListWorldLanes(worldID uuid.UUID) ([]model.Lane, error) {
	var list []model.Lane
	if err := r.DB.Where("world_id = ? AND active = ?", worldID, true).Find(&list).Error; err != nil {
		return nil, err
	}
	return list, nil
}

// ListCompanyLanes 列出公司全部线路。
func (r *Repos) ListCompanyLanes(companyID uuid.UUID) ([]model.Lane, error) {
	var list []model.Lane
	if err := r.DB.Where("company_id = ?", companyID).Find(&list).Error; err != nil {
		return nil, err
	}
	return list, nil
}

// GetLane 按 ID 取线路（不限公司，用于快照）。
func (r *Repos) GetLane(id uuid.UUID) (*model.Lane, error) {
	var l model.Lane
	if err := r.DB.Where("id = ?", id).First(&l).Error; err != nil {
		return nil, err
	}
	return &l, nil
}

// AddOrder 新增货单。
func (r *Repos) AddOrder(o *model.Order) error { return r.DB.Create(o).Error }

// SaveOrder 持久化货单。
func (r *Repos) SaveOrder(o *model.Order) error { return r.DB.Save(o).Error }

// GetOrderByID 按 ID 取货单。
func (r *Repos) GetOrderByID(id uuid.UUID) (*model.Order, error) {
	var o model.Order
	if err := r.DB.Where("id = ?", id).First(&o).Error; err != nil {
		return nil, err
	}
	return &o, nil
}

// ListWorldOrders 列出世界内处于指定状态的货单。
func (r *Repos) ListWorldOrders(worldID uuid.UUID, statuses []string) ([]model.Order, error) {
	var list []model.Order
	q := r.DB.Where("world_id = ?", worldID)
	if len(statuses) > 0 {
		q = q.Where("status IN ?", statuses)
	}
	if err := q.Find(&list).Error; err != nil {
		return nil, err
	}
	return list, nil
}

// AddLoan 新增借款记录。
func (r *Repos) AddLoan(l *model.Loan) error { return r.DB.Create(l).Error }

// SaveLoan 持久化借款（用于还款冲抵本金）。
func (r *Repos) SaveLoan(l *model.Loan) error { return r.DB.Save(l).Error }

// ListLoans 列出公司未还清借款。
func (r *Repos) ListLoans(companyID uuid.UUID) ([]model.Loan, error) {
	var list []model.Loan
	if err := r.DB.Where("company_id = ? AND repaid = ?", companyID, false).Find(&list).Error; err != nil {
		return nil, err
	}
	return list, nil
}

// AddLedger 新增账本事件。
func (r *Repos) AddLedger(e *model.LedgerEvent) error { return r.DB.Create(e).Error }

// ListLedger 列出公司最近账本事件（按天倒序）。
func (r *Repos) ListLedger(companyID, worldID uuid.UUID, limit int) ([]model.LedgerEvent, error) {
	var list []model.LedgerEvent
	q := r.DB.Where("company_id = ? AND world_id = ?", companyID, worldID)
	if limit > 0 {
		q = q.Limit(limit)
	}
	if err := q.Order("day desc, id desc").Find(&list).Error; err != nil {
		return nil, err
	}
	return list, nil
}
