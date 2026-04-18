import type { BodyProfile } from '../core/types/user'

/**
 * 基于身体数据估算初始1RM
 * 参考 NSCA (National Strength & Conditioning Association) 新手力量标准
 *
 * 核心公式：
 * 去脂体重 (LBM) = 体重 × (1 - 体脂率)
 * 估算1RM = LBM × 动作系数 × 性别修正
 */

// 各动作的去脂体重倍数系数（新手水平）
const EXERCISE_LBM_COEFFICIENTS: Record<string, { male: number; female: number }> = {
  // 复合动作
  squat: { male: 1.0, female: 0.7 },
  front_squat: { male: 0.85, female: 0.6 },
  deadlift: { male: 1.2, female: 0.85 },
  romanian_deadlift: { male: 0.9, female: 0.65 },
  bench_press: { male: 0.7, female: 0.45 },
  incline_bench_press: { male: 0.6, female: 0.4 },
  dumbbell_bench_press: { male: 0.55, female: 0.35 },
  barbell_row: { male: 0.6, female: 0.4 },
  lat_pulldown: { male: 0.5, female: 0.35 },
  cable_row: { male: 0.45, female: 0.3 },
  overhead_press: { male: 0.45, female: 0.3 },
  dumbbell_shoulder_press: { male: 0.4, female: 0.25 },
  // 单关节动作（约为对应复合动作的 40-60%）
  barbell_curl: { male: 0.2, female: 0.13 },
  dumbbell_curl: { male: 0.17, female: 0.11 },
  hammer_curl: { male: 0.18, female: 0.12 },
  tricep_pushdown: { male: 0.22, female: 0.14 },
  overhead_tricep_extension: { male: 0.18, female: 0.12 },
  close_grip_bench: { male: 0.55, female: 0.35 },
  lateral_raise: { male: 0.12, female: 0.08 },
  face_pull: { male: 0.15, female: 0.1 },
  reverse_fly: { male: 0.13, female: 0.09 },
  dumbbell_fly: { male: 0.2, female: 0.13 },
  cable_crossover: { male: 0.18, female: 0.12 },
  // 下肢辅助动作
  leg_press: { male: 1.2, female: 0.85 },
  leg_extension: { male: 0.35, female: 0.25 },
  leg_curl: { male: 0.3, female: 0.2 },
  hip_thrust: { male: 0.8, female: 0.55 },
  calf_raise: { male: 0.35, female: 0.25 },
  // 自重动作（估算负重等效）
  plank: { male: 0, female: 0 },
  push_up: { male: 0.4, female: 0.25 },
  pull_up: { male: 0.5, female: 0.3 },
  hanging_leg_raise: { male: 0.25, female: 0.15 },
}

/**
 * 计算去脂体重 (Lean Body Mass)
 */
export function calculateLBM(weight: number, bodyFatPercent?: number): number {
  if (!bodyFatPercent || bodyFatPercent <= 0 || bodyFatPercent >= 100) {
    // 没有体脂数据时，用默认体脂率估算
    // 男性默认15%，女性默认25%
    return weight * 0.85 // 保守估计
  }
  return weight * (1 - bodyFatPercent / 100)
}

/**
 * 基于身体数据估算单个动作的初始1RM
 * @param exerciseId 动作ID
 * @param bodyProfile 身体数据
 * @returns 估算的1RM（kg），四舍五入到2.5的倍数
 */
export function estimateInitial1RM(
  exerciseId: string,
  bodyProfile: BodyProfile
): number {
  const weight = bodyProfile.weight
  if (!weight || weight <= 0) return 0

  const gender = bodyProfile.gender || 'male'
  const lbm = calculateLBM(weight, bodyProfile.bodyFat)

  const coeff = EXERCISE_LBM_COEFFICIENTS[exerciseId]
  if (!coeff) return 0

  const genderCoeff = gender === 'female' ? coeff.female : coeff.male
  let estimated1RM = lbm * genderCoeff

  // 年龄修正：30岁后每10年下降约5%
  if (bodyProfile.age && bodyProfile.age > 30) {
    const decadesOver30 = (bodyProfile.age - 30) / 10
    estimated1RM *= Math.max(0.7, 1 - decadesOver30 * 0.05)
  }

  // 经期修正（女性经期中力量下降约5-8%）
  if (bodyProfile.isMenstruating) {
    estimated1RM *= 0.93
  }

  // 四舍五入到2.5的倍数（杠铃片最小单位）
  return Math.round(estimated1RM / 2.5) * 2.5
}

/**
 * 批量估算所有动作的初始1RM
 * @param exerciseIds 动作ID列表
 * @param bodyProfile 身体数据
 * @returns Map<exerciseId, estimated1RM>
 */
export function estimateAllInitial1RMs(
  exerciseIds: string[],
  bodyProfile: BodyProfile
): Map<string, number> {
  const result = new Map<string, number>()
  for (const id of exerciseIds) {
    const e1rm = estimateInitial1RM(id, bodyProfile)
    if (e1rm > 0) {
      result.set(id, e1rm)
    }
  }
  return result
}

/**
 * 获取估算说明文本（用于UI展示）
 */
export function getEstimationExplanation(bodyProfile: BodyProfile): string {
  const lbm = calculateLBM(bodyProfile.weight, bodyProfile.bodyFat)
  const parts = [
    `体重 ${bodyProfile.weight}kg`,
  ]
  if (bodyProfile.bodyFat) {
    parts.push(`体脂 ${bodyProfile.bodyFat}%`)
    parts.push(`去脂体重 ${lbm.toFixed(1)}kg`)
  }
  if (bodyProfile.age) {
    parts.push(`年龄 ${bodyProfile.age}岁`)
  }
  parts.push(`性别 ${bodyProfile.gender === 'female' ? '女' : '男'}`)
  return `基于 ${parts.join('，')} 估算`
}
