package market

import (
	"errors"
	"math"

	"github.com/google/uuid"

	"github.com/transroute/server/internal/model"
	"github.com/transroute/server/internal/repo"
)

// Service 玩家市场服务（挂单 / 撤单 / REST 即时撮合）。
type Service struct {
	repos *repo.Repos
}

// NewService 构造市场服务。
func NewService(r *repo.Repos) *Service { return &Service{repos: r} }

// MarketInput 挂单入参。
type MarketInput struct {
	Type  string
	From  string
	To    string
	Tons  float64
	Price int
	Mode  string
}

func round64(f float64) int64 { return int64(math.Round(f)) }

// ListListing 发布挂单（open）。
func (s *Service) ListListing(in MarketInput, listerCompanyID, worldID uuid.UUID) (*model.MarketListing, error) {
	if !model.ValidListingType(in.Type) {
		return nil, errors.New("挂单类型非法")
	}
	if in.Tons <= 0 || in.Price <= 0 {
		return nil, errors.New("吨数与单价必须大于 0")
	}
	day := 0
	if w, err := s.repos.GetWorld(worldID); err == nil {
		day = w.CurrentDay
	}
	l := &model.MarketListing{
		ID:              uuid.New(),
		WorldID:         worldID,
		ListerCompanyID: listerCompanyID,
		Type:            in.Type,
		FromCityID:      in.From,
		ToCityID:        in.To,
		Tons:            in.Tons,
		PricePerTon:     in.Price,
		Mode:            in.Mode,
		Status:          string(model.ListingOpen),
		CreatedDay:      day,
	}
	if err := s.repos.AddListing(l); err != nil {
		return nil, err
	}
	return l, nil
}

// CancelListing 撤单（仅挂单方本人）。
func (s *Service) CancelListing(listingID, cid uuid.UUID) error {
	l, err := s.repos.GetListing(listingID)
	if err != nil {
		return errors.New("挂单不存在")
	}
	if l.ListerCompanyID != cid {
		return errors.New("无权撤单")
	}
	if l.Status != string(model.ListingOpen) {
		return errors.New("挂单已不可撤")
	}
	l.Status = string(model.ListingCanceled)
	return s.repos.SaveListing(l)
}

// FillListing 即时成交：买方支付 lister，按 tons（缺省取挂单余量）结算。
func (s *Service) FillListing(listingID, buyerID uuid.UUID, tons float64) error {
	l, err := s.repos.GetListing(listingID)
	if err != nil {
		return errors.New("挂单不存在")
	}
	if l.Status != string(model.ListingOpen) {
		return errors.New("挂单不可成交")
	}
	if l.ListerCompanyID == buyerID {
		return errors.New("不能与自己成交")
	}
	if tons <= 0 {
		tons = l.Tons
	}
	if tons > l.Tons {
		tons = l.Tons
	}
	amount := round64(tons * float64(l.PricePerTon))

	buyer, err := s.repos.GetCompany(buyerID)
	if err != nil {
		return err
	}
	lister, err := s.repos.GetCompany(l.ListerCompanyID)
	if err != nil {
		return err
	}
	if buyer.Cash < amount {
		return errors.New("买方现金不足")
	}
	buyer.Cash -= amount
	lister.Cash += amount
	if err := s.repos.SaveCompany(buyer); err != nil {
		return err
	}
	if err := s.repos.SaveCompany(lister); err != nil {
		return err
	}

	day := 0
	if w, err := s.repos.GetWorld(l.WorldID); err == nil {
		day = w.CurrentDay
	}
	s.ledger(buyerID, l.WorldID, day, "market_buy", -amount, "市场采购")
	s.ledger(lister.ID, l.WorldID, day, "market_sell", amount, "市场售出")

	l.Tons -= tons
	if l.Tons <= 1e-9 {
		l.Tons = 0
		fd := day
		l.Status = string(model.ListingFilled)
		l.FilledDay = &fd
		l.BuyerCompanyID = &buyerID
	}
	return s.repos.SaveListing(l)
}

func (s *Service) ledger(companyID, worldID uuid.UUID, day int, typ string, amount int64, note string) {
	_ = s.repos.AddLedger(&model.LedgerEvent{
		ID:        uuid.New(),
		CompanyID: companyID,
		WorldID:   worldID,
		Day:       day,
		Type:      typ,
		Amount:    amount,
		Note:      note,
	})
}
