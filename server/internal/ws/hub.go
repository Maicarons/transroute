package ws

import (
	"sync"
	"time"

	"github.com/google/uuid"

	"github.com/transroute/server/internal/model"
)

// Hub 连接注册中心：维护全部活跃连接，按世界广播增量。
// 订阅关系通过 Conn.WorldID 体现（广播时按 worldID 过滤）。
type Hub struct {
	mu      sync.RWMutex
	clients map[*Conn]struct{}

	register   chan *Conn
	unregister chan *Conn
	closeAll   chan struct{}
	once       sync.Once
}

// NewHub 构造 Hub。
func NewHub() *Hub {
	return &Hub{
		clients:    make(map[*Conn]struct{}),
		register:   make(chan *Conn, 64),
		unregister: make(chan *Conn, 64),
		closeAll:   make(chan struct{}),
	}
}

// Run 启动事件循环与心跳监控（应在独立 goroutine 中调用）。
func (h *Hub) Run() {
	go h.monitor()
	for {
		select {
		case c := <-h.register:
			h.mu.Lock()
			h.clients[c] = struct{}{}
			h.mu.Unlock()
		case c := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[c]; ok {
				delete(h.clients, c)
				c.Close()
			}
			h.mu.Unlock()
		case <-h.closeAll:
			h.mu.Lock()
			for c := range h.clients {
				delete(h.clients, c)
				c.Close()
			}
			h.mu.Unlock()
			return
		}
	}
}

// monitor 每 10s 检查一次，关闭超过 WSHeartbeatSeconds 无活动的连接。
func (h *Hub) monitor() {
	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()
	for range ticker.C {
		timeout := time.Duration(model.WSHeartbeatSeconds) * time.Second
		h.mu.RLock()
		stale := make([]*Conn, 0)
		for c := range h.clients {
			if c.Stale(timeout) {
				stale = append(stale, c)
			}
		}
		h.mu.RUnlock()
		for _, c := range stale {
			h.Unregister(c)
			c.Close()
		}
	}
}

// Register 注册连接。
func (h *Hub) Register(c *Conn) { h.register <- c }

// Unregister 注销连接。
func (h *Hub) Unregister(c *Conn) { h.unregister <- c }

// Broadcast 向全部连接广播。
func (h *Hub) Broadcast(msg interface{}) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	for c := range h.clients {
		c.Send(msg)
	}
}

// BroadcastToWorld 向订阅了某一世界的连接广播。
func (h *Hub) BroadcastToWorld(worldID uuid.UUID, msg interface{}) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	for c := range h.clients {
		_, _, wid := c.Identity()
		if wid == worldID {
			c.Send(msg)
		}
	}
}

// CloseAll 关闭全部连接并停止 Hub。
func (h *Hub) CloseAll() {
	h.once.Do(func() { close(h.closeAll) })
}
