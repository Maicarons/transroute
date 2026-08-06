package handler

import (
	"errors"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"github.com/transroute/server/internal/model"
)

// apiResp 统一响应包：{ code, data, message }（见 §8.2）。
type apiResp struct {
	Code    int         `json:"code"`
	Data    interface{} `json:"data,omitempty"`
	Message string      `json:"message"`
}

// OK 成功响应（code=0）。
func OK(c *fiber.Ctx, data interface{}) error {
	return c.JSON(apiResp{Code: 0, Data: data, Message: "ok"})
}

// Fail 失败响应（非 0 code；httpStatus 作为 HTTP 状态码）。
func Fail(c *fiber.Ctx, httpStatus, code int, msg string) error {
	return c.Status(httpStatus).JSON(apiResp{Code: code, Data: nil, Message: msg})
}

// CurrentUserID 取出中间件注入的用户 ID。
func CurrentUserID(c *fiber.Ctx) uuid.UUID {
	if v, ok := c.Locals("uid").(uuid.UUID); ok {
		return v
	}
	return uuid.Nil
}

// ownedCompanyRepo 解析公司所需的仓储接口（便于复用 ResolveOwnedCompany）。
type ownedCompanyRepo interface {
	GetCompany(id uuid.UUID) (*model.Company, error)
}

// ResolveOwnedCompany 取公司并校验当前用户归属。
func ResolveOwnedCompany(repos ownedCompanyRepo, c *fiber.Ctx, cid uuid.UUID) (*model.Company, error) {
	uid := CurrentUserID(c)
	comp, err := repos.GetCompany(cid)
	if err != nil {
		return nil, errors.New("公司不存在")
	}
	if comp.OwnerID != uid {
		return nil, errors.New("无权操作该公司")
	}
	return comp, nil
}
