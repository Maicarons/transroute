package sim

import (
	"math/rand"

	"github.com/transroute/server/internal/geo"
	"github.com/transroute/server/internal/model"
)

// GenerateCargoTons 计算单 OD 当日需求 D(OD)（§8.4）：
//
//	D = CargoBaseTons × 两端城市重要度系数 × 波动(0.6~1.4)
//
// rng 可注入以便单测确定性；生产环境使用随机源。
func GenerateCargoTons(rng *rand.Rand, fromTier, toTier int) float64 {
	mult := geo.TierMult(fromTier) * geo.TierMult(toTier)
	fluctuation := 0.6 + rng.Float64()*0.8 // 0.6 ~ 1.4
	return model.CargoBaseTons * mult * fluctuation
}

// distanceKm 两城市大圆距离（公里），未知城市返回 0。
func distanceKm(from, to string) float64 {
	return geo.DistanceKm(from, to)
}
