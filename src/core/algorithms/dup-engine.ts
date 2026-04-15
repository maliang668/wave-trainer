import type { TrainingDayConfig, CyclePhase, DailyPlan, DailyExercise, WarmupSet } from '@/core/types/training'
import { DUP_CONFIG } from '@/core/constants/config'
import { calculateWorkingWeight } from './rm-calculator'
import type { Exercise } from '@/core/types/exercise'

/**
 * DUP（Daily Undulating Periodization）引擎
 * 实现波浪式负荷渐进循环训练的核心周期化逻辑
 */

/**
 * 根据微周期周数确定训练阶段
 */
export function getCyclePhase(cycleWeek: number): CyclePhase {
  if (cycleWeek <= 2) return 'power'
  if (cycleWeek <= 3) return 'hypertrophy'
  return 'deload'
}

/**
 * 根据宏周期数和微周期周数计算强度系数
 */
export function calculateIntensityMultiplier(
  macroCycle: number,
  microWeek: number,
  phase: CyclePhase
): number {
  // 基础强度
  let baseIntensity: number

  switch (phase) {
    case 'power':
      baseIntensity = 0.85 // 85% 1RM
      break
    case 'hypertrophy':
      baseIntensity = 0.70 // 70% 1RM
      break
    case 'deload':
      baseIntensity = 0.60 // 60% 1RM
      break
    case 'rest':
      return 0
  }

  // 宏周期递增（每个宏周期+2.5%）
  const macroIncrease = macroCycle * DUP_CONFIG.macroCycleIncrease

  // 微周期内波浪调整
  let microAdjustment = 0
  if (phase === 'power') {
    microAdjustment = (microWeek - 1) * 0.025 // 力量期每周+2.5%
  } else if (phase === 'hypertrophy') {
    microAdjustment = (microWeek - 3) * 0.015 // 肌肥大期微调
  }

  const totalIntensity = baseIntensity + macroIncrease + microAdjustment

  // 不超过最大强度
  return Math.min(totalIntensity, DUP_CONFIG.maxIntensity)
}

/**
 * 生成每日训练计划
 */
export function generateDailyPlan(
  dayConfig: TrainingDayConfig,
  exerciseData: Exercise[],
  exerciseMaxes: Map<string, number>,
  date: string,
  macroCycle: number,
  microWeek: number,
  barWeight: number = 20
): DailyPlan {
  const cycleWeek = ((macroCycle - 1) * DUP_CONFIG.cycleLength + microWeek)
  const phase = getCyclePhase(microWeek)
  const intensityMultiplier = calculateIntensityMultiplier(macroCycle, microWeek, phase)

  const dailyExercises: DailyExercise[] = dayConfig.exercises.map(planEx => {
    const exercise = exerciseData.find(ex => ex.id === planEx.exerciseId)
    const e1RM = exerciseMaxes.get(planEx.exerciseId) ?? 0

    // 根据强度系数计算建议重量
    const targetIntensity = planEx.percent1RM * intensityMultiplier
    const suggestedWeight = e1RM > 0
      ? Math.round(e1RM * targetIntensity / 2.5) * 2.5 // 四舍五入到2.5的倍数
      : 0

    // 计算目标RPE
    let targetRPE = planEx.rpeTarget
    if (phase === 'deload') {
      targetRPE = Math.min(targetRPE, 6)
    }

    // 计算目标次数
    let targetReps: [number, number] = planEx.repsRange
    if (phase === 'power') {
      targetReps = [Math.max(targetReps[0] - 2, 1), Math.max(targetReps[1] - 2, 2)]
    } else if (phase === 'deload') {
      targetReps = [Math.min(targetReps[0], 6), Math.min(targetReps[1], 8)]
    }

    // 计算组数
    let sets = planEx.sets
    if (phase === 'deload') {
      sets = Math.max(2, Math.floor(sets * 0.6))
    }

    // 生成热身组
    const warmupSets = suggestedWeight > barWeight
      ? generateWarmupSets(barWeight, suggestedWeight, targetReps[0])
      : []

    return {
      exerciseId: planEx.exerciseId,
      name: exercise?.name ?? planEx.exerciseId,
      muscleGroup: exercise?.muscleGroup ?? 'full_body',
      suggestedWeight,
      targetRPE,
      targetReps,
      sets,
      warmupSets,
    }
  })

  // 估算训练时长（每组约2分钟含休息）
  const totalSets = dailyExercises.reduce((sum, ex) => sum + ex.sets + ex.warmupSets.length, 0)
  const estimatedDuration = totalSets * 2

  return {
    date,
    dayConfig,
    cycleWeek,
    cyclePhase: phase,
    exercises: dailyExercises,
    estimatedDuration,
  }
}

/**
 * 生成热身组方案
 */
export function generateWarmupSets(
  barWeight: number,
  workingWeight: number,
  workingReps: number
): WarmupSet[] {
  if (workingWeight <= barWeight) return []

  const warmupSets: WarmupSet[] = []
  const weightDiff = workingWeight - barWeight

  // 空杆热身
  warmupSets.push({ weight: barWeight, reps: Math.min(workingReps + 5, 15), type: 'warmup' })

  // 中间过渡组
  if (weightDiff > 20) {
    const midWeight = barWeight + weightDiff * 0.5
    warmupSets.push({
      weight: Math.round(midWeight / 2.5) * 2.5,
      reps: Math.min(workingReps + 2, 10),
      type: 'warmup',
    })
  }

  // 接近工作重量的热身组
  if (weightDiff > 10) {
    const prepWeight = barWeight + weightDiff * 0.8
    warmupSets.push({
      weight: Math.round(prepWeight / 2.5) * 2.5,
      reps: workingReps,
      type: 'warmup',
    })
  }

  return warmupSets
}

/**
 * 获取当前周期信息
 */
export function getCyclePhaseName(phase: CyclePhase | string): string {
  const map: Record<string, string> = {
    power: '力量期',
    hypertrophy: '肌肥大期',
    deload: '减负周',
    rest: '休息',
  }
  return map[phase] ?? phase
}

export function getCycleInfo(
  startDate: string,
  currentDate: string
): { macroCycle: number; microWeek: number; totalWeeks: number } {
  const start = new Date(startDate)
  const current = new Date(currentDate)
  const diffDays = Math.floor((current.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  const totalWeeks = Math.floor(diffDays / 7) + 1

  const macroCycle = Math.floor((totalWeeks - 1) / DUP_CONFIG.cycleLength) + 1
  const microWeek = ((totalWeeks - 1) % DUP_CONFIG.cycleLength) + 1

  return { macroCycle, microWeek, totalWeeks }
}