package config

import (
	"os"
	"strconv"

	"gopkg.in/yaml.v3"
)

// Config 服务端运行配置（config.yaml 提供默认值，环境变量可覆盖）。
type Config struct {
	JWTSecret   string `yaml:"jwt_secret"`
	DBPath      string `yaml:"db_path"`
	HTTPPort    int    `yaml:"http_port"`
	TickSeconds int    `yaml:"tick_seconds"`
	ClientDir   string `yaml:"client_dir"`
	ServeClient bool   `yaml:"serve_client"`
}

var cfg = Config{
	JWTSecret:   "transroute-dev-secret-please-change",
	DBPath:      "transroute.db",
	HTTPPort:    8080,
	TickSeconds: 10,
	ClientDir:   "./client/dist",
	ServeClient: true,
}

// Load 读取 config.yaml（文件不存在则保留默认值），再应用环境变量覆盖。
func Load(path string) error {
	if path != "" {
		if b, err := os.ReadFile(path); err == nil {
			_ = yaml.Unmarshal(b, &cfg)
		}
	}
	applyEnv()
	if cfg.JWTSecret == "" {
		cfg.JWTSecret = "transroute-dev-secret-please-change"
	}
	if cfg.DBPath == "" {
		cfg.DBPath = "transroute.db"
	}
	if cfg.HTTPPort == 0 {
		cfg.HTTPPort = 8080
	}
	if cfg.TickSeconds == 0 {
		cfg.TickSeconds = 10
	}
	return nil
}

func applyEnv() {
	if v := os.Getenv("TR_JWT_SECRET"); v != "" {
		cfg.JWTSecret = v
	}
	if v := os.Getenv("TR_DB_PATH"); v != "" {
		cfg.DBPath = v
	}
	if v := os.Getenv("TR_HTTP_PORT"); v != "" {
		if p, err := strconv.Atoi(v); err == nil {
			cfg.HTTPPort = p
		}
	}
	if v := os.Getenv("TR_TICK_SECONDS"); v != "" {
		if t, err := strconv.Atoi(v); err == nil {
			cfg.TickSeconds = t
		}
	}
	if v := os.Getenv("TR_CLIENT_DIR"); v != "" {
		cfg.ClientDir = v
	}
}

// Get 返回当前生效配置。
func Get() Config { return cfg }
