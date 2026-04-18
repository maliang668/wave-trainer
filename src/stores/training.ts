import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { TrainingLog, ExerciseRecord, DailyPlan, ContextData, TrainingSet, CyclePhase, TrainingDayConfig, SplitTemplate } from '../core/types/training'
import type { CoachRecommendation } from '../core/types/algorithm'
import { cloudService, COLLECTIONS } from '../services/cloud'
import { estimate1RM } from '../core/algorithms/rm-calculator'
import { generateRPEAdjustment } from '../core/algorithms/rpe-manager'
import { getDayInCycle, getDUPIntensityLevel, generateDailyPlan, getCycleInfo, getCyclePhaseName, shouldDeload, getSplitTemplate } from '../core/algorithms/dup-engine'
import { evaluateDeloadNeed } from '../core/algorithms/deload-detector'
import { detectPlateau } from '../core/algorithms/plateau-detector'
import { generateReturnPlan } from '../core/algorithms/return-planner'
import { assessFatigue } from '../core/algorithms/fatigue-assessor'
import { formatDate, daysBetween } from '../utils/format'
import { useExerciseStore } from './exercise'
import type { Exercise } from '../core/types/exercise'
import { SPLIT_TEMPLATES, DEFAULT_WEIGHTS, CUSTOM_TEMPLATE_STORAGE_KEY } from '../core/constants/config'
import type { BodyProfile } from '../core/types/user'

// ===== 基于身体数据估算初始1RM（内联，避免额外模块依赖） =====
const EXERCISE_LBM_COEFFICIENTS: Record<string, { male: number; female: number }> = {
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
  leg_press: { male: 1.2, female: 0.85 },
  leg_extension: { male: 0.35, female: 0.25 },
  leg_curl: { male: 0.3, female: 0.2 },
  hip_thrust: { male: 0.8, female: 0.55 },
  calf_raise: { male: 0.35, female: 0.25 },
  plank: { male: 0, female: 0 },
  push_up: { male: 0.4, female: 0.25 },
  pull_up: { male: 0.5, female: 0.3 },
  hanging_leg_raise: { male: 0.25, female: 0.15 },
}

function estimateAllInitial1RMs(exerciseIds: string[], bodyProfile: BodyProfile): Map<string, number> {
  const result = new Map<string, number>()
  if (!bodyProfile.weight || bodyProfile.weight <= 0) return result
  const gender = bodyProfile.gender || 'male'
  const bodyFat = bodyProfile.bodyFat
  const lbm = bodyFat && bodyFat > 0 && bodyFat < 100
    ? bodyProfile.weight * (1 - bodyFat / 100)
    : bodyProfile.weight * 0.85
  let ageModifier = 1
  if (bodyProfile.age && bodyProfile.age > 30) {
    ageModifier = Math.max(0.7, 1 - ((bodyProfile.age - 30) / 10) * 0.05)
  }
  const menstruationModifier = bodyProfile.isMenstruating ? 0.93 : 1
  for (const id of exerciseIds) {
    const coeff = EXERCISE_LBM_COEFFICIENTS[id]
    if (!coeff) continue
    const genderCoeff = gender === 'female' ? coeff.female : coeff.male
    const e1rm = Math.round(lbm * genderCoeff * ageModifier * menstruationModifier / 2.5) * 2.5
    if (e1rm > 0) result.set(id, e1rm)
  }
  return result
}
// ===== 内联估算逻辑结束 =====

// 延迟获取 userStore，避免循环依赖
function getUserStore() {
  const { useUserStore } = require('./user')
  return useUserStore()
}

export const useTrainingStore = defineStore('training', () => {
  // 状态
  const trainingLogs = ref<TrainingLog[]>([])
  const currentPlan = ref<DailyPlan | null>(null)
  const planStartDate = ref<string>(formatDate(new Date()))
  const recommendations = ref<CoachRecommendation[]>([])
  const isLoading = ref(false)

  // 分化模板
  const selectedTemplateId = ref<string>('')

  // 当前训练状态
  const isTraining = ref(false)
  const currentExerciseIndex = ref(0)
  const currentSetIndex = ref(0)
  const currentContextData = ref<ContextData>({
    sleepQuality: 3,
    stressLevel: 3,
    nutritionQuality: 3,
    motivation: 3,
  })
  const todayLog = ref<Partial<TrainingLog>>({})

  // 计算属性
  const todayPlan = computed(() => currentPlan.value)
  const totalTrainingDays = computed(() => trainingLogs.value.length)
  const cycleInfo = computed(() => getCycleInfo(planStartDate.value, formatDate(new Date())))
  const currentCycleWeek = computed(() => cycleInfo.value.totalWeeks)

  // 当前选中的模板
  const selectedTemplate = computed((): SplitTemplate | undefined => {
    if (!selectedTemplateId.value) return undefined
    // 先从预设模板查找
    const preset = getSplitTemplate(selectedTemplateId.value)
    if (preset) return preset
    // 再从自定义模板查找
    if (selectedTemplateId.value === 'custom') {
      return loadCustomTemplate()
    }
    return undefined
  })

  const hasSelectedTemplate = computed(() => !!selectedTemplate.value)

  // 当前DUP强度等级
  const currentCyclePhase = computed((): CyclePhase => {
    if (!currentPlan.value) return 'rest'
    return currentPlan.value.cyclePhase
  })

  // 当前强度标签
  const currentIntensityLabel = computed((): string => {
    if (!currentPlan.value) return ''
    return currentPlan.value.intensityLabel || getCyclePhaseName(currentPlan.value.cyclePhase)
  })

  const recentLogs = computed(() => trainingLogs.value.slice(0, 5))

  const thisWeekLogs = computed(() => {
    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - now.getDay() + 1)
    weekStart.setHours(0, 0, 0, 0)
    return trainingLogs.value.filter(log => new Date(log.date) >= weekStart)
  })

  const weeklyVolume = computed(() => {
    return thisWeekLogs.value.reduce((sum, log) =>
      sum + log.exercises.reduce((s, ex) => s + ex.totalVolume, 0), 0
    )
  })

  const weeklyAverageRPE = computed(() => {
    if (thisWeekLogs.value.length === 0) return 0
    const allRPEs = thisWeekLogs.value.flatMap(log =>
      log.exercises.map(ex => ex.averageRPE)
    )
    return allRPEs.reduce((s, r) => s + r, 0) / allRPEs.length
  })

  // 初始化
  async function init() {
    isLoading.value = true
    try {
      await loadTrainingLogs()
      await loadPlanStartDate()
      await loadSelectedTemplate()
      generateTodayPlan()
      generateRecommendations()
    } catch (e) {
      console.error('训练Store初始化失败', e)
    } finally {
      isLoading.value = false
    }
  }

  // 加载训练日志
  async function loadTrainingLogs() {
    const list = await cloudService.query(COLLECTIONS.TRAINING_LOGS, {}, 'date', 'desc', 200)
    trainingLogs.value = list
  }

  // 加载计划开始日期
  async function loadPlanStartDate() {
    try {
      const data = uni.getStorageSync('wt_plan_start_date')
      if (data) {
        planStartDate.value = data
      }
    } catch { /* ignore */ }
  }

  // 加载选中的模板
  async function loadSelectedTemplate() {
    try {
      const data = uni.getStorageSync('wt_selected_template')
      if (data) {
        selectedTemplateId.value = data
      }
    } catch { /* ignore */ }
  }

  // 加载自定义模板
  function loadCustomTemplate(): SplitTemplate | undefined {
    try {
      const saved = uni.getStorageSync(CUSTOM_TEMPLATE_STORAGE_KEY)
      if (saved) {
        return JSON.parse(saved) as SplitTemplate
      }
    } catch { /* ignore */ }
    return undefined
  }

  // 设置计划开始日期
  function setPlanStartDate(date: string) {
    planStartDate.value = date
    uni.setStorageSync('wt_plan_start_date', date)
  }

  // 选择分化模板
  function selectTemplate(templateId: string) {
    selectedTemplateId.value = templateId
    uni.setStorageSync('wt_selected_template', templateId)
    // 选择模板后重置开始日期为今天
    planStartDate.value = formatDate(new Date())
    uni.setStorageSync('wt_plan_start_date', planStartDate.value)
    // 如果今天是休息日，自动调整到下一个训练日
    adjustStartDateToTrainingDay()
    // 立即生成今日计划
    generateTodayPlan()
  }

  // 调整开始日期，确保第一天是训练日而非休息日
  function adjustStartDateToTrainingDay() {
    const template = selectedTemplate.value
    if (!template) return
    const today = new Date(planStartDate.value)
    // 检查最多往后推7天
    for (let i = 0; i < 7; i++) {
      const checkDate = new Date(today)
      checkDate.setDate(today.getDate() + i)
      const dateStr = formatDate(checkDate)
      const { splitDay } = getDayInCycle(template, planStartDate.value, dateStr)
      if (splitDay.type !== 'rest') {
        if (i > 0) {
          planStartDate.value = dateStr
          uni.setStorageSync('wt_plan_start_date', dateStr)
        }
        return
      }
    }
  }

  // 生成今日训练计划
  function generateTodayPlan() {
    if (isTraining.value) return

    // 如果没有选择模板，不生成计划
    if (!selectedTemplate.value) {
      currentPlan.value = null
      return
    }

    try {
      const template = selectedTemplate.value!
      const info = getCycleInfo(planStartDate.value, formatDate(new Date()))
      const { dayIndex, splitDay, trainingCountInCycle } = getDayInCycle(
        template,
        planStartDate.value,
        formatDate(new Date())
      )

      // 如果今天是休息日
      if (splitDay.type === 'rest') {
        currentPlan.value = null
        return
      }

      // 获取用户动作最大值
      const userStore = getUserStore()
      const exerciseMaxMap = new Map<string, number>()
      for (const [id, max] of Object.entries(userStore.exerciseMaxes)) {
        exerciseMaxMap.set(id, (max as any).estimated1RM)
      }

      // 构建训练日配置（提前，因为后面需要用到）
      const dayConfig: TrainingDayConfig = {
        dayLabel: splitDay.label,
        dayType: splitDay.type,
        exercises: splitDay.exercises,
      }

      // 为没有e1RM数据的动作估算初始重量
      // 优先使用身体数据公式估算，其次使用硬编码默认值
      const userProfile = userStore.profile?.profile
      if (userProfile && userProfile.weight > 0) {
        // 有身体数据：用公式估算
        const allExerciseIds = dayConfig.exercises.map(e => e.exerciseId)
        const estimatedMaxes = estimateAllInitial1RMs(allExerciseIds, userProfile)
        for (const [id, e1rm] of estimatedMaxes.entries()) {
          if (!exerciseMaxMap.has(id)) {
            exerciseMaxMap.set(id, e1rm)
          }
        }
      }
      // 补充：仍没有数据的动作用硬编码默认值
      for (const [id, weight] of Object.entries(DEFAULT_WEIGHTS)) {
        if (!exerciseMaxMap.has(id)) {
          exerciseMaxMap.set(id, weight)
        }
      }

      // 获取动作库数据
      const exerciseStore = useExerciseStore()
      const exerciseData: Exercise[] = exerciseStore.exercises

      // 判断是否为新手模板
      const isBeginner = template.level === 'beginner'

      // 判断是否为减负周
      const isDeloadWeek = shouldDeload(info.macroCycle, info.totalWeeks)

      // 生成每日计划
      const plan = generateDailyPlan(
        dayConfig,
        exerciseData,
        exerciseMaxMap,
        formatDate(new Date()),
        info.macroCycle,
        trainingCountInCycle,
        isBeginner,
        isDeloadWeek,
        userStore.barWeight,
        template.id,
        splitDay.label
      )
      currentPlan.value = plan
    } catch (e) {
      console.error('生成今日计划失败', e)
      currentPlan.value = null
    }
  }

  // 强制为指定训练日生成计划（休息日仍要训练时调用）
  function forceGeneratePlan(splitDay: any) {
    if (!selectedTemplate.value) return

    const template = selectedTemplate.value
    const userStore = getUserStore()
    const exerciseStore = useExerciseStore()
    const info = getCycleInfo(planStartDate.value, formatDate(new Date()))

    const exerciseMaxMap = new Map<string, number>()
    for (const [id, max] of Object.entries(userStore.exerciseMaxes)) {
      exerciseMaxMap.set(id, (max as any).estimated1RM)
    }
    const userProfile = userStore.profile?.profile
    if (userProfile && userProfile.weight > 0) {
      const allIds = splitDay.exercises.map((e: any) => e.exerciseId)
      const estimated = estimateAllInitial1RMs(allIds, userProfile)
      for (const [id, e1rm] of estimated.entries()) {
        if (!exerciseMaxMap.has(id)) exerciseMaxMap.set(id, e1rm)
      }
    }
    for (const [id, weight] of Object.entries(DEFAULT_WEIGHTS)) {
      if (!exerciseMaxMap.has(id)) exerciseMaxMap.set(id, weight)
    }

    const dayConfig: TrainingDayConfig = {
      dayLabel: splitDay.label,
      dayType: splitDay.type,
      exercises: splitDay.exercises,
    }

    const isBeginner = template.level === 'beginner'
    const plan = generateDailyPlan(
      dayConfig,
      exerciseStore.exercises,
      exerciseMaxMap,
      formatDate(new Date()),
      info.macroCycle,
      1,
      isBeginner,
      false,
      userStore.barWeight,
      template.id,
      splitDay.label
    )
    currentPlan.value = plan
  }

  // 更新训练日的动作列表（用户自定义选择后调用）
  function updateDayExercises(exercises: any[]) {
    if (!currentPlan.value) return

    try {
      const template = selectedTemplate.value
      if (!template) return

      const info = getCycleInfo(planStartDate.value, formatDate(new Date()))
      const { trainingCountInCycle } = getDayInCycle(
        template,
        planStartDate.value,
        formatDate(new Date())
      )

      const userStore = getUserStore()
      const exerciseStore = useExerciseStore()

      // 获取用户动作最大值
      const exerciseMaxMap = new Map<string, number>()
      for (const [id, max] of Object.entries(userStore.exerciseMaxes)) {
        exerciseMaxMap.set(id, (max as any).estimated1RM)
      }
      // 为没有e1RM数据的动作估算初始重量
      const userProfile = userStore.profile?.profile
      if (userProfile && userProfile.weight > 0) {
        const allExerciseIds = exercises.map((e: any) => e.exerciseId)
        const estimatedMaxes = estimateAllInitial1RMs(allExerciseIds, userProfile)
        for (const [id, e1rm] of estimatedMaxes.entries()) {
          if (!exerciseMaxMap.has(id)) {
            exerciseMaxMap.set(id, e1rm)
          }
        }
      }
      for (const [id, weight] of Object.entries(DEFAULT_WEIGHTS)) {
        if (!exerciseMaxMap.has(id)) {
          exerciseMaxMap.set(id, weight)
        }
      }

      // 用新的动作列表构建 dayConfig
      const dayConfig: TrainingDayConfig = {
        dayLabel: currentPlan.value.dayConfig.dayLabel,
        dayType: currentPlan.value.dayConfig.dayType,
        exercises,
      }

      const isBeginner = template.level === 'beginner'
      const isDeloadWeek = shouldDeload(info.macroCycle, info.totalWeeks)

      // 重新生成计划
      const plan = generateDailyPlan(
        dayConfig,
        exerciseStore.exercises,
        exerciseMaxMap,
        formatDate(new Date()),
        info.macroCycle,
        trainingCountInCycle,
        isBeginner,
        isDeloadWeek,
        userStore.barWeight,
        template.id,
        currentPlan.value.splitDayLabel
      )
      currentPlan.value = plan
    } catch (e) {
      console.error('更新训练动作失败', e)
    }
  }

  // 开始训练（使用预生成的计划）
  function startTraining(plan?: DailyPlan) {
    const activePlan = plan || currentPlan.value
    if (!activePlan) return
    currentPlan.value = activePlan
    isTraining.value = true
    currentExerciseIndex.value = 0
    currentSetIndex.value = 0
    todayLog.value = {
      date: formatDate(new Date()),
      splitTemplateId: activePlan.splitTemplateId,
      cycleDay: activePlan.cycleDay,
      cyclePhase: activePlan.cyclePhase,
      exercises: activePlan.exercises.map(ex => ({
        exerciseId: ex.exerciseId,
        name: ex.name,
        muscleGroup: ex.muscleGroup,
        sets: [],
        estimated1RM: 0,
        averageRPE: 0,
        totalVolume: 0,
      })),
      contextData: currentContextData.value,
      duration: 0,
      createdAt: new Date().toISOString(),
    }
  }

  // 记录一组训练
  function recordSet(exerciseIndex: number, set: TrainingSet) {
    if (!todayLog.value.exercises) return
    const exercise = todayLog.value.exercises[exerciseIndex]
    if (!exercise) return

    exercise.sets.push(set)

    // 如果是正式组（非热身），计算e1RM
    if (!set.isWarmup && set.completed) {
      const result = estimate1RM(set.weight, set.reps, set.rpe)
      if (result.confidence !== 'low') {
        exercise.estimated1RM = Math.max(exercise.estimated1RM, result.estimated1RM)
      }
    }

    // 更新平均RPE和总容量
    const completedSets = exercise.sets.filter(s => !s.isWarmup && s.completed)
    if (completedSets.length > 0) {
      exercise.averageRPE = completedSets.reduce((s, set) => s + set.rpe, 0) / completedSets.length
      exercise.totalVolume = completedSets.reduce((s, set) => s + set.weight * set.reps, 0)
    }

    // RPE自调节：为下一组提供建议
    if (!set.isWarmup && set.completed && currentPlan.value) {
      const planEx = currentPlan.value.exercises[exerciseIndex]
      if (planEx) {
        const adjustment = generateRPEAdjustment(set.weight, set.rpe, planEx.targetRPE)
        if (adjustment.adjustmentPercent !== 0) {
          return adjustment
        }
      }
    }
    return null
  }

  // 完成训练
  async function finishTraining() {
    if (!todayLog.value.exercises) return

    const log: TrainingLog = {
      ...todayLog.value as TrainingLog,
      duration: 0,
    }

    // 保存到云端
    const id = await cloudService.add(COLLECTIONS.TRAINING_LOGS, log)
    trainingLogs.value.unshift({ ...log, _id: id })

    // 更新动作最大值
    const userStore = getUserStore()
    for (const ex of log.exercises) {
      if (ex.estimated1RM > 0) {
        await userStore.updateExerciseMax(
          ex.exerciseId,
          ex.name,
          ex.estimated1RM,
          ex.averageRPE >= 8 ? 'high' : 'medium',
          'rpe_adjusted'
        )
      }
    }

    // 重置状态
    isTraining.value = false
    todayLog.value = {}
    currentPlan.value = null

    // 重新生成建议
    generateRecommendations()
  }

  // 生成智能建议
  function generateRecommendations() {
    const recs: CoachRecommendation[] = []

    // 检查停训回归
    if (trainingLogs.value.length > 0) {
      const lastTrainingDate = trainingLogs.value[0].date
      const daysSince = daysBetween(lastTrainingDate, new Date())
      if (daysSince > 7) {
        const plan = generateReturnPlan(daysSince)
        recs.push({
          priority: 1,
          type: 'return_plan',
          title: '欢迎回归！',
          message: `停训${Math.ceil(daysSince / 7)}周后的恢复方案已生成`,
          action: plan,
        })
      }
    }

    // 检查疲劳
    const fatigue = assessFatigue(trainingLogs.value, {
      sleep: currentContextData.value.sleepQuality,
      stress: currentContextData.value.stressLevel,
      nutrition: currentContextData.value.nutritionQuality,
    })
    if (fatigue.level === 'high') {
      recs.push({
        priority: 2,
        type: 'fatigue_warning',
        title: '疲劳预警',
        message: fatigue.advice,
        action: { fatigue },
      })
    }

    // 检查平台期
    if (trainingLogs.value.length >= 5) {
      const plateau = detectPlateau(trainingLogs.value, 'bench_press')
      if (plateau.detected) {
        recs.push({
          priority: 3,
          type: 'plateau_break',
          title: '平台期检测',
          message: `检测到${plateau.diagnosis}型平台期`,
          action: plateau.recommendation,
        })
      }
    }

    // 检查减负周
    const deloadResult = evaluateDeloadNeed(trainingLogs.value, currentCycleWeek.value, currentCycleWeek.value)
    if (deloadResult.triggers.length > 0) {
      recs.push({
        priority: 4,
        type: 'deload_reminder',
        title: '减负周建议',
        message: deloadResult.triggers[0].message,
        action: { deloadPlan: deloadResult.plan },
      })
    }

    recommendations.value = recs.sort((a, b) => a.priority - b.priority)
  }

  // 更新情境数据
  function updateContextData(data: Partial<ContextData>) {
    currentContextData.value = { ...currentContextData.value, ...data }
  }

  return {
    trainingLogs,
    currentPlan,
    planStartDate,
    recommendations,
    isLoading,
    selectedTemplateId,
    selectedTemplate,
    hasSelectedTemplate,
    isTraining,
    currentExerciseIndex,
    currentSetIndex,
    currentContextData,
    todayLog,
    todayPlan,
    recentLogs,
    totalTrainingDays,
    currentCycleWeek,
    currentCyclePhase,
    currentIntensityLabel,
    thisWeekLogs,
    weeklyVolume,
    weeklyAverageRPE,
    init,
    loadTrainingLogs,
    setPlanStartDate,
    selectTemplate,
    generateTodayPlan,
    forceGeneratePlan,
    updateDayExercises,
    startTraining,
    recordSet,
    finishTraining,
    generateRecommendations,
    updateContextData,
  }
})
