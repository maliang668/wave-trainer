import type { TrainingDayConfig, CyclePhase, DailyPlan, DailyExercise, WarmupSet, SplitTemplate, SplitDayConfig } from '@/core/types/training'
import { DUP_CONFIG, SPLIT_TEMPLATES } from '@/core/constants/config'
import type { Exercise } from '@/core/types/exercise'

/**
 * DUP（Daily Undulating Periodization）引擎
 * 实现真正的每日波动周期化：
 * - 同一周/循环内不同训练日有不同强度
 * - 第1次训练：大重量（85% 1RM, 4-6次, RPE 8.5）
 * - 第2次训练：中等（75% 1RM, 8-10次, RPE 7.5）
 * - 第3次训练：轻量（65% 1RM, 12-15次, RPE 6.5）
 * - 每3次训练为一个DUP微循环
 * - 新手模板不区分强度等级，统一中等
 */

/**
 * 根据训练次数在DUP微循环中的位置确定强度等级
 * @param trainingCountInCycle 当前周期内的第几次训练（1-based）
 * @param isBeginner 是否为新手模板
 * @param isDeloadWeek 是否为减负周
 */
export function getDUPIntensityLevel(
  trainingCountInCycle: number,
  isBeginner: boolean = false,
  isDeloadWeek: boolean = false
): CyclePhase {
  if (isDeloadWeek) return 'deload'
  if (isBeginner) return 'medium' // 新手统一中等强度

  // DUP核心：每3次训练为一个波动周期
  const position = ((trainingCountInCycle - 1) % 3) + 1
  switch (position) {
    case 1: return 'heavy'    // 大重量日
    case 2: return 'medium'   // 中等日
    case 3: return 'light'    // 轻量日
    default: return 'medium'
  }
}

/**
 * 获取强度等级的中文名称
 */
export function getCyclePhaseName(phase: CyclePhase | string): string {
  const map: Record<string, string> = {
    heavy: '大重量日',
    medium: '中等日',
    light: '轻量日',
    deload: '减负周',
    rest: '休息',
    power: '力量期',      // 兼容旧数据
    hypertrophy: '肌肥大期', // 兼容旧数据
  }
  return map[phase] ?? phase
}

/**
 * 获取强度等级的颜色
 */
export function getPhaseColor(phase: CyclePhase | string): string {
  const colors: Record<string, string> = {
    heavy: '#ef5350',
    medium: '#ffa726',
    light: '#66bb6a',
    deload: '#4fc3f7',
    rest: '#888888',
    power: '#ef5350',
    hypertrophy: '#66bb6a',
  }
  return colors[phase] ?? '#888888'
}

/**
 * 根据DUP强度等级计算强度系数
 */
export function calculateIntensityMultiplier(
  phase: CyclePhase,
  macroCycle: number
): number {
  const levels = DUP_CONFIG.intensityLevels
  let baseIntensity: number

  switch (phase) {
    case 'heavy':
      baseIntensity = levels.heavy.percent1RM
      break
    case 'medium':
      baseIntensity = levels.medium.percent1RM
      break
    case 'light':
      baseIntensity = levels.light.percent1RM
      break
    case 'deload':
      baseIntensity = levels.deload.percent1RM
      break
    case 'rest':
      return 0
    default:
      baseIntensity = levels.medium.percent1RM
  }

  // 宏周期递增（每个宏周期+2%）
  const macroIncrease = macroCycle * DUP_CONFIG.macroCycleIncrease

  const totalIntensity = baseIntensity + macroIncrease
  return Math.min(totalIntensity, 1.0)
}

/**
 * 获取当前周期信息
 */
export function getCycleInfo(
  startDate: string,
  currentDate: string
): { macroCycle: number; microWeek: number; totalWeeks: number; totalDays: number } {
  const start = new Date(startDate)
  const current = new Date(currentDate)
  const diffDays = Math.floor((current.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  const totalDays = Math.max(diffDays, 0)
  const totalWeeks = Math.floor(totalDays / 7) + 1

  const macroCycle = Math.floor((totalWeeks - 1) / DUP_CONFIG.cycleLength) + 1
  const microWeek = ((totalWeeks - 1) % DUP_CONFIG.cycleLength) + 1

  return { macroCycle, microWeek, totalWeeks, totalDays }
}

/**
 * 根据分化模板和日期确定今天是循环中的第几天
 * @param template 分化模板
 * @param startDate 开始日期
 * @param currentDate 当前日期
 */
export function getDayInCycle(
  template: SplitTemplate,
  startDate: string,
  currentDate: string
): { dayIndex: number; splitDay: SplitDayConfig; trainingCountInCycle: number } {
  const start = new Date(startDate)
  const current = new Date(currentDate)
  const diffDays = Math.floor((current.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))

  // 在循环中的位置（0-based）
  const positionInCycle = diffDays % template.cycleDays
  const dayIndex = positionInCycle

  // 获取对应的分化日配置
  const splitDay = template.days[dayIndex] || { dayIndex: 0, label: '休息', type: 'rest' as const, exercises: [] }

  // 计算到今天为止已经完成了多少次训练（用于DUP强度分配）
  let trainingCountInCycle = 0
  for (let i = 0; i < dayIndex; i++) {
    if (template.days[i] && template.days[i].type !== 'rest') {
      trainingCountInCycle++
    }
  }
  // 如果今天也是训练日，算上今天
  if (splitDay.type !== 'rest') {
    trainingCountInCycle++
  }

  // 计算从开始到现在的总训练次数（用于跨循环的DUP计数）
  const completedCycles = Math.floor(diffDays / template.cycleDays)
  const totalTrainingCount = completedCycles * template.days.filter(d => d.type !== 'rest').length + trainingCountInCycle

  return { dayIndex, splitDay, trainingCountInCycle: totalTrainingCount }
}

/**
 * 判断是否应该减负
 * @param macroCycle 当前宏周期数
 * @param totalWeeks 总周数
 */
export function shouldDeload(macroCycle: number, totalWeeks: number): boolean {
  // 每4个宏周期减负一次
  return macroCycle > 0 && macroCycle % DUP_CONFIG.deloadInterval === 0
}

/**
 * 生成每日训练计划（核心函数）
 */
export function generateDailyPlan(
  dayConfig: TrainingDayConfig,
  exerciseData: Exercise[],
  exerciseMaxes: Map<string, number>,
  date: string,
  macroCycle: number,
  trainingCountInCycle: number,
  isBeginner: boolean = false,
  isDeloadWeek: boolean = false,
  barWeight: number = 20,
  splitTemplateId?: string,
  splitDayLabel?: string
): DailyPlan {
  // 确定DUP强度等级
  const phase = getDUPIntensityLevel(trainingCountInCycle, isBeginner, isDeloadWeek)
  const intensityMultiplier = calculateIntensityMultiplier(phase, macroCycle)

  // 获取强度等级配置
  const levelConfig = DUP_CONFIG.intensityLevels[phase as keyof typeof DUP_CONFIG.intensityLevels] || DUP_CONFIG.intensityLevels.medium

  const dailyExercises: DailyExercise[] = dayConfig.exercises.map(planEx => {
    const exercise = exerciseData.find(ex => ex.id === planEx.exerciseId)
    const e1RM = exerciseMaxes.get(planEx.exerciseId) ?? 0

    // 计算建议重量
    let suggestedWeight = 0
    if (e1RM > 0 && planEx.percent1RM > 0) {
      const targetIntensity = planEx.percent1RM * intensityMultiplier
      suggestedWeight = Math.round(e1RM * targetIntensity / 2.5) * 2.5
      // 新手额外降低10%，留更多余量避免受伤
      if (isBeginner) {
        suggestedWeight = Math.round(suggestedWeight * 0.9 / 2.5) * 2.5
      }
    } else if (e1RM > 0) {
      // 没有配置percent1RM的动作（如平板支撑），使用e1RM作为参考
      suggestedWeight = e1RM
    }

    // 计算目标RPE
    let targetRPE = planEx.rpeTarget
    if (isDeloadWeek) {
      targetRPE = Math.min(targetRPE, DUP_CONFIG.intensityLevels.deload.rpeTarget)
    } else if (isBeginner) {
      // 新手：RPE上限为7，避免过度疲劳
      targetRPE = Math.min(targetRPE, 7)
    } else if (levelConfig && 'rpeTarget' in levelConfig) {
      // DUP模式：根据强度等级调整RPE
      targetRPE = Math.round(((planEx.rpeTarget + (levelConfig as any).rpeTarget) / 2) * 2) / 2
    }

    // 计算目标次数
    let targetReps: [number, number] = [...planEx.repsRange] as [number, number]
    if (isBeginner) {
      // 新手：次数范围统一为8-12，不区分强度等级
      targetReps = [8, 12]
    } else if (levelConfig && 'repsModifier' in levelConfig) {
      const mod = (levelConfig as any).repsModifier
      targetReps = [
        Math.max(targetReps[0] + mod, 1),
        Math.max(targetReps[1] + mod, 2),
      ]
    }
    if (isDeloadWeek) {
      targetReps = [
        Math.min(targetReps[0], 8),
        Math.min(targetReps[1], 10),
      ]
    }

    // 计算组数
    let sets = planEx.sets
    if (isBeginner) {
      // 新手：减少1组（最少2组），降低总容量
      sets = Math.max(2, sets - 1)
    } else if (levelConfig && 'setsModifier' in levelConfig) {
      sets = Math.max(2, sets + (levelConfig as any).setsModifier)
    }
    if (isDeloadWeek) {
      sets = Math.max(2, Math.floor(sets * DUP_CONFIG.intensityLevels.deload.volumeReduction))
    }

    // 生成热身组
    const warmupSets = suggestedWeight > barWeight && suggestedWeight > 0
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

  // 强度标签
  const intensityLabel = isDeloadWeek
    ? DUP_CONFIG.intensityLevels.deload.label
    : isBeginner
      ? '中等强度'
      : (DUP_CONFIG.intensityLevels[phase as keyof typeof DUP_CONFIG.intensityLevels]?.label ?? '训练日')

  return {
    date,
    dayConfig,
    cycleDay: trainingCountInCycle,
    cyclePhase: phase,
    intensityLabel,
    exercises: dailyExercises,
    estimatedDuration,
    splitTemplateId,
    splitDayLabel,
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
 * 获取分化模板
 */
export function getSplitTemplate(templateId: string): SplitTemplate | undefined {
  return SPLIT_TEMPLATES.find(t => t.id === templateId)
}

/**
 * 获取所有可用模板
 */
export function getAllSplitTemplates(): SplitTemplate[] {
  return SPLIT_TEMPLATES
}
