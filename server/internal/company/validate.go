package company

import (
	"errors"

	"github.com/transroute/server/internal/model"
)

// ValidateLaneInput 对开线路请求做字段级（非 DB）校验。
func ValidateLaneInput(in LaneInput) error {
	if in.From == "" || in.To == "" {
		return errors.New("起讫城市不能为空")
	}
	if in.From == in.To {
		return errors.New("起讫城市不能相同")
	}
	if !model.ValidMode(in.Mode) {
		return errors.New("运输方式非法")
	}
	if in.Capacity <= 0 {
		return errors.New("运力必须大于 0")
	}
	if in.Price <= 0 {
		return errors.New("报价必须大于 0")
	}
	if in.TransitDays <= 0 {
		return errors.New("时效必须大于 0")
	}
	return nil
}

// checkCoastal 海运要求两端皆为沿海城市。
func checkCoastal(mode string, fromCoastal, toCoastal bool) error {
	if model.TransportMode(mode) == model.ModeSea && (!fromCoastal || !toCoastal) {
		return errors.New("海运线路两端必须均为沿海城市")
	}
	return nil
}
