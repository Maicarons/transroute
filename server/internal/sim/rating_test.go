package sim

import (
	"math"
	"testing"

	"github.com/google/uuid"
	"github.com/transroute/server/internal/model"
)

func TestRateDetailedClampAndComposite(t *testing.T) {
	// 极大参考值应使 price/transit 评分被钳制在 [0.2, 2.0]。
	c := Competitor{
		CompanyID:      uuid.New(),
		PricePerTon:    1,
		TransitDays:    1,
		CapacityPerDay: 1000,
		AllianceBonus:  1.0,
	}
	od := OD{From: "北京", To: "上海", Demand: 100}
	ref := Ref{PriceRef: 1000, TransitRef: 1000}

	p, tr, cov, il, comp := RateDetailed(c, od, ref)
	if p != 2.0 {
		t.Fatalf("price score should clamp to 2.0, got %v", p)
	}
	if tr != 2.0 {
		t.Fatalf("transit score should clamp to 2.0, got %v", tr)
	}
	if il != 1.0 {
		t.Fatalf("interline score should be alliance bonus 1.0, got %v", il)
	}
	// coverage = min(1, cap/demand) = min(1, 1000/100) = 1
	if math.Abs(cov-1.0) > 1e-9 {
		t.Fatalf("coverage should be 1.0, got %v", cov)
	}
	// 四维权重和必须为 1（§3.5）。
	sum := model.RatingWeights.Price + model.RatingWeights.Transit +
		model.RatingWeights.Coverage + model.RatingWeights.Interline
	if math.Abs(sum-1.0) > 1e-9 {
		t.Fatalf("rating weights must sum to 1, got %v", sum)
	}
	// 综合评分 = 加权求和。
	want := model.RatingWeights.Price*p + model.RatingWeights.Transit*tr +
		model.RatingWeights.Coverage*cov + model.RatingWeights.Interline*il
	if math.Abs(want-comp) > 1e-9 {
		t.Fatalf("composite mismatch: got %v want %v", comp, want)
	}
}

func TestAllianceBonusReflected(t *testing.T) {
	c := Competitor{PricePerTon: 100, TransitDays: 5, CapacityPerDay: 10, AllianceBonus: model.AllianceBonus}
	od := OD{Demand: 10}
	ref := Ref{PriceRef: 100, TransitRef: 50}
	_, _, _, il, _ := RateDetailed(c, od, ref)
	if il != model.AllianceBonus {
		t.Fatalf("interline score should equal alliance bonus %v, got %v", model.AllianceBonus, il)
	}
}
