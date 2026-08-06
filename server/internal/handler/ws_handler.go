package handler

import (
	"github.com/fasthttp/websocket"
	"github.com/go-fiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/valyala/fasthttp"

	"github.com/transroute/server/internal/auth"
	"github.com/transroute/server/internal/repo"
	"github.com/transroute/server/internal/world"
	"github.com/transroute/server/internal/ws"
)

// upgrader 使用 fasthttp/websocket：Fiber 基于 fasthttp，无法用 gorilla 升级（adaptor 不实现 http.Hijacker）。
var upgrader = websocket.Upgrader{
	CheckOrigin: func(ctx *fasthttp.RequestCtx) bool { return true },
}

// WSHandler 处理 WebSocket 升级与连接生命周期（GET /ws?token=&worldId=）。
type WSHandler struct {
	repos *repo.Repos
	wm    *world.WorldManager
}

// NewWSHandler 构造 WS 处理器。
func NewWSHandler(repos *repo.Repos, wm *world.WorldManager) *WSHandler {
	return &WSHandler{repos: repos, wm: wm}
}

// ServeHTTP 作为 Fiber 路由处理器：鉴权 → 升级 → 建连 → 欢迎 + 快照 → 收发协程。
// 注意：Fiber 运行在 fasthttp 之上，必须使用 github.com/fasthttp/websocket 升级，
// 其 Upgrader.Upgrade 接收 *fasthttp.RequestCtx，并直接劫持底层连接。
func (h *WSHandler) ServeHTTP(c *fiber.Ctx) error {
	token := c.Query("token")
	worldIDStr := c.Query("worldId")
	if token == "" || worldIDStr == "" {
		return c.Status(fiber.StatusBadRequest).SendString("需要 token 与 worldId 查询参数")
	}
	uid, err := auth.ParseToken(token)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).SendString("无效的 token")
	}
	worldID, err := uuid.Parse(worldIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).SendString("非法的 worldId")
	}
	comp, err := h.repos.GetCompanyByUserWorld(uid, worldID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).SendString("尚未加入该世界")
	}
	wld, err := h.repos.GetWorld(worldID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).SendString("世界不存在")
	}

	// 升级 fasthttp 连接为 WebSocket（Upgrade 失败时已写入响应头，直接返回）。
	raw, err := upgrader.Upgrade(c.Context())
	if err != nil {
		return nil
	}

	conn := ws.NewConn(raw)
	conn.SetIdentity(uid, comp.ID, worldID)
	h.wm.Subscribe(conn)

	conn.Send(ws.NewWelcome(
		ws.YouInfo{
			CompanyID:  comp.ID.String(),
			Name:       comp.Name,
			Cash:       comp.Cash,
			Reputation: comp.Reputation,
			NetWorth:   comp.NetWorth,
		},
		ws.WorldInfo{
			ID:     worldID.String(),
			Name:   wld.Name,
			Day:    wld.CurrentDay,
			Status: wld.Status,
		},
	))
	if snap, err := h.wm.Snapshot(worldID); err == nil {
		conn.Send(snap)
	}

	// 业务消息（除 ping/auth 外）由 readPump 内部分发；关闭时注销订阅。
	go conn.WritePump()
	conn.ReadPump(
		func(_ *ws.Conn, _ ws.ClientMessage) {
			// 当前服务端驱动世界状态，客户端上行业务消息未来可在此扩展。
		},
		func(_ *ws.Conn) {
			h.wm.Unsubscribe(conn)
		},
	)
	return nil
}
