package world

import (
	"sync"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/transroute/server/internal/model"
	"github.com/transroute/server/internal/repo"
	"github.com/transroute/server/internal/ws"
)

// WorldManager 世界运行时：持有内存订阅（经 ws.Hub）、ticker 生命周期，
// 并负责快照/增量的广播编排。模拟逻辑在 sim 包，ticker 通过回调注入以避免循环依赖。
type WorldManager struct {
	mu      sync.RWMutex
	db      *gorm.DB
	repos   *repo.Repos
	hub     *ws.Hub
	tickers map[uuid.UUID]chan struct{}
}

// NewWorldManager 构造世界管理器。
func NewWorldManager(db *gorm.DB, repos *repo.Repos, hub *ws.Hub) *WorldManager {
	return &WorldManager{
		db:      db,
		repos:   repos,
		hub:     hub,
		tickers: make(map[uuid.UUID]chan struct{}),
	}
}

// StartTicker 为运行中的世界启动 tick 循环；tick 回调由上层（main）注入 sim.Engine.Tick。
func (m *WorldManager) StartTicker(w *model.World, tick func(uuid.UUID) error) {
	m.StopTicker(w.ID)
	stop := make(chan struct{})
	m.mu.Lock()
	m.tickers[w.ID] = stop
	m.mu.Unlock()

	d := time.Duration(w.TickSeconds) * time.Second
	if d <= 0 {
		d = time.Duration(model.DefaultTickSeconds) * time.Second
	}
	go func() {
		t := time.NewTicker(d)
		defer t.Stop()
		for {
			select {
			case <-t.C:
				_ = tick(w.ID)
			case <-stop:
				return
			}
		}
	}()
}

// StopTicker 停止世界 ticker。
func (m *WorldManager) StopTicker(worldID uuid.UUID) {
	m.mu.Lock()
	stop, ok := m.tickers[worldID]
	if ok {
		delete(m.tickers, worldID)
	}
	m.mu.Unlock()
	if ok {
		close(stop)
	}
}

// Subscribe 注册连接（订阅其所在世界）。
func (m *WorldManager) Subscribe(c *ws.Conn) { m.hub.Register(c) }

// Unsubscribe 注销连接。
func (m *WorldManager) Unsubscribe(c *ws.Conn) { m.hub.Unregister(c) }

// Snapshot 构造指定世界的全量快照。
func (m *WorldManager) Snapshot(worldID uuid.UUID) (*ws.SnapshotMsg, error) {
	w, err := m.repos.GetWorld(worldID)
	if err != nil {
		return nil, err
	}
	return BuildSnapshot(m.repos, w)
}

// BroadcastSnapshot 向世界内全部连接广播全量快照。
func (m *WorldManager) BroadcastSnapshot(worldID uuid.UUID) {
	snap, err := m.Snapshot(worldID)
	if err != nil {
		return
	}
	m.hub.BroadcastToWorld(worldID, snap)
}

// BroadcastDelta 向世界内全部连接广播 tick 增量。
func (m *WorldManager) BroadcastDelta(worldID uuid.UUID, d *ws.DeltaMsg) {
	m.hub.BroadcastToWorld(worldID, d)
}

// Notify 世界状态发生变更（建点 / 派单 / 市场成交等）后，向世界内连接广播全量快照。
func (m *WorldManager) Notify(worldID uuid.UUID) {
	m.BroadcastSnapshot(worldID)
}
