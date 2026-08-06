package repo

import (
	"time"

	"github.com/google/uuid"

	"github.com/transroute/server/internal/model"
)

// CreateUser 注册新用户（passwordHash 已在外层用 auth.HashPassword 生成）。
func (r *Repos) CreateUser(username, passwordHash, email string) (*model.User, error) {
	u := &model.User{
		ID:           uuid.New(),
		Username:     username,
		PasswordHash: passwordHash,
		Email:        email,
		CreatedAt:    time.Now(),
	}
	if err := r.DB.Create(u).Error; err != nil {
		return nil, err
	}
	return u, nil
}

// GetUserByUsername 按用户名查询（用于登录）。
func (r *Repos) GetUserByUsername(username string) (*model.User, error) {
	var u model.User
	if err := r.DB.Where("username = ?", username).First(&u).Error; err != nil {
		return nil, err
	}
	return &u, nil
}

// GetUser 按 ID 查询。
func (r *Repos) GetUser(id uuid.UUID) (*model.User, error) {
	var u model.User
	if err := r.DB.Where("id = ?", id).First(&u).Error; err != nil {
		return nil, err
	}
	return &u, nil
}
