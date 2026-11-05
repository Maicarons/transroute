package handler

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"github.com/transroute/server/internal/model"
	"github.com/transroute/server/internal/repo"
	"github.com/transroute/server/internal/sim"
	"github.com/transroute/server/internal/world"
)

// WorldHandler 世界相关路由（列表 / 创建 / 加入 / 状态快照）。
type WorldHandler struct {
	repos *repo.Repos
	wm    *world.WorldManager
	sim   *sim.Engine
}

// NewWorldHandler 构造世界处理器。
func NewWorldHandler(r *repo.Repos, wm *world.WorldManager, sim *sim.Engine) *WorldHandler {
	return &WorldHandler{repos: r, wm: wm, sim: sim}
}

// List 返回全部世界。
func (h *WorldHandler) List(c *fiber.Ctx) error {
	ws, err := h.repos.ListWorlds()
	if err != nil {
		return Fail(c, 500, 500, "读取世界失败")
	}
	return OK(c, ws)
}

type createWorldReq struct {
	Name        string `json:"name"`
	TickSeconds int    `json:"tickSeconds"`
}

// Create 创建新世界（创建者尚未加入，需再调用 join）。
func (h *WorldHandler) Create(c *fiber.Ctx) error {
	var b createWorldReq
	if err := c.BodyParser(&b); err != nil {
		return Fail(c, 400, 400, "请求体格式错误")
	}
	if b.Name == "" {
		return Fail(c, 400, 400, "世界名称不能为空")
	}
	w, err := h.repos.CreateWorld(b.Name, b.TickSeconds)
	if err != nil {
		return Fail(c, 500, 500, "创建世界失败")
	}
	// 新建世界立即进入运行状态并启动 ticker，避免须重启进程才会模拟。
	w.Status = string(model.WorldRunning)
	if err := h.repos.SaveWorld(w); err != nil {
		return Fail(c, 500, 500, "保存世界状态失败")
	}
	h.wm.StartTicker(w, h.sim.Tick)
	return OK(c, w)
}

// Join 加入世界；若尚未创建公司则自动创建。
func (h *WorldHandler) Join(c *fiber.Ctx) error {
	uid := CurrentUserID(c)
	worldID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return Fail(c, 400, 400, "非法 worldId")
	}
	if _, err := h.repos.GetWorld(worldID); err != nil {
		return Fail(c, 404, 404, "世界不存在")
	}
	comp, err := h.repos.GetCompanyByUserWorld(uid, worldID)
	if err == nil {
		return OK(c, fiber.Map{"companyId": comp.ID.String(), "company": comp})
	}
	comp, err = h.repos.CreateCompany(uid, worldID, "物流公司-"+uid.String()[:8])
	if err != nil {
		return Fail(c, 500, 500, "创建公司失败")
	}
	return OK(c, fiber.Map{"companyId": comp.ID.String(), "company": comp})
}

// State 返回世界全量快照（公司/货量池/市场/线路）。
func (h *WorldHandler) State(c *fiber.Ctx) error {
	worldID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return Fail(c, 400, 400, "非法 worldId")
	}
	snap, err := h.wm.Snapshot(worldID)
	if err != nil {
		return Fail(c, 404, 404, err.Error())
	}
	return OK(c, snap)
}
