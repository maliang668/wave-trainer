/**
 * 格式化日期为 YYYY-MM-DD
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 格式化日期为 MM-DD
 */
export function formatDateShort(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${month}-${day}`
}

/**
 * 格式化时长（秒 → mm:ss）
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

/**
 * 格式化重量
 */
export function formatWeight(weight: number, unit: string = 'kg'): string {
  return `${weight % 1 === 0 ? weight : weight.toFixed(1)}${unit}`
}

/**
 * 格式化容量（大数简写）
 */
export function formatVolume(v: number): string {
  if (v >= 1000) return (v / 1000).toFixed(1) + 'k'
  return String(v)
}

/**
 * 计算两个日期之间的天数
 */
export function daysBetween(date1: Date | string, date2: Date | string): number {
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2
  const diffTime = Math.abs(d2.getTime() - d1.getTime())
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * 获取相对日期描述
 */
export function getRelativeDate(date: Date | string): string {
  const days = daysBetween(date, new Date())
  if (days === 0) return '今天'
  if (days === 1) return '昨天'
  if (days === 2) return '前天'
  if (days <= 7) return `${days}天前`
  if (days <= 30) return `${Math.floor(days / 7)}周前`
  return `${Math.floor(days / 30)}月前`
}

/**
 * 数组求平均
 */
export function average(nums: number[]): number {
  if (nums.length === 0) return 0
  return nums.reduce((sum, n) => sum + n, 0) / nums.length
}

/**
 * 线性回归斜率
 */
export function linearRegressionSlope(points: { x: number; y: number }[]): number {
  if (points.length < 2) return 0
  const n = points.length
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0
  for (const p of points) {
    sumX += p.x
    sumY += p.y
    sumXY += p.x * p.y
    sumXX += p.x * p.x
  }
  const denominator = n * sumXX - sumX * sumX
  if (denominator === 0) return 0
  return (n * sumXY - sumX * sumY) / denominator
}