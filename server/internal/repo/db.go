package repo

import (
	"os"
	"path/filepath"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"github.com/transroute/server/internal/config"
	"github.com/transroute/server/internal/model"
)

// Repos 聚合所有 GORM 仓储方法，统一持有 *gorm.DB。
type Repos struct {
	DB *gorm.DB
}

// OpenDB 打开（必要时创建父目录）SQLite 并完成 AutoMigrate（表名小写复数）。
func OpenDB() (*gorm.DB, error) {
	dbPath := config.Get().DBPath
	if dir := filepath.Dir(dbPath); dir != "" && dir != "." {
		if err := os.MkdirAll(dir, 0o755); err != nil {
			return nil, err
		}
	}
	dsn := dbPath +
		"?_pragma=busy_timeout(5000)&_pragma=journal_mode(WAL)&_pragma=foreign_keys(0)"
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Warn),
	})
	if err != nil {
		return nil, err
	}
	if err := db.AutoMigrate(
		&model.User{}, &model.World{}, &model.Company{}, &model.Node{},
		&model.Vehicle{}, &model.Lane{}, &model.CargoPool{}, &model.Order{},
		&model.Alliance{}, &model.AllianceMember{}, &model.MarketListing{},
		&model.Loan{}, &model.LedgerEvent{}, &model.Rating{},
	); err != nil {
		return nil, err
	}
	return db, nil
}

// New 构造 Repos。
func New(db *gorm.DB) *Repos { return &Repos{DB: db} }
