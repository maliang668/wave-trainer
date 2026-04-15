// 标准杠铃片重量（kg）
const PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25, 0.5]

/**
 * 将重量四舍五入到最接近的杠铃片组合
 * @param targetWeight 目标重量
 * @param barWeight 空杆重量，默认20kg
 */
export function roundToPlate(targetWeight: number, barWeight: number = 20): number {
  if (targetWeight <= barWeight) return barWeight

  const oneSide = targetWeight - barWeight
  let bestWeight = barWeight
  let minDiff = Infinity

  for (const plate of PLATES_KG) {
    const count = Math.round(oneSide / plate)
    if (count > 0) {
      const total = barWeight + plate * count
      const diff = Math.abs(total - targetWeight)
      if (diff < minDiff) {
        minDiff = diff
        bestWeight = total
      }
    }
  }

  return bestWeight
}

/**
 * 计算杠铃片组合
 * @param targetWeight 目标重量
 * @param barWeight 空杆重量
 */
export function getPlateCombination(targetWeight: number, barWeight: number = 20): { plate: number; count: number }[] {
  const oneSide = (targetWeight - barWeight) / 2
  if (oneSide <= 0) return []

  const result: { plate: number; count: number }[] = []
  let remaining = oneSide

  for (const plate of PLATES_KG) {
    const count = Math.floor(remaining / plate)
    if (count > 0) {
      result.push({ plate, count })
      remaining -= plate * count
      remaining = Math.round(remaining * 100) / 100
    }
  }

  return result
}