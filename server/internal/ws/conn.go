package ws

import (
	"encoding/json"
	"sync"
	"time"

	"github.com/fasthttp/websocket"
	"github.com/google/uuid"

	"github.com/transroute/server/internal/auth"
)

// Conn 封装单个客户端 WebSocket 连接：持有身份、读写协程与发送队列。
type Conn struct {
	conn *websocket.Conn
	send chan []byte

	mu        sync.Mutex
	authed    bool
	userID    uuid.UUID
	companyID uuid.UUID
	worldID   uuid.UUID
	lastPing  time.Time
	closed    bool
}

// NewConn 构造连接（尚未鉴权）。
func NewConn(c *websocket.Conn) *Conn {
	return &Conn{
		conn:     c,
		send:     make(chan []byte, 128),
		lastPing: time.Now(),
	}
}

// SetIdentity 鉴权成功后写入身份。
func (c *Conn) SetIdentity(userID, companyID, worldID uuid.UUID) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.authed = true
	c.userID = userID
	c.companyID = companyID
	c.worldID = worldID
}

// Identity 读取身份（userID, companyID, worldID）。
func (c *Conn) Identity() (uuid.UUID, uuid.UUID, uuid.UUID) {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.userID, c.companyID, c.worldID
}

// Touch 更新最近活动时间（收到任意消息时调用）。
func (c *Conn) Touch() {
	c.mu.Lock()
	c.lastPing = time.Now()
	c.mu.Unlock()
}

// Stale 判断距离上次活动是否超过 timeout。
func (c *Conn) Stale(timeout time.Duration) bool {
	c.mu.Lock()
	defer c.mu.Unlock()
	return time.Since(c.lastPing) > timeout
}

// Send 向发送队列投递一条消息（非阻塞，队列满则丢弃）。
func (c *Conn) Send(v interface{}) {
	b, err := json.Marshal(v)
	if err != nil {
		return
	}
	select {
	case c.send <- b:
	default:
		// 队列已满，丢弃（避免阻塞 tick 主循环）
	}
}

// Close 关闭连接并释放资源。
func (c *Conn) Close() {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.closed {
		return
	}
	c.closed = true
	_ = c.conn.Close()
}

// ReadPump 读取客户端消息；分发 auth/ping；检测关闭。
func (c *Conn) ReadPump(onMessage func(*Conn, ClientMessage), onClose func(*Conn)) {
	defer func() {
		onClose(c)
		c.Close()
	}()
	c.conn.SetReadLimit(1 << 16)
	for {
		_, data, err := c.conn.ReadMessage()
		if err != nil {
			return
		}
		c.Touch()
		var msg ClientMessage
		if err := json.Unmarshal(data, &msg); err != nil {
			c.Send(NewError(400, "bad json"))
			continue
		}
		switch msg.Type {
		case "auth":
			if msg.Token != "" {
				if uid, err := auth.ParseToken(msg.Token); err == nil {
					c.mu.Lock()
					c.userID = uid
					c.mu.Unlock()
				}
			}
		case "ping":
			c.Send(NewPong())
		default:
			onMessage(c, msg)
		}
	}
}

// WritePump 从发送队列取出并写出；定时发送 WS ping 保活。
func (c *Conn) WritePump() {
	ticker := time.NewTicker(25 * time.Second)
	defer func() {
		ticker.Stop()
		c.Close()
	}()
	for {
		select {
		case b, ok := <-c.send:
			if !ok {
				_ = c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := c.conn.WriteMessage(websocket.TextMessage, b); err != nil {
				return
			}
		case <-ticker.C:
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
