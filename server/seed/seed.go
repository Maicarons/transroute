// Package seed 启动期种子数据：为默认世界补充若干无主（NPC）竞品公司，
// 使共享货量分配引擎（§3.5）在玩家加入前就有对手。幂等：世界内已有 >=3 家公司则跳过。
package seed

import (
	"github.com/google/uuid"
	"github.com/transroute/server/internal/model"
	"github.com/transroute/server/internal/repo"
)

type npcPlan struct {
	name    string
	from    string
	to      string
	price   int
	cap     int
	transit float64
}

// SeedNPCs 为世界补充 NPC 竞品公司（拥有两端物流点与一条运营线路）。
func SeedNPCs(r *repo.Repos, worldID uuid.UUID) {
	comps, err := r.ListCompanies(worldID)
	if err != nil {
		return
	}
	if len(comps) >= 3 {
		return
	}

	plans := []npcPlan{
		{name: "北迅物流", from: "北京", to: "上海", price: 760, cap: 60, transit: 2.0},
		{name: "沪通快运", from: "上海", to: "广州", price: 700, cap: 80, transit: 2.5},
		{name: "鹏城联运", from: "深圳", to: "成都", price: 820, cap: 50, transit: 3.0},
	}

	for _, p := range plans {
		if len(comps) >= 3 {
			break
		}
		c, err := r.CreateCompany(uuid.Nil, worldID, p.name)
		if err != nil {
			continue
		}
		for _, city := range []string{p.from, p.to} {
			_ = r.AddNode(&model.Node{
				ID: uuid.New(), CompanyID: c.ID, WorldID: worldID,
				CityID: city, CityName: city, Tier: "city",
				BuiltDay: 0, Capacity: 4, HandlingDays: 0.3,
			})
		}
		_ = r.AddLane(&model.Lane{
			ID: uuid.New(), CompanyID: c.ID, WorldID: worldID,
			FromCityID: p.from, ToCityID: p.to, Mode: string(model.ModeRoad),
			CapacityTonsPerDay: p.cap, PricePerTon: p.price,
			TransitDays: p.transit, Interline: false, Active: true, CreatedDay: 0,
		})
		comps = append(comps, *c)
	}
}
