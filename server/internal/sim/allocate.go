package sim

import "github.com/google/uuid"

// AllocResult 单公司单 OD 的分配结果（货量）。
type AllocResult struct {
	CompanyID uuid.UUID
	LaneID    uuid.UUID
	Tons      float64
}

// AllocateOD 按评分比例切分需求 D(OD)：cargo_i = D × r_i / Σr（§3.5）。
// 仅对价格/时效合法的竞争者参与；Σr≤0 时返回空（无分配）。
func AllocateOD(demand float64, comps []Competitor, od OD, ref Ref) []AllocResult {
	type rated struct {
		c Competitor
		r float64
	}
	rateds := make([]rated, 0, len(comps))
	sum := 0.0
	for _, c := range comps {
		if c.PricePerTon <= 0 || c.TransitDays <= 0 || c.CapacityPerDay <= 0 {
			continue
		}
		r := Rate(c, od, ref)
		rateds = append(rateds, rated{c, r})
		sum += r
	}
	results := make([]AllocResult, 0, len(rateds))
	if sum <= 0 || demand <= 0 {
		return results
	}
	for _, rt := range rateds {
		tons := demand * rt.r / sum
		results = append(results, AllocResult{
			CompanyID: rt.c.CompanyID,
			LaneID:    rt.c.LaneID,
			Tons:      tons,
		})
	}
	return results
}
