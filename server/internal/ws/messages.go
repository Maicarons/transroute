package ws

import (
	"github.com/transroute/server/internal/model"
)

// BaseMsg 所有服务端消息共有的 type 字段。
type BaseMsg struct {
	Type string `json:"type"`
}

// ---- 客户端 → 服务端 ----

// ClientMessage 客户端上行消息（按 type 区分）。
type ClientMessage struct {
	Type    string `json:"type"`
	Token   string `json:"token,omitempty"`
	WorldID string `json:"worldId,omitempty"`
}

// ---- 服务端 → 客户端 ----

// WelcomeMsg 建连欢迎：附上你的公司与世界概况。
type WelcomeMsg struct {
	BaseMsg
	You   YouInfo   `json:"you"`
	World WorldInfo `json:"world"`
}

// YouInfo 当前连接对应的公司（你）。
type YouInfo struct {
	CompanyID  string `json:"companyId"`
	Name       string `json:"name"`
	Cash       int64  `json:"cash"`
	Reputation int    `json:"reputation"`
	NetWorth   int64  `json:"netWorth"`
}

// WorldInfo 世界概况。
type WorldInfo struct {
	ID     string `json:"id"`
	Name   string `json:"name"`
	Day    int    `json:"day"`
	Status string `json:"status"`
}

// CompanySnap 公司公开快照（含排名）。
type CompanySnap struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	Cash       int64  `json:"cash"`
	Reputation int    `json:"reputation"`
	NetWorth   int64  `json:"netWorth"`
	Rank       int    `json:"rank"`
	Broke      bool   `json:"broke"`
}

// CargoPoolSnap 货量池快照。
type CargoPoolSnap struct {
	From       string  `json:"from"`
	To         string  `json:"to"`
	TotalTons  float64 `json:"totalTons"`
	ExpiresDay int     `json:"expiresDay"`
}

// EventSnap 账本事件快照（增量）。
type EventSnap struct {
	Day    int    `json:"day"`
	Type   string `json:"type"`
	Amount int64  `json:"amount"`
	Note   string `json:"note"`
}

// SnapshotMsg 世界全量快照（加入 / 重连时下发）。
type SnapshotMsg struct {
	BaseMsg
	Day        int                   `json:"day"`
	Companies  []CompanySnap         `json:"companies"`
	CargoPools []CargoPoolSnap       `json:"cargoPools"`
	Market     []model.MarketListing `json:"market"`
	Lanes      []model.Lane          `json:"lanes"`
}

// DeltaMsg tick 增量（每 tick 广播）。
type DeltaMsg struct {
	BaseMsg
	Day       int                   `json:"day"`
	Companies []CompanySnap         `json:"companies"`
	NewOrders []model.Order         `json:"newOrders"`
	Lanes     []model.Lane          `json:"lanes,omitempty"`
	Market    []model.MarketListing `json:"market"`
	Events    []EventSnap           `json:"events"`
}

// PongMsg 心跳回应。
type PongMsg struct {
	BaseMsg
}

// ErrorMsg 错误。
type ErrorMsg struct {
	BaseMsg
	Code int    `json:"code"`
	Msg  string `json:"msg"`
}

// NewWelcome / NewSnapshot / NewDelta / NewPong / NewError 构造器。
func NewWelcome(you YouInfo, world WorldInfo) WelcomeMsg {
	return WelcomeMsg{BaseMsg: BaseMsg{Type: "welcome"}, You: you, World: world}
}
func NewSnapshot(day int, companies []CompanySnap, pools []CargoPoolSnap, market []model.MarketListing, lanes []model.Lane) SnapshotMsg {
	return SnapshotMsg{BaseMsg: BaseMsg{Type: "world_snapshot"}, Day: day, Companies: companies, CargoPools: pools, Market: market, Lanes: lanes}
}
func NewDelta(day int, companies []CompanySnap, orders []model.Order, market []model.MarketListing, events []EventSnap) DeltaMsg {
	return DeltaMsg{BaseMsg: BaseMsg{Type: "delta"}, Day: day, Companies: companies, NewOrders: orders, Market: market, Events: events}
}
func NewPong() PongMsg { return PongMsg{BaseMsg: BaseMsg{Type: "pong"}} }
func NewError(code int, msg string) ErrorMsg {
	return ErrorMsg{BaseMsg: BaseMsg{Type: "error"}, Code: code, Msg: msg}
}
