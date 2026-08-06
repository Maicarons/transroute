package main

import (
	"log"
	"os"
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"

	"github.com/transroute/server/internal/auth"
	"github.com/transroute/server/internal/company"
	"github.com/transroute/server/internal/config"
	"github.com/transroute/server/internal/handler"
	"github.com/transroute/server/internal/market"
	"github.com/transroute/server/internal/model"
	"github.com/transroute/server/internal/repo"
	"github.com/transroute/server/internal/seed"
	"github.com/transroute/server/internal/sim"
	"github.com/transroute/server/internal/world"
	"github.com/transroute/server/internal/ws"
)

func main() {
	if err := config.Load("config.yaml"); err != nil {
		log.Println("[warn] config load:", err)
	}

	db, err := repo.OpenDB()
	if err != nil {
		log.Fatalf("open db: %v", err)
	}
	repos := repo.New(db)

	hub := ws.NewHub()
	go hub.Run()

	wm := world.NewWorldManager(db, repos, hub)
	companySvc := company.NewService(repos)
	marketSvc := market.NewService(repos)
	simEngine := sim.NewEngine(repos, wm)

	// 启动运行中世界的 ticker（无则创建一个默认运行世界）。
	ensureDefaultWorld(repos, wm, simEngine)

	authH := handler.NewAuthHandler(repos)
	worldH := handler.NewWorldHandler(repos, wm, simEngine)
	companyH := handler.NewCompanyHandler(companySvc, repos, wm)
	allianceH := handler.NewAllianceHandler(repos, wm)
	marketH := handler.NewMarketHandler(repos, marketSvc, wm)
	lbH := handler.NewLeaderboardHandler(repos)
	wsH := handler.NewWSHandler(repos, wm)

	app := fiber.New(fiber.Config{DisableStartupMessage: true})
	app.Use(cors.New())

	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"ok": true})
	})

	// 公开鉴权端点
	app.Post("/api/auth/register", authH.Register)
	app.Post("/api/auth/login", authH.Login)

	// 其余 API 统一鉴权
	api := app.Group("/api", auth.JWTProtected())
	api.Get("/auth/me", authH.Me)

	api.Get("/worlds", worldH.List)
	api.Post("/worlds", worldH.Create)
	api.Post("/worlds/:id/join", worldH.Join)
	api.Get("/worlds/:id/state", worldH.State)

	api.Get("/companies/:id", companyH.Get)
	api.Post("/companies/:id/nodes", companyH.CreateNode)
	api.Post("/companies/:id/vehicles", companyH.CreateVehicle)
	api.Post("/companies/:id/vehicles/:vid/return", companyH.Return)
	api.Post("/companies/:id/lanes", companyH.CreateLane)
	api.Post("/companies/:id/orders/:orderId/dispatch", companyH.Dispatch)
	api.Post("/companies/:id/finance/borrow", companyH.Borrow)
	api.Post("/companies/:id/finance/repay", companyH.Repay)

	api.Post("/worlds/:id/alliances", allianceH.Create)
	api.Post("/alliances/:id/join", allianceH.Join)
	api.Post("/alliances/:id/leave", allianceH.Leave)

	api.Get("/worlds/:id/market", marketH.List)
	api.Post("/market", marketH.Create)
	api.Post("/market/:id/cancel", marketH.Cancel)
	api.Post("/market/:id/fill", marketH.Fill)

	api.Get("/worlds/:id/leaderboard", lbH.Leaderboard)
	api.Get("/companies/:id/opponents", lbH.Opponents)

	// WebSocket（原生 Fiber 处理器，使用 fasthttp/websocket 升级）
	app.Get("/ws", wsH.ServeHTTP)

	// 可选：托管已构建的前端（client/dist）
	if config.Get().ServeClient {
		if fi, err := os.Stat(config.Get().ClientDir); err == nil && fi.IsDir() {
			app.Static("/", config.Get().ClientDir)
		}
	}

	addr := ":" + strconv.Itoa(config.Get().HTTPPort)
	log.Printf("[transroute] listening on %s", addr)
	log.Fatal(app.Listen(addr))
}

// ensureDefaultWorld 若没有任何世界则创建默认运行世界，并为其启动 ticker；
// 否则为所有 running 世界恢复 ticker。
func ensureDefaultWorld(repos *repo.Repos, wm *world.WorldManager, sim *sim.Engine) {
	worlds, err := repos.ListWorlds()
	if err != nil {
		log.Println("[warn] list worlds:", err)
		return
	}
	if len(worlds) == 0 {
		w, err := repos.CreateWorld("默认世界", config.Get().TickSeconds)
		if err != nil {
			log.Println("[warn] create default world:", err)
			return
		}
		w.Status = string(model.WorldRunning)
		if err := repos.SaveWorld(w); err != nil {
			log.Println("[warn] start default world:", err)
			return
		}
		seed.SeedNPCs(repos, w.ID)
		wm.StartTicker(w, sim.Tick)
		return
	}
	for i := range worlds {
		if worlds[i].Status == string(model.WorldRunning) {
			wm.StartTicker(&worlds[i], sim.Tick)
		}
	}
}
