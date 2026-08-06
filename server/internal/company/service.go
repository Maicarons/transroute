package company

import (
	"errors"
	"math"

	"github.com/google/uuid"

	"github.com/transroute/server/internal/content"
	"github.com/transroute/server/internal/geo"
	"github.com/transroute/server/internal/model"
	"github.com/transroute/server/internal/repo"
)

// Service 公司业务规则（建点 / 购车租赁 / 开线路 / 派单 / 借贷还款）。
// 仅依赖 repo 与静态目录，不直接触达 ws/world（广播由 handler 编排）。
type Service struct {
	repos *repo.Repos
}

// NewService 构造公司服务。
func NewService(r *repo.Repos) *Service { return &Service{repos: r} }

// LaneInput 开线路入参。
type LaneInput struct {
	From        string
	To          string
	Mode        string
	Capacity    int
	Price       int
	TransitDays float64
	Interline   bool
}

func round64(f float64) int64 { return int64(math.Round(f)) }

// today 取世界当前天数。
func (s *Service) today(worldID uuid.UUID) int {
	if w, err := s.repos.GetWorld(worldID); err == nil {
		return w.CurrentDay
	}
	return 0
}

// ledger 写一条账本事件（忽略错误，避免阻断主流程）。
func (s *Service) ledger(companyID, worldID uuid.UUID, day int, typ string, amount int64, note string) {
	_ = s.repos.AddLedger(&model.LedgerEvent{
		ID:        uuid.New(),
		CompanyID: companyID,
		WorldID:   worldID,
		Day:       day,
		Type:      typ,
		Amount:    amount,
		Note:      note,
	})
}

// CreateNode 建/升物流点（每城市每公司限一个）。
func (s *Service) CreateNode(cid, worldID uuid.UUID, cityID string, tier string) error {
	if !model.ValidTier(tier) {
		return errors.New("物流点等级非法")
	}
	city, ok := geo.GetCity(cityID)
	if !ok {
		return errors.New("未知城市")
	}
	has, err := s.repos.HasNodeAt(cid, cityID)
	if err != nil {
		return err
	}
	if has {
		return errors.New("该城市已建有物流点")
	}
	company, err := s.repos.GetCompany(cid)
	if err != nil {
		return err
	}
	cost := content.NodeBuildCost(tier, city.Tier)
	if company.Cash < int64(cost) {
		return errors.New("现金不足，无法建点")
	}
	day := s.today(worldID)
	node := &model.Node{
		ID:           uuid.New(),
		CompanyID:    cid,
		WorldID:      worldID,
		CityID:       cityID,
		CityName:     city.Name,
		Tier:         tier,
		BuiltDay:     day,
		Capacity:     content.NodeTypes[tier].Throughput,
		HandlingDays: content.NodeTypes[tier].HandlingDays,
		Lat:          city.Lat,
		Lng:          city.Lng,
	}
	if err := s.repos.AddNode(node); err != nil {
		return err
	}
	company.Cash -= int64(cost)
	if err := s.repos.SaveCompany(company); err != nil {
		return err
	}
	s.ledger(cid, worldID, day, "build_node", -int64(cost), city.Name+" 建点")
	return nil
}

// BuyOrLeaseVehicle 购车（自有）或租赁车辆。leaseDays>0 时租赁设到期日，否则无限期。
func (s *Service) BuyOrLeaseVehicle(cid uuid.UUID, typeID string, lease bool, leaseDays int) error {
	vt, ok := content.VehicleTypeByID(typeID)
	if !ok {
		return errors.New("未知车型")
	}
	company, err := s.repos.GetCompany(cid)
	if err != nil {
		return err
	}
	day := s.today(company.WorldID)
	v := &model.Vehicle{
		ID:           uuid.New(),
		CompanyID:    cid,
		TypeID:       vt.ID,
		Mode:         vt.Mode,
		CapacityTons: vt.Capacity,
		SpeedKmh:     vt.Speed,
		Owned:        !lease,
		Status:       string(model.VehicleIdle),
	}
	if lease {
		v.LeaseDaily = int64(math.Round(float64(vt.Cost) * model.LeaseDailyRate))
		if leaseDays > 0 {
			u := day + leaseDays
			v.LeaseUntilDay = &u
		}
	} else {
		if company.Cash < int64(vt.Cost) {
			return errors.New("现金不足，无法购车")
		}
		company.Cash -= int64(vt.Cost)
		if err := s.repos.SaveCompany(company); err != nil {
			return err
		}
		s.ledger(cid, company.WorldID, day, "buy_vehicle", -int64(vt.Cost), vt.Name)
	}
	return s.repos.AddVehicle(v)
}

// ReturnVehicle 退租 / 退役车辆：校验归属后直接置 retired，停止后续租赁扣费与占用。
func (s *Service) ReturnVehicle(cid, vid uuid.UUID) error {
	v, err := s.repos.GetVehicle(vid, cid)
	if err != nil {
		return errors.New("车辆不存在或不属于该公司")
	}
	v.BusyUntilDay = nil
	v.Status = string(model.VehicleRetired)
	return s.repos.SaveVehicle(v)
}

// CreateLane 开通运营线路（需两端已建点；海运需两端沿海）。
func (s *Service) CreateLane(cid, worldID uuid.UUID, in LaneInput) error {
	if err := ValidateLaneInput(in); err != nil {
		return err
	}
	from, ok1 := geo.GetCity(in.From)
	to, ok2 := geo.GetCity(in.To)
	if !ok1 || !ok2 {
		return errors.New("未知城市")
	}
	if err := checkCoastal(in.Mode, from.Coastal, to.Coastal); err != nil {
		return err
	}
	for _, c := range []string{in.From, in.To} {
		has, err := s.repos.HasNodeAt(cid, c)
		if err != nil {
			return err
		}
		if !has {
			return errors.New("线路两端必须已建有物流点")
		}
	}
	day := s.today(worldID)
	lane := &model.Lane{
		ID:                 uuid.New(),
		CompanyID:          cid,
		WorldID:            worldID,
		FromCityID:         in.From,
		ToCityID:           in.To,
		Mode:               in.Mode,
		CapacityTonsPerDay: in.Capacity,
		PricePerTon:        in.Price,
		TransitDays:        in.TransitDays,
		Interline:          in.Interline,
		Active:             true,
		CreatedDay:         day,
	}
	s.ledger(cid, worldID, day, "open_lane", 0, in.From+"→"+in.To)
	return s.repos.AddLane(lane)
}

// DispatchOrder 将货单派给空闲且匹配模式的车辆。
func (s *Service) DispatchOrder(cid, orderID, vehicleID uuid.UUID) error {
	order, err := s.repos.GetOrderByID(orderID)
	if err != nil {
		return errors.New("货单不存在")
	}
	if order.CompanyID != uuid.Nil && order.CompanyID != cid {
		return errors.New("无权操作该货单")
	}
	if order.Status != string(model.OrderPending) {
		return errors.New("货单不可派单")
	}
	vehicle, err := s.repos.GetVehicle(vehicleID, cid)
	if err != nil {
		return errors.New("车辆不存在")
	}
	if vehicle.Status != string(model.VehicleIdle) {
		return errors.New("车辆忙")
	}
	if model.TransportMode(vehicle.Mode) != model.TransportMode(order.Mode) {
		return errors.New("车辆运输方式与货单不符")
	}
	if vehicle.CapacityTons < int(order.Tons) {
		return errors.New("车辆运力不足")
	}
	// spot 散单初始无归属，派单时归属到当前公司（结算据此入账）。
	if order.CompanyID == uuid.Nil {
		order.CompanyID = cid
	}
	isBusy := vehicle.BusyUntilDay != nil && *vehicle.BusyUntilDay > s.today(order.WorldID)
	if isBusy {
		return errors.New("车辆忙")
	}
	// 计算时效（天）
	var transitDays float64
	if order.LaneID != nil {
		if lane, err := s.repos.GetLane(*order.LaneID); err == nil {
			transitDays = lane.TransitDays
		}
	}
	if transitDays <= 0 {
		d := geo.DistanceKm(order.FromCityID, order.ToCityID)
		if d > 0 && vehicle.SpeedKmh > 0 {
			transitDays = d / float64(vehicle.SpeedKmh)
		} else {
			transitDays = 1
		}
	}
	arrive := s.today(order.WorldID) + int(math.Ceil(transitDays))
	vehicle.BusyUntilDay = &arrive
	vehicle.Status = string(model.VehicleBusy)
	order.VehicleID = &vehicleID
	order.Status = string(model.OrderInTransit)
	order.AcceptedDay = s.today(order.WorldID)

	if err := s.repos.SaveVehicle(vehicle); err != nil {
		return err
	}
	return s.repos.SaveOrder(order)
}

// Borrow 借款：增加债务与现金，记一笔贷款。
func (s *Service) Borrow(cid uuid.UUID, amount int64) error {
	if amount <= 0 {
		return errors.New("借款金额必须大于 0")
	}
	company, err := s.repos.GetCompany(cid)
	if err != nil {
		return err
	}
	day := s.today(company.WorldID)
	loan := &model.Loan{
		ID:         uuid.New(),
		CompanyID:  cid,
		Principal:  amount,
		RatePerDay: model.LoanDailyRate,
		TakenDay:   day,
		Repaid:     false,
	}
	if err := s.repos.AddLoan(loan); err != nil {
		return err
	}
	company.Debt += amount
	company.Cash += amount
	if err := s.repos.SaveCompany(company); err != nil {
		return err
	}
	s.ledger(cid, company.WorldID, day, "borrow", amount, "借款")
	return nil
}

// Repay 还款：优先冲抵未还贷款本金，扣减债务与现金。
func (s *Service) Repay(cid uuid.UUID, amount int64) error {
	if amount <= 0 {
		return errors.New("还款金额必须大于 0")
	}
	company, err := s.repos.GetCompany(cid)
	if err != nil {
		return err
	}
	pay := amount
	if pay > company.Debt {
		pay = company.Debt
	}
	if pay > company.Cash {
		pay = company.Cash
	}
	if pay <= 0 {
		return errors.New("无可还款余额或现金不足")
	}
	day := s.today(company.WorldID)
	loans, err := s.repos.ListLoans(cid)
	if err != nil {
		return err
	}
	remaining := pay
	for _, l := range loans {
		if remaining <= 0 {
			break
		}
		if l.Principal <= remaining {
			remaining -= l.Principal
			l.Principal = 0
			l.Repaid = true
		} else {
			l.Principal -= remaining
			remaining = 0
		}
		if err := s.repos.SaveLoan(&l); err != nil {
			return err
		}
	}
	company.Debt -= pay
	company.Cash -= pay
	if err := s.repos.SaveCompany(company); err != nil {
		return err
	}
	s.ledger(cid, company.WorldID, day, "repay", -pay, "还款")
	return nil
}

// RecomputeNetWorth 重算并持久化净资产（NetWorth = Cash - Debt）。
func (s *Service) RecomputeNetWorth(cid uuid.UUID) error {
	company, err := s.repos.GetCompany(cid)
	if err != nil {
		return err
	}
	company.NetWorth = ComputeNetWorth(company.Cash, company.Debt)
	return s.repos.SaveCompany(company)
}

// ComputeNetWorth 净资产 = 现金 − 债务（纯函数，便于单测）。
func ComputeNetWorth(cash, debt int64) int64 {
	return cash - debt
}

// ApplyInterest 计算当日贷款利息（Debt × LOAN_DAILY_RATE，四舍五入到元）。
func ApplyInterest(debt int64) int64 {
	return round64(float64(debt) * model.LoanDailyRate)
}
