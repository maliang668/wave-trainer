import type { DeloadTrigger, DeloadPlan } from '@/core/types/algorithm'
import type { TrainingLog } from '@/core/types/training'
import { DELOAD_CONFIG } from '@/core/constants/config'
import { average } from '@/utils/format'

/**
 * 减负周检测器
 * 监测训练数据，判断是否需要触发减负周
 */

/**
 * 综合评估是否需要减负
 * 返回所有触发的条件和推荐的减负方案
 */
export function evaluateDeloadNeed(
  logs: TrainingLog[],
  currentCycleWeek: number,
  totalTrainingWeeks: number
): { triggers: DeloadTrigger[]; plan: DeloadPlan | null } {
  const triggers: DeloadTrigger[] = []

  // 1. 计划内减负（按周期）
  if (currentCycleWeek >= DELOAD_CONFIG.defaultInterval) {
    triggers.push({
      type: 'scheduled',
      priority: 'medium',
      message: `已连续训练${currentCycleWeek}周，建议安排减负周`,
    })
  }

  // 2. 基于疲劳的检测
  const fatigueTrigger = checkFatigueBased(logs)
  if (fatigueTrigger) {
    triggers.push(fatigueTrigger)
  }

  // 3. 基于表现的检测
  const performanceTrigger = checkPerformanceBased(logs)
  if (performanceTrigger) {
    triggers.push(performanceTrigger)
  }

  // 4. 生成减负方案
  let plan: DeloadPlan | null = null
  if (triggers.length > 0) {
    const hasHighPriority = triggers.some(t => t.priority === 'high')
    plan = generateDeloadPlan(hasHighPriority)
  }

  return { triggers, plan }
}

/**
 * 基于疲劳指标的检测
 */
function checkFatigueBased(logs: TrainingLog[]): DeloadTrigger | null {
  if (logs.length < 3) return null

  // 取最近3次训练
  const recentLogs = [...logs]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3)

  // 计算平均RPE
  const avgRPEs = recentLogs.map(log => {
    const workingSets = log.exercises.flatMap(ex =>
      ex.sets.filter(s => !s.isWarmup && s.completed)
    )
    return workingSets.length > 0
      ? average(workingSets.map(s => s.rpe))
      : 0
  })

  const overallAvgRPE = average(avgRPEs)

  if (overallAvgRPE >= DELOAD_CONFIG.highRPEScoreThreshold) {
    return {
      type: 'fatigue',
      priority: 'high',
      message: `近期平均RPE ${overallAvgRPE.toFixed(1)} 过高，建议立即减负`,
    }
  }

  // RPE趋势上升
  if (avgRPEs.length >= 3) {
    const trend = avgRPEs[0] - avgRPEs[2] // 最新 vs 最早
    if (trend > 1) {
      return {
        type: 'fatigue',
        priority: 'medium',
        message: `RPE持续上升(+${trend.toFixed(1)})，疲劳可能在累积`,
      }
    }
  }

  return null
}

/**
 * 基于表现的检测
 */
function checkPerformanceBased(logs: TrainingLog[]): DeloadTrigger | null {
  if (logs.length < 4) return null

  // 取最近4次训练，检查1RM趋势
  const recentLogs = [...logs]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 4)

  // 检查是否有表现下降
  let declineCount = 0
  for (let i = 0; i < recentLogs.length - 1; i++) {
    const current = recentLogs[i]
    const previous = recentLogs[i + 1]

    for (const ex of current.exercises) {
      const prevEx = previous.exercises.find(pe => pe.exerciseId === ex.exerciseId)
      if (prevEx && ex.estimated1RM < prevEx.estimated1RM * 0.95) {
        declineCount++
      }
    }
  }

  if (declineCount >= 2) {
    return {
      type: 'performance',
      priority: 'high',
      message: `检测到${declineCount}个动作表现下降，建议减负恢复`,
    }
  }

  return null
}

/**
 * 生成减负周方案
 */
function generateDeloadPlan(isUrgent: boolean): DeloadPlan {
  if (isUrgent) {
    return {
      strategy: 'combined',
      volumeReduction: 0.5,
      intensityReduction: 0.1,
      setsPerExercise: 2,
      rpeTarget: 5,
      duration: 1,
      message: '紧急减负：容量和强度同时降低，充分恢复',
    }
  }

  return {
    strategy: 'volume_reduction',
    volumeReduction: DELOAD_CONFIG.volumeReduction,
    intensityReduction: DELOAD_CONFIG.intensityReduction,
    setsPerExercise: 3,
    rpeTarget: DELOAD_CONFIG.rpeTarget,
    duration: 1,
    message: '计划减负：保持强度，降低容量，促进恢复',
  }
}