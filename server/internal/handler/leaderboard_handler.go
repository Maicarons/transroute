package handler

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"github.com/transroute/server/internal/repo"
	"github.com/transroute/server/internal/world"
)

// LeaderboardHandler 排行榜 / 对手监控。
type LeaderboardHandler struct {
	repos *repo.Repos
}

// NewLeaderboardHandler 构造。
func NewLeaderboardHandler(r *repo.Repos) *LeaderboardHandler {
	return &LeaderboardHandler{repos: r}
}

// Leaderboard 世界内公司排名（按净资产）。
func (h *LeaderboardHandler) Leaderboard(c *fiber.Ctx) error {
	wid, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return Fail(c, 400, 400, "世界 ID 非法")
	}
	snaps, err := world.BuildCompaniesSnap(h.repos, wid)
	if err != nil {
		return Fail(c, 404, 404, "世界不存在")
	}
	return OK(c, snaps)
}

// Opponents 返回除自己外的对手快照（用于对手监控面板）。
func (h *LeaderboardHandler) Opponents(c *fiber.Ctx) error {
	cid, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return Fail(c, 400, 400, "公司 ID 非法")
	}
	comp, err := h.repos.GetCompany(cid)
	if err != nil {
		return Fail(c, 404, 404, "公司不存在")
	}
	snaps, err := world.BuildCompaniesSnap(h.repos, comp.WorldID)
	if err != nil {
		return Fail(c, 500, 500, "查询失败")
	}
	out := make([]map[string]interface{}, 0, len(snaps))
	for _, s := range snaps {
		if s.ID == cid.String() {
			continue
		}
		out = append(out, map[string]interface{}{
			"id":         s.ID,
			"name":       s.Name,
			"cash":       s.Cash,
			"reputation": s.Reputation,
			"netWorth":   s.NetWorth,
			"rank":       s.Rank,
			"broke":      s.Broke,
		})
	}
	return OK(c, out)
}
