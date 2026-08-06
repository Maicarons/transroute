package auth

import "golang.org/x/crypto/bcrypt"

// HashPassword 使用 bcrypt 对明文密码加盐哈希。
func HashPassword(pw string) (string, error) {
	b, err := bcrypt.GenerateFromPassword([]byte(pw), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(b), nil
}

// VerifyPassword 校验明文密码与哈希是否匹配。
func VerifyPassword(hash, pw string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(pw)) == nil
}
