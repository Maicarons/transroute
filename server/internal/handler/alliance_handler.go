package handler

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"github.com/transroute/server/internal/model"
	"github.com/transroute/server/internal/repo"
	"github.com/transroute/server/internal/world"
)

// AllianceHandler 联盟 / 联运（创建 / 加入 / 退出）。
type AllianceHandler struct {
	repos *repo.Repos
	wm    *world.WorldManager
}

// NewAllianceHandler 构造。
func NewAllianceHandler(r *repo.Repos, wm *world.WorldManager) *AllianceHandler {
	return &AllianceHandler{repos: r, wm: wm}
}

type createAllianceReq struct {
	Name string `json:"name"`
}

// Create 在世界内创建联盟（创建者自动成为 leader）。
func (h *AllianceHandler) Create(c *fiber.Ctx) error {
	uid := CurrentUserID(c)
	wid, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return Fail(c, 400, 400, "世界 ID 非法")
	}
	comp, err := h.repos.GetCompanyByUserWorld(uid, wid)
	if err != nil {
		return Fail(c, 403, 403, "请先加入该世界")
	}
	var req createAllianceReq
	_ = c.BodyParser(&req)
	name := req.Name
	if name == "" {
		name = comp.Name + " 联盟"
	}
	w, _ := h.repos.GetWorld(wid)
	day := 0
	if w != nil {
		day = w.CurrentDay
	}
	a := &model.Alliance{
		ID:               uuid.New(),
		WorldID:          wid,
		Name:             name,
		InterlineEnabled: true,
		CreatedDay:       day,
	}
	if err := h.repos.AddAlliance(a); err != nil {
		return Fail(c, 500, 500, "创建联盟失败")
	}
	m := &model.AllianceMember{
		ID:         uuid.New(),
		AllianceID: a.ID,
		CompanyID:  comp.ID,
		JoinedDay:  day,
		Role:       string(model.RoleLeader),
	}
	_ = h.repos.AddAllianceMember(m)
	_ = h.repos.SetCompanyAlliance(comp.ID, &a.ID)
	h.wm.BroadcastSnapshot(wid)
	return OK(c, a)
}

type allianceMemberReq struct {
	CompanyID string `json:"companyId"`
}

// Join 加入联盟。
func (h *AllianceHandler) Join(c *fiber.Ctx) error {
	aid, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return Fail(c, 400, 400, "联盟 ID 非法")
	}
	var req allianceMemberReq
	_ = c.BodyParser(&req)
	cid, err := uuid.Parse(req.CompanyID)
	if err != nil {
		return Fail(c, 400, 400, "公司 ID 非法")
	}
	comp, err := ResolveOwnedCompany(h.repos, c, cid)
	if err != nil {
		return Fail(c, 403, 403, err.Error())
	}
	a, err := h.repos.GetAlliance(aid)
	if err != nil {
		return Fail(c, 404, 404, "联盟不存在")
	}
	if comp.WorldID != a.WorldID {
		return Fail(c, 400, 400, "公司不在此联盟所在世界")
	}
	if _, err := h.repos.GetAllianceMember(aid, cid); err == nil {
		return Fail(c, 409, 409, "已在联盟中")
	}
	w, _ := h.repos.GetWorld(a.WorldID)
	day := 0
	if w != nil {
		day = w.CurrentDay
	}
	m := &model.AllianceMember{
		ID:         uuid.New(),
		AllianceID: aid,
		CompanyID:  cid,
		JoinedDay:  day,
		Role:       string(model.RoleMember),
	}
	_ = h.repos.AddAllianceMember(m)
	_ = h.repos.SetCompanyAlliance(cid, &aid)
	h.wm.BroadcastSnapshot(a.WorldID)
	return OK(c, m)
}

// Leave 退出联盟。
func (h *AllianceHandler) Leave(c *fiber.Ctx) error {
	aid, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return Fail(c, 400, 400, "联盟 ID 非法")
	}
	var req allianceMemberReq
	_ = c.BodyParser(&req)
	cid, err := uuid.Parse(req.CompanyID)
	if err != nil {
		return Fail(c, 400, 400, "公司 ID 非法")
	}
	comp, err := ResolveOwnedCompany(h.repos, c, cid)
	if err != nil {
		return Fail(c, 403, 403, err.Error())
	}
	_ = h.repos.RemoveAllianceMember(aid, cid)
	_ = h.repos.SetCompanyAlliance(cid, nil)
	h.wm.BroadcastSnapshot(comp.WorldID)
	return OK(c, fiber.Map{"ok": true})
}
