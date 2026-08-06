package handler

import (
	"github.com/go-fiber/fiber/v2"
	"github.com/google/uuid"

	"github.com/transroute/server/internal/market"
	"github.com/transroute/server/internal/repo"
	"github.com/transroute/server/internal/world"
)

// MarketHandler 玩家市场路由（挂单列表 / 发布 / 撤单 / 即时成交）。
type MarketHandler struct {
	repos *repo.Repos
	svc   *market.Service
	wm    *world.WorldManager
}

// NewMarketHandler 构造市场处理器。
func NewMarketHandler(r *repo.Repos, svc *market.Service, wm *world.WorldManager) *MarketHandler {
	return &MarketHandler{repos: r, svc: svc, wm: wm}
}

// List 返回某世界的开放挂单。
func (h *MarketHandler) List(c *fiber.Ctx) error {
	worldID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return Fail(c, 400, 400, "非法 worldId")
	}
	list, err := h.repos.ListOpenListings(worldID)
	if err != nil {
		return Fail(c, 500, 500, "读取市场失败")
	}
	return OK(c, list)
}

// Create 发布挂单（open）。
func (h *MarketHandler) Create(c *fiber.Ctx) error {
	var b struct {
		CompanyID string  `json:"companyId"`
		Type      string  `json:"type"`
		From      string  `json:"from"`
		To        string  `json:"to"`
		Tons      float64 `json:"tons"`
		Price     int     `json:"price"`
		Mode      string  `json:"mode"`
	}
	if err := c.BodyParser(&b); err != nil {
		return Fail(c, 400, 400, "请求体格式错误")
	}
	cid, err := uuid.Parse(b.CompanyID)
	if err != nil {
		return Fail(c, 400, 400, "非法 companyId")
	}
	comp, err := h.repos.GetCompany(cid)
	if err != nil {
		return Fail(c, 404, 404, "公司不存在")
	}
	if comp.OwnerID != CurrentUserID(c) {
		return Fail(c, 403, 403, "无权操作该公司")
	}
	l, err := h.svc.ListListing(market.MarketInput{
		Type:  b.Type,
		From:  b.From,
		To:    b.To,
		Tons:  b.Tons,
		Price: b.Price,
		Mode:  b.Mode,
	}, cid, comp.WorldID)
	if err != nil {
		return Fail(c, 400, 400, err.Error())
	}
	h.wm.Notify(comp.WorldID)
	return OK(c, l)
}

// Cancel 撤单（仅挂单方本人，校验公司归属）。
func (h *MarketHandler) Cancel(c *fiber.Ctx) error {
	listingID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return Fail(c, 400, 400, "非法 listingId")
	}
	var b struct {
		CompanyID string `json:"companyId"`
	}
	_ = c.BodyParser(&b)
	cid, err := uuid.Parse(b.CompanyID)
	if err != nil {
		return Fail(c, 400, 400, "非法 companyId")
	}
	comp, err := ResolveOwnedCompany(h.repos, c, cid)
	if err != nil {
		return Fail(c, 403, 403, err.Error())
	}
	if err := h.svc.CancelListing(listingID, cid); err != nil {
		return Fail(c, 400, 400, err.Error())
	}
	h.wm.Notify(comp.WorldID)
	return OK(c, fiber.Map{"ok": true})
}

// Fill 即时成交：买方支付 lister，按 tons 结算。
func (h *MarketHandler) Fill(c *fiber.Ctx) error {
	listingID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return Fail(c, 400, 400, "非法 listingId")
	}
	var b struct {
		CompanyID string  `json:"companyId"`
		Tons      float64 `json:"tons"`
	}
	_ = c.BodyParser(&b)
	buyerID, err := uuid.Parse(b.CompanyID)
	if err != nil {
		return Fail(c, 400, 400, "非法 companyId")
	}
	comp, err := h.repos.GetCompany(buyerID)
	if err != nil {
		return Fail(c, 404, 404, "公司不存在")
	}
	if comp.OwnerID != CurrentUserID(c) {
		return Fail(c, 403, 403, "无权操作该公司")
	}
	if err := h.svc.FillListing(listingID, buyerID, b.Tons); err != nil {
		return Fail(c, 400, 400, err.Error())
	}
	h.wm.Notify(comp.WorldID)
	return OK(c, fiber.Map{"ok": true})
}
