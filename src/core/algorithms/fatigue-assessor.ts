import type { FatigueAssessment } from '@/core/types/algorithm'
import type { TrainingLog } from '@/core/types/training'
import { FATIGUE_CONFIG } from '@/core/constants/config'
import { average } from '@/utils/format'

/**
 * 疲劳评估器
 * 综合多维度指标评估训练疲劳程度
 */

/**
 * 综合疲劳评估
 */
export function assessFatigue(
  logs: TrainingLog[],
  selfReport?: { sleep: number; stress: number; nutrition: number }
): FatigueAssessment {
  const metrics = calculateFatigueMetrics(logs, selfReport)
  const fatigueScore = calculateFatigueScore(metrics)
  const level = determineFatigueLevel(fatigueScore)
  const advice = generateFatigueAdvice(level, metrics)

  return {
    fatigueScore,
    level,
    advice,
    metrics,
  }
}

/**
 * 计算疲劳相关指标
 */
function calculateFatigueMetrics(
  logs: TrainingLog[],
  selfReport?: { sleep: number; stress: number; nutrition: number }
): FatigueAssessment['metrics'] {
  // RPE趋势
  const rpeTrend = analyzeRPETrend(logs)

  // 容量变化
  const volumeChange = analyzeVolumeChange(logs)

  // 表现变化
  const performanceChange = analyzePerformanceChange(logs)

  // 休息天数
  const restDays = calculateRestDays(logs)

  return {
    rpeTrend,
    volumeChange,
    performanceChange,
    restDays,
    selfReport,
  }
}

/**
 * 分析RPE趋势
 */
function analyzeRPETrend(
  logs: TrainingLog[]
): FatigueAssessment['metrics']['rpeTrend'] {
  if (logs.length < 3) return 'stable'

  const recentLogs = [...logs]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5)

  const rpeValues = recentLogs.map(log => {
    const workingSets = log.exercises.flatMap(ex =>
      ex.sets.filter(s => !s.isWarmup && s.completed)
    )
    return workingSets.length > 0 ? average(workingSets.map(s => s.rpe)) : 0
  }).filter(v => v > 0)

  if (rpeValues.length < 3) return 'stable'

  // 计算趋势
  const firstHalf = average(rpeValues.slice(0, Math.floor(rpeValues.length / 2)))
  const secondHalf = average(rpeValues.slice(Math.floor(rpeValues.length / 2)))
  const diff = secondHalf - firstHalf

  if (diff > 0.5) return 'increasing'
  if (diff < -0.5) return 'decreasing'
  if (average(rpeValues) >= 8) return 'stable_high'
  return 'stable'
}

/**
 * 分析容量变化
 */
function analyzeVolumeChange(logs: TrainingLog[]): number {
  if (logs.length < 4) return 0

  const sortedLogs = [...logs]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  const half = Math.floor(sortedLogs.length / 2)
  const firstHalfVolume = sortedLogs.slice(0, half).reduce((sum, log) =>
    sum + log.exercises.reduce((s, ex) => s + ex.totalVolume, 0), 0
  )
  const secondHalfVolume = sortedLogs.slice(half).reduce((sum, log) =>
    sum + log.exercises.reduce((s, ex) => s + ex.totalVolume, 0), 0
  )

  if (firstHalfVolume === 0) return 0
  return ((secondHalfVolume - firstHalfVolume) / firstHalfVolume) * 100
}

/**
 * 分析表现变化
 */
function analyzePerformanceChange(logs: TrainingLog[]): number {
  if (logs.length < 4) return 0

  const sortedLogs = [...logs]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  const half = Math.floor(sortedLogs.length / 2)
  const firstHalf1RM = sortedLogs.slice(0, half).reduce((sum, log) =>
    sum + log.exercises.reduce((s, ex) => s + ex.estimated1RM, 0), 0
  )
  const secondHalf1RM = sortedLogs.slice(half).reduce((sum, log) =>
    sum + log.exercises.reduce((s, ex) => s + ex.estimated1RM, 0), 0
  )

  if (firstHalf1RM === 0) return 0
  return ((secondHalf1RM - firstHalf1RM) / firstHalf1RM) * 100
}

/**
 * 计算近期休息天数
 */
function calculateRestDays(logs: TrainingLog[]): number {
  if (logs.length === 0) return 30 // 没有训练记录，视为充分休息

  const now = new Date()
  const recentLogs = logs.filter(log => {
    const logDate = new Date(log.date)
    const diffDays = (now.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24)
    return diffDays <= 14
  })

  if (recentLogs.length === 0) return 14

  const trainingDates = new Set(recentLogs.map(log => log.date))
  return 14 - trainingDates.size
}

/**
 * 计算综合疲劳分数（0-100）
 */
function calculateFatigueScore(metrics: FatigueAssessment['metrics']): number {
  const { weights } = FATIGUE_CONFIG
  let score = 0

  // RPE趋势评分（0-100）
  let rpeScore = 50
  switch (metrics.rpeTrend) {
    case 'increasing': rpeScore = 80; break
    case 'stable_high': rpeScore = 70; break
    case 'stable': rpeScore = 50; break
    case 'decreasing': rpeScore = 20; break
  }
  score += rpeScore * weights.rpeTrend

  // 表现变化评分（下降越多分数越高）
  const perfScore = metrics.performanceChange < 0
    ? Math.min(100, 50 + Math.abs(metrics.performanceChange) * 5)
    : Math.max(0, 50 + metrics.performanceChange * 3)
  score += perfScore * weights.performanceChange

  // 休息天数评分（休息越少分数越高）
  const restScore = metrics.restDays <= 2 ? 80
    : metrics.restDays <= 3 ? 50
    : metrics.restDays >= 5 ? 10
    : 30
  score += restScore * weights.restDays

  // 自我报告评分
  if (metrics.selfReport) {
    const { sleep, stress, nutrition } = metrics.selfReport
    // 睡眠差、压力大、营养差 → 疲劳高
    const selfReportScore = ((6 - sleep) + stress + (6 - nutrition)) / 15 * 100
    score += selfReportScore * weights.selfReport
  }

  return Math.round(Math.min(100, Math.max(0, score)))
}

/**
 * 判断疲劳等级
 */
function determineFatigueLevel(score: number): FatigueAssessment['level'] {
  if (score >= FATIGUE_CONFIG.highThreshold) return 'high'
  if (score >= FATIGUE_CONFIG.moderateThreshold) return 'moderate'
  return 'low'
}

/**
 * 生成疲劳建议
 */
function generateFatigueAdvice(
  level: FatigueAssessment['level'],
  metrics: FatigueAssessment['metrics']
): string {
  switch (level) {
    case 'high':
      if (metrics.rpeTrend === 'increasing') {
        return '疲劳程度较高，RPE持续上升。建议安排1周减负或完全休息，重点关注睡眠质量。'
      }
      if (metrics.restDays <= 2) {
        return '疲劳程度较高，近期休息不足。建议增加1-2个休息日，保证充分恢复。'
      }
      return '疲劳程度较高，建议降低训练强度和容量，安排减负周。'

    case 'moderate':
      return '疲劳程度中等，注意监控身体状态。如果持续感到疲劳，考虑减少训练量。'

    case 'low':
      return '疲劳程度低，身体状态良好。可以继续保持当前训练强度。'
  }
}