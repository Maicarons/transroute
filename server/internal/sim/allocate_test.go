package sim

import (
	"math"
	"testing"

	"github.com/google/uuid"
)

func TestAllocateODSumsToDemand(t *testing.T) {
	od := OD{From: "北京", To: "上海", Demand: 100}
	ref := Ref{PriceRef: 100, TransitRef: 50}

	a := uuid.New()
	b := uuid.New()
	comps := []Competitor{
		{CompanyID: a, PricePerTon: 100, TransitDays: 5, CapacityPerDay: 50, AllianceBonus: 1.0},
		{CompanyID: b, PricePerTon: 50, TransitDays: 5, CapacityPerDay: 50, AllianceBonus: 1.0},
	}
	res := AllocateOD(od.Demand, comps, od, ref)
	if len(res) != 2 {
		t.Fatalf("expected 2 allocations, got %d", len(res))
	}
	var sum float64
	for _, r := range res {
		sum += r.Tons
	}
	if math.Abs(sum-od.Demand) > 1e-6 {
		t.Fatalf("allocation must sum to demand, got %v", sum)
	}
	// 报价更低的 b 应获得更多货量。
	var ta, tb float64
	for _, r := range res {
		if r.CompanyID == a {
			ta = r.Tons
		} else {
			tb = r.Tons
		}
	}
	if tb <= ta {
		t.Fatalf("cheaper competitor should get more tons: a=%v b=%v", ta, tb)
	}
}

func TestAllocateODZeroDemand(t *testing.T) {
	od := OD{Demand: 0}
	res := AllocateOD(0, []Competitor{
		{CompanyID: uuid.New(), PricePerTon: 100, TransitDays: 5, CapacityPerDay: 10, AllianceBonus: 1.0},
	}, od, Ref{})
	if len(res) != 0 {
		t.Fatalf("zero demand should yield no allocation, got %d", len(res))
	}
}

func TestAllocateODFiltersInvalidCompetitor(t *testing.T) {
	od := OD{Demand: 50}
	// 价格/时效/运力任一非正则不参与分配。
	comps := []Competitor{
		{CompanyID: uuid.New(), PricePerTon: 0, TransitDays: 5, CapacityPerDay: 10, AllianceBonus: 1.0},
		{CompanyID: uuid.New(), PricePerTon: 100, TransitDays: 3, CapacityPerDay: 20, AllianceBonus: 1.0},
	}
	res := AllocateOD(od.Demand, comps, od, Ref{PriceRef: 100, TransitRef: 50})
	if len(res) != 1 {
		t.Fatalf("invalid competitor must be filtered out, got %d", len(res))
	}
}
