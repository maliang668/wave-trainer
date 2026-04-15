import type { RPEAdjustment } from '@/core/types/algorithm'
import { RPE_CONFIG } from '@/core/constants/config'

/**
 * RPE管理器
 * 处理RPE相关的计算和调整建议
 */

/**
 * 判断实际RPE是否在目标范围内
 */
export function isRPEInRange(actualRPE: number, targetRPE: number): boolean {
  return Math.abs(actualRPE - targetRPE) <= RPE_CONFIG.toleranceRange
}

/**
 * 计算RPE偏差
 * 正值表示比目标更难（RPE更高），负值表示比目标更轻松
 */
export function getRPEDeviation(actualRPE: number, targetRPE: number): number {
  return actualRPE - targetRPE
}

/**
 * 基于RPE偏差生成重量调整建议
 */
export function generateRPEAdjustment(
  currentWeight: number,
  actualRPE: number,
  targetRPE: number
): RPEAdjustment {
  const deviation = getRPEDeviation(actualRPE, targetRPE)

  // 如果在容差范围内，不需要调整
  if (Math.abs(deviation) <= RPE_CONFIG.toleranceRange) {
    return {
      currentWeight,
      suggestedWeight: currentWeight,
      adjustmentPercent: 0,
      reason: 'RPE在目标范围内，保持当前重量',
    }
  }

  // 计算调整百分比
  const adjustmentPercent = -deviation * RPE_CONFIG.adjustmentPerRPE
  const suggestedWeight = Math.round(currentWeight * (1 + adjustmentPercent / 100) * 10) / 10

  // 生成建议原因
  let reason: string
  if (deviation > 0) {
    reason = `实际RPE(${actualRPE})高于目标(${targetRPE})，建议减重${Math.abs(adjustmentPercent).toFixed(1)}%`
  } else {
    reason = `实际RPE(${actualRPE})低于目标(${targetRPE})，建议加重${Math.abs(adjustmentPercent).toFixed(1)}%`
  }

  return {
    currentWeight,
    suggestedWeight: Math.max(0, suggestedWeight),
    adjustmentPercent: Math.round(adjustmentPercent * 10) / 10,
    reason,
  }
}

/**
 * 新手RPE模式转换
 * 将3档RPE转换为标准RPE值
 */
export function beginnerRPEToStandard(level: number): number {
  // level: 0=轻松(5-6), 1=适中(7-8), 2=吃力(9-10)
  const mapping: Record<number, number> = {
    0: 5.5,
    1: 7.5,
    2: 9.5,
  }
  return mapping[level] ?? 7.5
}

/**
 * 标准RPE转新手模式
 */
export function standardRPEToBeginner(rpe: number): number {
  if (rpe <= 6) return 0
  if (rpe <= 8) return 1
  return 2
}

/**
 * 获取RPE描述文本
 */
export function getRPEDescription(rpe: number): string {
  if (rpe <= 4) return '非常轻松，还能做很多次'
  if (rpe <= 5) return '轻松，还有4-5次余力'
  if (rpe <= 6) return '有些吃力，还有3-4次余力'
  if (rpe <= 7) return '较吃力，还有2-3次余力'
  if (rpe <= 8) return '吃力，还能做2次'
  if (rpe <= 9) return '很吃力，还能做1次'
  if (rpe <= 9.5) return '极限，可能还能做1次'
  return '绝对极限，无法再做更多'
}