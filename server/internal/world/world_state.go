package world

import (
	"sort"

	"github.com/google/uuid"

	"github.com/transroute/server/internal/model"
	"github.com/transroute/server/internal/repo"
	"github.com/transroute/server/internal/ws"
)

// computeRanks 按净资产降序计算公司排名（1 起）。
func computeRanks(companies []model.Company) map[uuid.UUID]int {
	sorted := append([]model.Company(nil), companies...)
	sort.SliceStable(sorted, func(i, j int) bool {
		return sorted[i].NetWorth > sorted[j].NetWorth
	})
	ranks := make(map[uuid.UUID]int, len(sorted))
	for i, c := range sorted {
		ranks[c.ID] = i + 1
	}
	return ranks
}

func toCompanySnap(c model.Company, rank int) ws.CompanySnap {
	return ws.CompanySnap{
		ID:         c.ID.String(),
		Name:       c.Name,
		Cash:       c.Cash,
		Reputation: c.Reputation,
		NetWorth:   c.NetWorth,
		Rank:       rank,
		Broke:      c.Broke,
	}
}

// BuildCompaniesSnap 构造世界内公司公开快照（含排名）。sim 与主快照共用。
func BuildCompaniesSnap(r *repo.Repos, worldID uuid.UUID) ([]ws.CompanySnap, error) {
	companies, err := r.ListCompanies(worldID)
	if err != nil {
		return nil, err
	}
	ranks := computeRanks(companies)
	snaps := make([]ws.CompanySnap, 0, len(companies))
	for _, c := range companies {
		snaps = append(snaps, toCompanySnap(c, ranks[c.ID]))
	}
	return snaps, nil
}

// BuildSnapshot 构造世界全量快照（加入 / 重连时下发）。
// 在 §8.1 基础上附加 lanes（世界内全部运营线路），便于客户端绘制对手运力。
func BuildSnapshot(r *repo.Repos, w *model.World) (*ws.SnapshotMsg, error) {
	companies, err := BuildCompaniesSnap(r, w.ID)
	if err != nil {
		return nil, err
	}
	pools, err := r.ListCargoPools(w.ID)
	if err != nil {
		return nil, err
	}
	poolSnaps := make([]ws.CargoPoolSnap, 0, len(pools))
	for _, p := range pools {
		if p.ExpiresDay < w.CurrentDay {
			continue
		}
		poolSnaps = append(poolSnaps, ws.CargoPoolSnap{
			From:       p.FromCityID,
			To:         p.ToCityID,
			TotalTons:  p.TotalTons,
			ExpiresDay: p.ExpiresDay,
		})
	}
	lanes, err := r.ListWorldLanes(w.ID)
	if err != nil {
		return nil, err
	}
	market, err := r.ListOpenListings(w.ID)
	if err != nil {
		return nil, err
	}
	return &ws.SnapshotMsg{
		BaseMsg:    ws.BaseMsg{Type: "world_snapshot"},
		Day:        w.CurrentDay,
		Companies:  companies,
		CargoPools: poolSnaps,
		Lanes:      lanes,
		Market:     market,
	}, nil
}
