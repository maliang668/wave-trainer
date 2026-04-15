import type { RMEstimate } from '@/core/types/algorithm'

/**
 * RM计算器
 * 基于Epley公式和RPE调整估算1RM
 */

/**
 * Epley公式：1RM = weight * (1 + reps / 30)
 * 适用于 reps <= 10 的情况
 */
export function epleyFormula(weight: number, reps: number): number {
  if (reps <= 0) return weight
  if (reps === 1) return weight
  return weight * (1 + reps / 30)
}

/**
 * Brzycki公式：1RM = weight * 36 / (37 - reps)
 * 适用于 reps <= 10 的情况
 */
export function brzyckiFormula(weight: number, reps: number): number {
  if (reps <= 0) return weight
  if (reps >= 37) return weight // 避免除零
  return weight * 36 / (37 - reps)
}

/**
 * 基于RPE的1RM估算（Mike Tuchscherer方法）
 * RPE与余力次数(RIR)的关系：RIR = 10 - RPE
 */
const RPE_REPS_TABLE: Record<number, number> = {
  10: 0,
  9.5: 0.5,
  9: 1,
  8.5: 2,
  8: 3,
  7.5: 4,
  7: 5,
  6.5: 6,
  6: 7,
  5.5: 8,
  5: 10,
}

function getRIRFromRPE(rpe: number): number {
  // 找到最近的RPE对应的RIR
  const rpeValues = Object.keys(RPE_REPS_TABLE).map(Number).sort((a, b) => a - b)
  for (const rpeVal of rpeValues) {
    if (rpe >= rpeVal) {
      return RPE_REPS_TABLE[rpeVal]
    }
  }
  return 10
}

/**
 * RPE调整的1RM估算
 * 将实际完成次数和RPE转换为等效的1RM
 */
export function rpeAdjusted1RM(weight: number, reps: number, rpe: number): number {
  const rir = getRIRFromRPE(rpe)
  const equivalentReps = reps + rir
  // 使用Epley公式计算等效1RM
  return epleyFormula(weight, equivalentReps)
}

/**
 * 综合估算1RM
 * 取多种方法的中位数，提高估算精度
 */
export function estimate1RM(
  weight: number,
  reps: number,
  rpe?: number
): RMEstimate {
  if (reps <= 0 || weight <= 0) {
    return { estimated1RM: 0, confidence: 'low', method: 'invalid_input' }
  }

  const estimates: number[] = []

  // 基础公式估算
  if (reps <= 10) {
    estimates.push(epleyFormula(weight, reps))
    estimates.push(brzyckiFormula(weight, reps))
  }

  // RPE调整估算
  if (rpe && rpe >= 6 && rpe <= 10) {
    estimates.push(rpeAdjusted1RM(weight, reps, rpe))
  }

  if (estimates.length === 0) {
    // 高次数情况，使用Epley外推
    estimates.push(epleyFormula(weight, reps))
  }

  // 取中位数
  estimates.sort((a, b) => a - b)
  const median = estimates[Math.floor(estimates.length / 2)]

  // 确定置信度
  let confidence: 'high' | 'medium' | 'low' = 'low'
  if (rpe && rpe >= 7 && rpe <= 9.5 && reps >= 1 && reps <= 5) {
    confidence = 'high'
  } else if (rpe && rpe >= 6 && rpe <= 10 && reps >= 1 && reps <= 8) {
    confidence = 'medium'
  }

  const method = rpe ? 'rpe_adjusted' : 'formula'

  return {
    estimated1RM: Math.round(median * 10) / 10,
    confidence,
    method,
  }
}

/**
 * 根据1RM和RPE目标计算建议重量
 */
export function calculateWorkingWeight(
  e1RM: number,
  targetRPE: number,
  targetReps: number
): number {
  const rir = getRIRFromRPE(targetRPE)
  const equivalentReps = targetReps + rir

  // 反推Epley公式：weight = 1RM / (1 + reps / 30)
  const weight = e1RM / (1 + equivalentReps / 30)
  return Math.round(weight * 10) / 10
}