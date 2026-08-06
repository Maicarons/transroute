export function cn(
  ...parts: (string | false | null | undefined)[]
): string {
  return parts.filter(Boolean).join(' ')
}

export function fmtMoney(n: number): string {
  const v = Math.round(n)
  const sign = v < 0 ? '-' : ''
  return sign + '¥' + Math.abs(v).toLocaleString('zh-CN')
}

export function fmtKm(n: number): string {
  return Math.round(n).toLocaleString('zh-CN') + ' km'
}

export function fmtNum(n: number): string {
  return Math.round(n).toLocaleString('zh-CN')
}
