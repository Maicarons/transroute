package sim

import (
	"math"
	"math/rand"

	"github.com/google/uuid"

	"github.com/transroute/server/internal/geo"
	"github.com/transroute/server/internal/model"
	"github.com/transroute/server/internal/repo"
	"github.com/transroute/server/internal/world"
	"github.com/transroute/server/internal/ws"
)

// Engine 模拟引擎：按 §3.6 的 11 步顺序推进世界一天（一个 tick）。
type Engine struct {
	repos *repo.Repos
	wm    *world.WorldManager
}

// NewEngine 构造模拟引擎。
func NewEngine(r *repo.Repos, wm *world.WorldManager) *Engine {
	return &Engine{repos: r, wm: wm}
}

func tierOf(cityID string) int {
	if c, ok := geo.GetCity(cityID); ok {
		return c.Tier
	}
	return 3
}

// Tick 推进世界一天（§3.6 结算顺序）。
func (e *Engine) Tick(worldID uuid.UUID) error {
	w, err := e.repos.GetWorld(worldID)
	if err != nil {
		return err
	}
	if w.Status != string(model.WorldRunning) {
		return nil
	}
	day := w.CurrentDay

	companies, err := e.repos.ListCompanies(worldID)
	if err != nil {
		return err
	}
	compMap := make(map[uuid.UUID]*model.Company, len(companies))
	for i := range companies {
		compMap[companies[i].ID] = &companies[i]
	}

	// 联盟联运开关：公司 → 是否开启联运加成。
	allianceEnabled := map[uuid.UUID]bool{}
	if alliances, err := e.repos.ListWorldAlliances(worldID); err == nil {
		for _, a := range alliances {
			if !a.InterlineEnabled {
				continue
			}
			if members, err := e.repos.ListAllianceMembers(a.ID); err == nil {
				for _, m := range members {
					allianceEnabled[m.CompanyID] = true
				}
			}
		}
	}

	lanes, err := e.repos.ListWorldLanes(worldID)
	if err != nil {
		return err
	}

	events := make([]model.LedgerEvent, 0, 16)
	addLedger := func(companyID uuid.UUID, typ string, amount int64, note string) {
		ev := model.LedgerEvent{
			ID:        uuid.New(),
			CompanyID: companyID,
			WorldID:   worldID,
			Day:       day,
			Type:      typ,
			Amount:    amount,
			Note:      note,
		}
		events = append(events, ev)
		_ = e.repos.AddLedger(&ev)
	}

	rng := rand.New(rand.NewSource(int64(day) + 1))

	// ---- 步骤 1：截断过期货量池；为活跃 OD 生成当日需求 D(OD) ----
	_ = e.repos.PruneCargoPools(worldID, day)
	odPairs := make(map[string][2]string)
	for _, l := range lanes {
		odPairs[l.FromCityID+"->"+l.ToCityID] = [2]string{l.FromCityID, l.ToCityID}
	}
	demandMap := make(map[string]float64)
	for key, ft := range odPairs {
		tons := GenerateCargoTons(rng, tierOf(ft[0]), tierOf(ft[1]))
		_ = e.repos.UpsertCargoPool(worldID, ft[0], ft[1], tons, model.WindowDays, day, day+model.WindowDays)
		demandMap[key] = tons
	}

	// ---- 步骤 2：评分 + 按比例分配 → 生成 contract 货单 ----
	odCompanies := make(map[string]map[uuid.UUID]model.Lane)
	for _, l := range lanes {
		key := l.FromCityID + "->" + l.ToCityID
		m := odCompanies[key]
		if m == nil {
			m = make(map[uuid.UUID]model.Lane)
			odCompanies[key] = m
		}
		if ex, ok := m[l.CompanyID]; !ok || l.PricePerTon < ex.PricePerTon {
			m[l.CompanyID] = l
		}
	}

	newOrders := make([]model.Order, 0)
	var ratingRows []model.Rating
	for key, ft := range odPairs {
		demand := demandMap[key]
		if demand <= 0 {
			continue
		}
		od := OD{From: ft[0], To: ft[1], Demand: demand}
		ref := odRef(ft[0], ft[1])
		comps := make([]Competitor, 0, len(odCompanies[key]))
		for cid, lane := range odCompanies[key] {
			comp := compMap[cid]
			if comp == nil || comp.Broke {
				continue
			}
			comps = append(comps, Competitor{
				CompanyID:      cid,
				LaneID:         lane.ID,
				PricePerTon:    lane.PricePerTon,
				TransitDays:    lane.TransitDays,
				CapacityPerDay: lane.CapacityTonsPerDay,
				AllianceBonus:  allianceBonusFor(allianceEnabled[cid], lane.Interline),
			})
		}
		for _, res := range AllocateOD(demand, comps, od, ref) {
			lane := odCompanies[key][res.CompanyID]
			reward := int64(math.Round(res.Tons * float64(lane.PricePerTon)))
			laneID := res.LaneID
			o := model.Order{
				ID:          uuid.New(),
				WorldID:     worldID,
				CompanyID:   res.CompanyID,
				Kind:        string(model.KindContract),
				FromCityID:  ft[0],
				ToCityID:    ft[1],
				Tons:        res.Tons,
				PricePerTon: lane.PricePerTon,
				Reward:      reward,
				Mode:        lane.Mode,
				AcceptedDay: day,
				DeadlineDay: day + int(math.Ceil(lane.TransitDays)) + 2,
				Status:      string(model.OrderPending),
				LaneID:      &laneID,
			}
			if err := e.repos.AddOrder(&o); err == nil {
				newOrders = append(newOrders, o)
			}
			c := Competitor{
				CompanyID:      res.CompanyID,
				LaneID:         lane.ID,
				PricePerTon:    lane.PricePerTon,
				TransitDays:    lane.TransitDays,
				CapacityPerDay: lane.CapacityTonsPerDay,
				AllianceBonus:  allianceBonusFor(allianceEnabled[res.CompanyID], lane.Interline),
			}
			p, t, cc, i, comp := RateDetailed(c, od, ref)
			ratingRows = append(ratingRows, model.Rating{
				ID: uuid.New(), CompanyID: res.CompanyID, WorldID: worldID,
				FromCityID: ft[0], ToCityID: ft[1],
				PriceScore: p, TransitScore: t, CoverageScore: cc,
				InterlineScore: i, Composite: comp, ComputedDay: day,
			})
		}
	}

	// 世界随机散单（spot）：在已有运力的 OD 上生成少量额外小单，任何公司可抢。
	if len(lanes) > 0 {
		n := 1 + rng.Intn(2)
		for i := 0; i < n; i++ {
			lane := lanes[rng.Intn(len(lanes))]
			d := geo.DistanceKm(lane.FromCityID, lane.ToCityID)
			tons := model.SpotDropDaily * (0.6 + rng.Float64()*0.8)
			pricePerTon := int(math.Round(d*0.8)) + 50
			if pricePerTon < 50 {
				pricePerTon = 50
			}
			reward := int64(math.Round(tons * float64(pricePerTon)))
			o := model.Order{
				ID: uuid.New(), WorldID: worldID, CompanyID: uuid.Nil,
				Kind: string(model.KindSpot), FromCityID: lane.FromCityID,
				ToCityID: lane.ToCityID, Tons: tons, PricePerTon: pricePerTon,
				Reward: reward, Mode: lane.Mode, AcceptedDay: day,
				DeadlineDay: day + 3, Status: string(model.OrderPending),
			}
			if err := e.repos.AddOrder(&o); err == nil {
				newOrders = append(newOrders, o)
			}
		}
	}

	// ---- 步骤 3：到达结算（在途且当日达） ----
	transitOrders, err := e.repos.ListWorldOrders(worldID, []string{string(model.OrderInTransit)})
	if err == nil {
		for _, o := range transitOrders {
			if o.VehicleID == nil {
				continue
			}
			veh, verr := e.repos.GetVehicle(*o.VehicleID, o.CompanyID)
			if verr != nil || veh.BusyUntilDay == nil || *veh.BusyUntilDay > day {
				continue
			}
			comp := compMap[o.CompanyID]
			if comp == nil {
				continue
			}
			d := geo.DistanceKm(o.FromCityID, o.ToCityID)
			fuel := int64(math.Round(o.Tons * d * model.FuelCostPerTonKm))
			net := o.Reward - fuel
			comp.Cash += net
			comp.Reputation += 1
			veh.BusyUntilDay = nil
			veh.Status = string(model.VehicleIdle)
			o.Status = string(model.OrderDelivered)
			_ = e.repos.SaveVehicle(veh)
			_ = e.repos.SaveOrder(&o)
			addLedger(o.CompanyID, "deliver", net, o.FromCityID+"→"+o.ToCityID+" 送达")
		}
	}

	// ---- 步骤 4：超时迁移（仅 pending 且 deadline<day → expired；在途单由步骤 3 送达） ----
	pendingOrders, err := e.repos.ListWorldOrders(worldID, []string{string(model.OrderPending)})
	if err == nil {
		for _, o := range pendingOrders {
			if o.DeadlineDay >= day {
				continue
			}
			comp := compMap[o.CompanyID]
			if comp == nil {
				// 未归属的散单（如无人认领的 spot）：直接超时，不影响任何公司。
				o.Status = string(model.OrderExpired)
				_ = e.repos.SaveOrder(&o)
				continue
			}
			if o.Status == string(model.OrderInTransit) && o.VehicleID != nil {
				if veh, verr := e.repos.GetVehicle(*o.VehicleID, o.CompanyID); verr == nil {
					veh.BusyUntilDay = nil
					veh.Status = string(model.VehicleIdle)
					_ = e.repos.SaveVehicle(veh)
				}
			}
			comp.Reputation -= 3
			o.Status = string(model.OrderExpired)
			_ = e.repos.SaveOrder(&o)
			addLedger(o.CompanyID, "expire", 0, "货单超时")
		}
	}

	// ---- 步骤 5：释放到期忙车辆 ----
	_ = e.repos.ReleaseIdleVehicles(worldID, day)

	// ---- 步骤 6：租赁扣费 + 到期自动退租 ----
	leased, err := e.repos.ListLeasedVehicles(worldID)
	if err == nil {
		for _, veh := range leased {
			if veh.Status == string(model.VehicleRetired) {
				continue
			}
			comp := compMap[veh.CompanyID]
			if comp == nil {
				continue
			}
			if veh.LeaseUntilDay != nil && *veh.LeaseUntilDay <= day {
				_ = e.repos.DeleteVehicle(veh.ID)
				continue
			}
			comp.Cash -= veh.LeaseDaily
			addLedger(veh.CompanyID, "lease", -veh.LeaseDaily, "租赁扣费")
		}
	}

	// ---- 步骤 7：贷款计息（Debt>0 → Cash -= round(Debt*LOAN_DAILY_RATE)） ----
	for _, comp := range compMap {
		if comp.Debt > 0 {
			interest := int64(math.Round(float64(comp.Debt) * model.LoanDailyRate))
			comp.Cash -= interest
			addLedger(comp.ID, "interest", -interest, "贷款计息")
		}
	}

	// ---- 步骤 8：玩家市场过期单清理 ----
	_ = e.repos.PruneMarket(worldID, day)

	// ---- 步骤 9：重算净资产 + 写评分快照 ----
	_ = e.repos.DeleteRatings(worldID)
	_ = e.repos.BulkInsertRatings(ratingRows)
	for _, comp := range compMap {
		comp.NetWorth = comp.Cash - comp.Debt
		// ---- 步骤 10：破产检查（NetWorth < 地板 → 标记出局） ----
		if comp.NetWorth < model.BankruptcyFloor {
			comp.Broke = true
		}
		_ = e.repos.SaveCompany(comp)
	}

	// ---- 步骤 11：推进天数 + 构造增量广播 ----
	w.CurrentDay = day + 1
	if err := e.repos.SaveWorld(w); err != nil {
		return err
	}
	companySnaps, _ := world.BuildCompaniesSnap(e.repos, worldID)
	market, _ := e.repos.ListOpenListings(worldID)
	eventsSnap := make([]ws.EventSnap, 0, len(events))
	for _, ev := range events {
		eventsSnap = append(eventsSnap, ws.EventSnap{Day: ev.Day, Type: ev.Type, Amount: ev.Amount, Note: ev.Note})
	}
	delta := ws.NewDelta(w.CurrentDay, companySnaps, newOrders, market, eventsSnap)
	e.wm.BroadcastDelta(worldID, &delta)

	_ = e.repos.PruneFinishedOrders(worldID, w.CurrentDay-3)
	return nil
}
