package model

// 模拟与经济常量（可被 server/config.yaml 与环境变量覆盖）。
const (
	// DefaultTickSeconds 世界默认时间流速：10 秒 = 1 游戏日。
	DefaultTickSeconds = 10
	// CargoBaseTons 单 OD 基准日需求（吨）。
	CargoBaseTons = 40.0
	// WindowDays 货量前瞻窗口（天），过期蒸发不结转。
	WindowDays = 7
	// LoanDailyRate 借款日息（0.2%/日 ≈ 月 6%）。
	LoanDailyRate = 0.002
	// LeaseDailyRate 租赁日租占车价比例（2%）。
	LeaseDailyRate = 0.02
	// BankruptcyFloor 净资产地板，低于即破产出局（元）。
	BankruptcyFloor = int64(-1_000_000)
	// InitCash 公司初始现金（元）。
	InitCash = int64(1_000_000)
	// InitReputation 公司初始声誉。
	InitReputation = 50

	// WSHeartbeatSeconds 服务端心跳超时（秒）：超时无 ping 断连。
	WSHeartbeatSeconds = 30
	// FuelCostPerTonKm 燃油成本（元/吨·公里），用于到达结算扣减。
	FuelCostPerTonKm = 0.6
	// SpotDropDaily 每日世界随机散单（spot）基础吨数。
	SpotDropDaily = 8.0
)

// RatingWeights AirlineSim 式共享需求市场的四维评分权重（权重和=1）。
type RatingWeightsT struct {
	Price     float64
	Transit   float64
	Coverage  float64
	Interline float64
}

var RatingWeights = RatingWeightsT{
	Price:     0.35,
	Transit:   0.30,
	Coverage:  0.20,
	Interline: 0.15,
}

// CityTierMult 城市重要度系数：一线 1.0 / 省会 0.8 / 其他 0.6。
var CityTierMult = map[int]float64{
	1: 1.0,
	2: 0.8,
	3: 0.6,
}

// AllianceBonus 联盟联运加成系数（同联盟且 lane.Interline=true 时生效）。
const AllianceBonus = 1.25
