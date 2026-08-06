package company

import (
	"math"
	"testing"

	"github.com/transroute/server/internal/model"
)

func TestComputeNetWorth(t *testing.T) {
	if got := ComputeNetWorth(1_000_000, 400_000); got != 600_000 {
		t.Fatalf("net worth = cash - debt, got %d", got)
	}
	if got := ComputeNetWorth(100_000, 500_000); got != -400_000 {
		t.Fatalf("net worth can be negative, got %d", got)
	}
}

func TestApplyInterest(t *testing.T) {
	// 1,000,000 × 0.002 = 2000（四舍五入到元）。
	if got := ApplyInterest(1_000_000); got != 2000 {
		t.Fatalf("interest = debt * LoanDailyRate, got %d", got)
	}
	// 小额取整：12345 × 0.002 = 24.69 → 25。
	if got := ApplyInterest(12_345); got != 25 {
		t.Fatalf("interest should round to nearest yuan, got %d", got)
	}
}

func TestBankruptcyFloorConstant(t *testing.T) {
	if model.BankruptcyFloor != int64(-1_000_000) {
		t.Fatalf("bankruptcy floor should be -1,000,000, got %d", model.BankruptcyFloor)
	}
}

func TestRound64(t *testing.T) {
	if got := round64(24.69); got != 25 {
		t.Fatalf("round64 should round half up, got %d", got)
	}
	if got := round64(math.Round(24.4)); got != 24 {
		t.Fatalf("round64 basic, got %d", got)
	}
}
