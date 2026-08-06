package auth

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

// JWTProtected Fiber 中间件：校验 Authorization: Bearer <token>，
// 通过后将用户 ID 写入 c.Locals("uid")。
func JWTProtected() fiber.Handler {
	return func(c *fiber.Ctx) error {
		auth := c.Get("Authorization")
		token := strings.TrimSpace(strings.TrimPrefix(auth, "Bearer "))
		if token == "" {
			// 兼容 query 参数 ?token=
			token = c.Query("token")
		}
		if token == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"code": 401, "message": "missing token",
			})
		}
		uid, err := ParseToken(token)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"code": 401, "message": "invalid token",
			})
		}
		c.Locals("uid", uid)
		return c.Next()
	}
}

// CurrentUserID 取出JWTProtected 注入的用户 ID。
func CurrentUserID(c *fiber.Ctx) uuid.UUID {
	if v, ok := c.Locals("uid").(uuid.UUID); ok {
		return v
	}
	return uuid.Nil
}
