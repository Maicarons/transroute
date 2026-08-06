package handler

import (
	"github.com/go-fiber/fiber/v2"
	"github.com/google/uuid"

	"github.com/transroute/server/internal/company"
	"github.com/transroute/server/internal/model"
	"github.com/transroute/server/internal/repo"
	"github.com/transroute/server/internal/world"
)

// CompanyHandler 公司运营路由（详情 / 建点 / 购车 / 线路 / 派单 / 金融）。
type CompanyHandler struct {
	svc   *company.Service
	repos *repo.Repos
	wm    *world.WorldManager
}

// NewCompanyHandler 构造公司处理器。
func NewCompanyHandler(svc *company.Service, r *repo.Repos, wm *world.WorldManager) *CompanyHandler {
	return &CompanyHandler{svc: svc, repos: r, wm: wm}
}

// Get 公司详情（含资产 / 线路 / 负债 / 账本）。
func (h *CompanyHandler) Get(c *fiber.Ctx) error {
	comp, err := h.ownedCompany(c)
	if err != nil {
		return err
	}
	nodes, _ := h.repos.ListNodes(comp.ID)
	vehicles, _ := h.repos.ListVehicles(comp.ID)
	lanes, _ := h.repos.ListCompanyLanes(comp.ID)
	loans, _ := h.repos.ListLoans(comp.ID)
	ledger, _ := h.repos.ListLedger(comp.ID, comp.WorldID, 30)
	return OK(c, fiber.Map{
		"company":  comp,
		"nodes":    nodes,
		"vehicles": vehicles,
		"lanes":    lanes,
		"loans":    loans,
		"ledger":   ledger,
	})
}

// CreateNode 在指定城市建设 / 升级物流点。
func (h *CompanyHandler) CreateNode(c *fiber.Ctx) error {
	comp, err := h.ownedCompany(c)
	if err != nil {
		return err
	}
	var b struct {
		CityID string `json:"cityId"`
		Tier   string `json:"tier"`
	}
	if err := c.BodyParser(&b); err != nil {
		return Fail(c, 400, 400, "请求体格式错误")
	}
	if err := h.svc.CreateNode(comp.ID, comp.WorldID, b.CityID, b.Tier); err != nil {
		return Fail(c, 400, 400, err.Error())
	}
	h.wm.Notify(comp.WorldID)
	return OK(c, fiber.Map{"ok": true})
}

// CreateVehicle 购车（自有）或租赁车辆。
func (h *CompanyHandler) CreateVehicle(c *fiber.Ctx) error {
	comp, err := h.ownedCompany(c)
	if err != nil {
		return err
	}
	var b struct {
		TypeID    string `json:"typeId"`
		Lease     bool   `json:"lease"`
		LeaseDays int    `json:"leaseDays"`
	}
	if err := c.BodyParser(&b); err != nil {
		return Fail(c, 400, 400, "请求体格式错误")
	}
	if err := h.svc.BuyOrLeaseVehicle(comp.ID, b.TypeID, b.Lease, b.LeaseDays); err != nil {
		return Fail(c, 400, 400, err.Error())
	}
	h.wm.Notify(comp.WorldID)
	return OK(c, fiber.Map{"ok": true})
}

// Return 退租 / 退役车辆（停止后续租赁扣费）。
func (h *CompanyHandler) Return(c *fiber.Ctx) error {
	comp, err := h.ownedCompany(c)
	if err != nil {
		return err
	}
	vid, err := uuid.Parse(c.Params("vid"))
	if err != nil {
		return Fail(c, 400, 400, "非法 vehicleId")
	}
	if err := h.svc.ReturnVehicle(comp.ID, vid); err != nil {
		return Fail(c, 400, 400, err.Error())
	}
	h.wm.Notify(comp.WorldID)
	return OK(c, fiber.Map{"ok": true})
}

// CreateLane 开通运营线路（需两端已建点；海运需两端沿海）。
func (h *CompanyHandler) CreateLane(c *fiber.Ctx) error {
	comp, err := h.ownedCompany(c)
	if err != nil {
		return err
	}
	var b company.LaneInput
	if err := c.BodyParser(&b); err != nil {
		return Fail(c, 400, 400, "请求体格式错误")
	}
	if err := h.svc.CreateLane(comp.ID, comp.WorldID, b); err != nil {
		return Fail(c, 400, 400, err.Error())
	}
	h.wm.Notify(comp.WorldID)
	return OK(c, fiber.Map{"ok": true})
}

// Dispatch 将货单派给空闲且匹配模式的车辆。
func (h *CompanyHandler) Dispatch(c *fiber.Ctx) error {
	comp, err := h.ownedCompany(c)
	if err != nil {
		return err
	}
	orderID, err := uuid.Parse(c.Params("orderId"))
	if err != nil {
		return Fail(c, 400, 400, "非法 orderId")
	}
	var b struct {
		VehicleID string `json:"vehicleId"`
	}
	if err := c.BodyParser(&b); err != nil {
		return Fail(c, 400, 400, "请求体格式错误")
	}
	vid, err := uuid.Parse(b.VehicleID)
	if err != nil {
		return Fail(c, 400, 400, "非法 vehicleId")
	}
	if err := h.svc.DispatchOrder(comp.ID, orderID, vid); err != nil {
		return Fail(c, 400, 400, err.Error())
	}
	h.wm.Notify(comp.WorldID)
	return OK(c, fiber.Map{"ok": true})
}

// Borrow 借款。
func (h *CompanyHandler) Borrow(c *fiber.Ctx) error {
	comp, err := h.ownedCompany(c)
	if err != nil {
		return err
	}
	var b struct {
		Amount int64 `json:"amount"`
	}
	if err := c.BodyParser(&b); err != nil {
		return Fail(c, 400, 400, "请求体格式错误")
	}
	if err := h.svc.Borrow(comp.ID, b.Amount); err != nil {
		return Fail(c, 400, 400, err.Error())
	}
	h.wm.Notify(comp.WorldID)
	return OK(c, fiber.Map{"ok": true})
}

// Repay 还款。
func (h *CompanyHandler) Repay(c *fiber.Ctx) error {
	comp, err := h.ownedCompany(c)
	if err != nil {
		return err
	}
	var b struct {
		Amount int64 `json:"amount"`
	}
	if err := c.BodyParser(&b); err != nil {
		return Fail(c, 400, 400, "请求体格式错误")
	}
	if err := h.svc.Repay(comp.ID, b.Amount); err != nil {
		return Fail(c, 400, 400, err.Error())
	}
	h.wm.Notify(comp.WorldID)
	return OK(c, fiber.Map{"ok": true})
}

// ownedCompany 取出 :id 公司并校验归属当前用户。
func (h *CompanyHandler) ownedCompany(c *fiber.Ctx) (*model.Company, error) {
	cid, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return nil, Fail(c, 400, 400, "非法 companyId")
	}
	comp, err := h.repos.GetCompany(cid)
	if err != nil {
		return nil, Fail(c, 404, 404, "公司不存在")
	}
	if comp.OwnerID != CurrentUserID(c) {
		return nil, Fail(c, 403, 403, "无权操作该公司")
	}
	return comp, nil
}
