// 轻量工具函数（避免额外依赖）。

/** 合并 className，过滤假值。 */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

/** 金额格式化为人民币（元，int64）。 */
export function formatMoney(n: number): string {
  const sign = n < 0 ? '-' : ''
  const v = Math.abs(Math.round(n))
  return sign + '¥' + v.toLocaleString('zh-CN')
}

/** 吨数格式化（保留 1 位小数）。 */
export function formatTons(n: number): string {
  return n.toFixed(1) + ' 吨'
}

/** 运输方式中文名。 */
export function modeLabel(mode: string): string {
  switch (mode) {
    case 'road':
      return '公路'
    case 'rail':
      return '铁路'
    case 'air':
      return '航空'
    case 'sea':
      return '海运'
    default:
      return mode
  }
}
