import type { PlateauDiagnosis, BreakthroughStrategy } from '@/core/types/algorithm'
import type { TrainingLog } from '@/core/types/training'
import { PLATEAU_CONFIG } from '@/core/constants/config'
import { linearRegressionSlope, average } from '@/utils/format'

/**
 * 平台期检测器
 * 分析训练数据，检测是否存在进步停滞
 */

/**
 * 检测特定动作的平台期
 */
export function detectPlateau(
  logs: TrainingLog[],
  exerciseId: string
): PlateauDiagnosis {
  // 获取该动作的所有记录，按日期排序
  const records = logs
    .filter(log => log.exercises.some(ex => ex.exerciseId === exerciseId))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(log => {
      const ex = log.exercises.find(e => e.exerciseId === exerciseId)!
      return {
        date: log.date,
        e1RM: ex.estimated1RM,
        avgRPE: ex.averageRPE,
        volume: ex.totalVolume,
      }
    })

  // 数据不足
  if (records.length < PLATEAU_CONFIG.minDataPoints) {
    return {
      detected: false,
      diagnosis: 'understimulated',
      slope: 0,
      avgRPE: 0,
      weeklyVolume: 0,
      recommendation: {
        type: 'collect_data',
        title: '数据收集中',
        description: `需要至少${PLATEAU_CONFIG.minDataPoints}次训练数据才能进行平台期分析`,
        parameters: {},
      },
    }
  }

  // 取最近检测窗口内的数据
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - PLATEAU_CONFIG.detectionWindowDays)

  const recentRecords = records.filter(r => new Date(r.date) >= cutoffDate)

  if (recentRecords.length < PLATEAU_CONFIG.minDataPoints) {
    return {
      detected: false,
      diagnosis: 'understimulated',
      slope: 0,
      avgRPE: average(recentRecords.map(r => r.avgRPE)),
      weeklyVolume: calculateWeeklyVolume(recentRecords),
      recommendation: {
        type: 'collect_data',
        title: '数据收集中',
        description: '近期数据不足，继续按计划训练',
        parameters: {},
      },
    }
  }

  // 计算线性回归斜率
  const points = recentRecords.map((r, i) => ({
    x: i,
    y: r.e1RM,
  }))
  const slope = linearRegressionSlope(points)
  const avgRPE = average(recentRecords.map(r => r.avgRPE))
  const weeklyVolume = calculateWeeklyVolume(recentRecords)

  // 判断是否平台期
  const isPlateau = slope < PLATEAU_CONFIG.slopeThreshold && recentRecords.length >= PLATEAU_CONFIG.minDataPoints

  if (!isPlateau) {
    return {
      detected: false,
      diagnosis: 'understimulated',
      slope,
      avgRPE,
      weeklyVolume,
      recommendation: {
        type: 'keep_going',
        title: '进步正常',
        description: '当前训练进展良好，继续保持',
        parameters: {},
      },
    }
  }

  // 诊断平台期类型
  const diagnosis = diagnosePlateauType(slope, avgRPE, weeklyVolume)
  const recommendation = generateBreakthroughStrategy(diagnosis, weeklyVolume)

  return {
    detected: true,
    diagnosis,
    slope,
    avgRPE,
    weeklyVolume,
    recommendation,
  }
}

/**
 * 诊断平台期类型
 */
function diagnosePlateauType(
  slope: number,
  avgRPE: number,
  weeklyVolume: number
): PlateauDiagnosis['diagnosis'] {
  // 高RPE + 低容量 = 恢复不足
  if (avgRPE >= 8 && weeklyVolume <= PLATEAU_CONFIG.lowVolumeThreshold) {
    return 'recovery_deficit'
  }

  // 高RPE + 高容量 = 过度训练
  if (avgRPE >= 8 && weeklyVolume >= PLATEAU_CONFIG.highVolumeThreshold) {
    return 'overreached'
  }

  // 低RPE + 低容量 = 刺激不足
  if (avgRPE <= 7 && weeklyVolume <= PLATEAU_CONFIG.lowVolumeThreshold) {
    return 'understimulated'
  }

  // 其他情况 = 适应性停滞
  return 'adapted'
}

/**
 * 生成突破策略
 */
function generateBreakthroughStrategy(
  diagnosis: PlateauDiagnosis['diagnosis'],
  weeklyVolume: number
): BreakthroughStrategy {
  switch (diagnosis) {
    case 'understimulated':
      return {
        type: 'volume_increase',
        title: '增加训练容量',
        description: '当前训练刺激不足，建议逐步增加每周训练组数',
        parameters: {
          targetVolumeIncrease: 2, // 每周增加2组
          rampWeeks: 2,
        },
      }

    case 'overreached':
      return {
        type: 'deload_then_modify',
        title: '减负后调整',
        description: '训练量和强度过高，先安排减负周，之后降低训练量但保持强度',
        parameters: {
          deloadWeeks: 1,
          volumeReduction: 0.3,
          intensityMaintain: 1,
        },
      }

    case 'recovery_deficit':
      return {
        type: 'recovery_focus',
        title: '恢复优先',
        description: 'RPE偏高但容量不足，说明恢复有问题。改善睡眠和营养，适当增加休息日',
        parameters: {
          extraRestDays: 1,
          deloadWeeks: 1,
        },
      }

    case 'adapted':
      return {
        type: 'stimulus_change',
        title: '变换刺激',
        description: '身体已适应当前训练，建议更换动作变体或调整训练参数',
        parameters: {
          exerciseVariation: 1,
          repRangeChange: 2,
        },
      }
  }
}

/**
 * 计算每周平均容量
 */
function calculateWeeklyVolume(records: { date: string; volume: number }[]): number {
  if (records.length === 0) return 0

  const dates = records.map(r => new Date(r.date))
  const minDate = new Date(Math.min(...dates.map(d => d.getTime())))
  const maxDate = new Date(Math.max(...dates.map(d => d.getTime())))
  const weeks = Math.max(1, Math.ceil((maxDate.getTime() - minDate.getTime()) / (7 * 24 * 60 * 60 * 1000)))

  const totalVolume = records.reduce((sum, r) => sum + r.volume, 0)
  return Math.round(totalVolume / weeks)
}