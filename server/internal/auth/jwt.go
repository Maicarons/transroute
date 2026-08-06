package auth

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"

	"github.com/transroute/server/internal/config"
)

// tokenTTL JWT 有效期（30 天）。
const tokenTTL = 30 * 24 * time.Hour

// IssueToken 为用户签发 JWT（载荷含 uid）。
func IssueToken(userID uuid.UUID) (string, error) {
	claims := jwt.MapClaims{
		"uid": userID.String(),
		"exp": time.Now().Add(tokenTTL).Unix(),
		"iat": time.Now().Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(config.Get().JWTSecret))
}

// ParseToken 校验并解析 JWT，返回用户 ID。
func ParseToken(tokenStr string) (uuid.UUID, error) {
	if tokenStr == "" {
		return uuid.Nil, errors.New("empty token")
	}
	token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return []byte(config.Get().JWTSecret), nil
	})
	if err != nil {
		return uuid.Nil, err
	}
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok || !token.Valid {
		return uuid.Nil, errors.New("invalid token")
	}
	uidStr, _ := claims["uid"].(string)
	uid, err := uuid.Parse(uidStr)
	if err != nil {
		return uuid.Nil, errors.New("invalid uid claim")
	}
	return uid, nil
}
