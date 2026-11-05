package handler

import (
	"github.com/gofiber/fiber/v2"

	"github.com/transroute/server/internal/auth"
	"github.com/transroute/server/internal/repo"
)

// AuthHandler 鉴权路由（注册 / 登录 / 当前用户）。
type AuthHandler struct {
	repos *repo.Repos
}

// NewAuthHandler 构造鉴权处理器。
func NewAuthHandler(r *repo.Repos) *AuthHandler { return &AuthHandler{repos: r} }

type authReq struct {
	Username string `json:"username"`
	Password string `json:"password"`
	Email    string `json:"email"`
}

// Register 注册新用户并签发 JWT。
func (h *AuthHandler) Register(c *fiber.Ctx) error {
	var b authReq
	if err := c.BodyParser(&b); err != nil {
		return Fail(c, 400, 400, "请求体格式错误")
	}
	if b.Username == "" || len(b.Password) < 4 {
		return Fail(c, 400, 400, "用户名/密码不合法（密码至少 4 位）")
	}
	if _, err := h.repos.GetUserByUsername(b.Username); err == nil {
		return Fail(c, 409, 409, "用户名已存在")
	}
	hash, err := auth.HashPassword(b.Password)
	if err != nil {
		return Fail(c, 500, 500, "密码加密失败")
	}
	u, err := h.repos.CreateUser(b.Username, hash, b.Email)
	if err != nil {
		return Fail(c, 500, 500, "创建用户失败")
	}
	token, err := auth.IssueToken(u.ID)
	if err != nil {
		return Fail(c, 500, 500, "签发 token 失败")
	}
	return OK(c, fiber.Map{"token": token, "user": u})
}

// Login 用户名密码登录，成功返回 JWT。
func (h *AuthHandler) Login(c *fiber.Ctx) error {
	var b authReq
	if err := c.BodyParser(&b); err != nil {
		return Fail(c, 400, 400, "请求体格式错误")
	}
	u, err := h.repos.GetUserByUsername(b.Username)
	if err != nil {
		return Fail(c, 401, 401, "用户名或密码错误")
	}
	if !auth.VerifyPassword(u.PasswordHash, b.Password) {
		return Fail(c, 401, 401, "用户名或密码错误")
	}
	token, err := auth.IssueToken(u.ID)
	if err != nil {
		return Fail(c, 500, 500, "签发 token 失败")
	}
	return OK(c, fiber.Map{"token": token, "user": u})
}

// Me 返回当前登录用户。
func (h *AuthHandler) Me(c *fiber.Ctx) error {
	u, err := h.repos.GetUser(CurrentUserID(c))
	if err != nil {
		return Fail(c, 404, 404, "用户不存在")
	}
	return OK(c, u)
}
