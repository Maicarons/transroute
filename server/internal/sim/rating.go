package sim

import (
	"math"

	"github.com/google/uuid"

	"github.com/transroute/server/internal/model"
)

// Ref OD 参考基准：用于跨公司归一化价格与时效评分。
type Ref struct {
	PriceRef   float64 // 基准 ¥/吨（≈ 距离 × 基准单价）
	TransitRef float64 // 基准时效（天）≈ 距离/基准速度 + 处理
}

// OD 一个起讫对及其当日需求 D(OD)。
type OD struct {
	From   string
	To     string
	Demand float64
}

// Competitor 参与某 OD 分配的公司运力描述。
type Competitor struct {
	CompanyID      uuid.UUID
	LaneID         uuid.UUID
	PricePerTon    int
	TransitDays    float64
	CapacityPerDay int
	AllianceBonus  float64 // 联运加成（1.0 或 model.AllianceBonus）
}

func clamp(v, lo, hi float64) float64 {
	if v < lo {
		return lo
	}
	if v > hi {
		return hi
	}
	return v
}

// RateDetailed 返回四维分量与综合评分（§3.5）。
//
//	priceScore    = clamp(PriceRef / PricePerTon, 0.2, 2.0)  越便宜越高
//	transitScore  = clamp(TransitRef / TransitDays, 0.2, 2.0) 越快越高
//	coverageScore = min(1.0, CapacityPerDay / Demand)         运力覆盖需求
//	interlineScore= allianceBonus                             联运加成（基础 1.0）
func RateDetailed(c Competitor, od OD, ref Ref) (price, transit, coverage, interline, composite float64) {
	price = clamp(ref.PriceRef/float64(c.PricePerTon), 0.2, 2.0)
	transit = clamp(ref.TransitRef/c.TransitDays, 0.2, 2.0)
	coverage = math.Min(1.0, float64(c.CapacityPerDay)/od.Demand)
	interline = c.AllianceBonus
	composite = model.RatingWeights.Price*price +
		model.RatingWeights.Transit*transit +
		model.RatingWeights.Coverage*coverage +
		model.RatingWeights.Interline*interline
	return
}

// Rate 计算单公司单 OD 的综合评分（§3.5 四维加权，权重和=1）。
func Rate(c Competitor, od OD, ref Ref) float64 {
	_, _, _, _, comp := RateDetailed(c, od, ref)
	return comp
}

// odRef 按 OD 距离估算参考基准（§3.5）。
// 基准单价 0.8 ¥/吨·km；基准速度 60 km/h + 1 天处理。为常数决策，便于手感微调。
func odRef(from, to string) Ref {
	d := distanceKm(from, to)
	return Ref{
		PriceRef:   d * 0.8,
		TransitRef: d/60.0 + 1.0,
	}
}

// allianceBonusFor 返回某公司在给定 OD 上的联运加成：
// 同联盟且联盟开启联运且 lane.Interline=true 则取 model.AllianceBonus，否则 1.0。
// enabled 表示公司所属联盟是否开启联运（nil/未开启则 false）。
func allianceBonusFor(enabled bool, laneInterline bool) float64 {
	if enabled && laneInterline {
		return model.AllianceBonus
	}
	return 1.0
}
