import type { ReturnPlan } from '@/core/types/algorithm'
import { RETURN_CONFIG } from '@/core/constants/config'

/**
 * 停训回归规划器
 * 根据停训时长生成渐进式回归方案
 */

/**
 * 根据停训天数生成回归方案
 */
export function generateReturnPlan(daysOff: number): ReturnPlan {
  if (daysOff <= RETURN_CONFIG.minimal.maxDays) {
    return generateMinimalPlan(daysOff)
  } else if (daysOff <= RETURN_CONFIG.moderate.maxDays) {
    return generateModeratePlan(daysOff)
  } else if (daysOff <= RETURN_CONFIG.extended.maxDays) {
    return generateExtendedPlan(daysOff)
  } else {
    return generateRestartPlan(daysOff)
  }
}

/**
 * 短期停训（<=14天）：微调即可
 */
function generateMinimalPlan(daysOff: number): ReturnPlan {
  return {
    phase: 'minimal_adjustment',
    duration: `${daysOff}天停训，1周恢复`,
    weeks: [
      {
        volumePercent: RETURN_CONFIG.minimal.volumePercent,
        intensityPercent: RETURN_CONFIG.minimal.intensityPercent,
        rpeTarget: RETURN_CONFIG.minimal.rpeTarget,
        message: `停训${daysOff}天，力量流失很小。第1周使用80%容量和90%强度，RPE控制在7.5以下`,
      },
    ],
    note: '短期停训对力量和肌肉影响很小，1周内即可恢复到正常水平',
  }
}

/**
 * 中期停训（15-28天）：适度回归
 */
function generateModeratePlan(daysOff: number): ReturnPlan {
  const weeks = RETURN_CONFIG.moderate.weeks
  const weekPlans = []

  for (let i = 0; i < weeks; i++) {
    const volumePercent = Math.min(100, 50 + i * 15)
    const intensityPercent = Math.min(100, 70 + i * 10)
    const rpeTarget = Math.min(8, 6 + i * 0.5)

    weekPlans.push({
      volumePercent,
      intensityPercent,
      rpeTarget,
      message: `第${i + 1}周：容量${volumePercent}%，强度${intensityPercent}%，RPE目标${rpeTarget}`,
    })
  }

  return {
    phase: 'moderate_return',
    duration: `${daysOff}天停训，${weeks}周渐进恢复`,
    weeks: weekPlans,
    note: '中期停训会有一定力量下降，建议4周渐进恢复，不要急于恢复到之前的训练量',
  }
}

/**
 * 长期停训（29-90天）：延长回归
 */
function generateExtendedPlan(daysOff: number): ReturnPlan {
  const weeks = RETURN_CONFIG.extended.weeks
  const weekPlans = []

  for (let i = 0; i < weeks; i++) {
    const volumePercent = Math.min(100, 30 + i * 10)
    const intensityPercent = Math.min(100, 50 + i * 7)
    const rpeTarget = Math.min(8, 5.5 + i * 0.4)

    weekPlans.push({
      volumePercent,
      intensityPercent,
      rpeTarget,
      message: `第${i + 1}周：容量${volumePercent}%，强度${intensityPercent}%，RPE目标${rpeTarget}`,
    })
  }

  return {
    phase: 'extended_return',
    duration: `${daysOff}天停训，${weeks}周渐进恢复`,
    weeks: weekPlans,
    note: '长期停训后力量和肌肉量有明显下降，需要8周渐进恢复。前2周以技术复习和轻度训练为主',
  }
}

/**
 * 超长期停训（>90天）：重新开始
 */
function generateRestartPlan(daysOff: number): ReturnPlan {
  const weeks = RETURN_CONFIG.restart.weeks
  const weekPlans = []

  for (let i = 0; i < weeks; i++) {
    const volumePercent = Math.min(100, 20 + i * 7)
    const intensityPercent = Math.min(100, 40 + i * 5)
    const rpeTarget = Math.min(8, 5 + i * 0.25)

    weekPlans.push({
      volumePercent,
      intensityPercent,
      rpeTarget,
      message: `第${i + 1}周：容量${volumePercent}%，强度${intensityPercent}%，RPE目标${rpeTarget}`,
    })
  }

  return {
    phase: 'restart',
    duration: `${daysOff}天停训，${weeks}周从头开始`,
    weeks: weekPlans,
    note: '超长期停训后建议当作新手重新开始，12周渐进恢复。重点关注动作技术和关节稳定性',
  }
}

/**
 * 计算停训天数
 */
export function calculateDaysOff(lastTrainingDate: string): number {
  const last = new Date(lastTrainingDate)
  const now = new Date()
  const diffTime = now.getTime() - last.getTime()
  return Math.floor(diffTime / (1000 * 60 * 60 * 24))
}