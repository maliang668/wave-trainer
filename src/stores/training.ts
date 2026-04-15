import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { TrainingLog, ExerciseRecord, DailyPlan, ContextData, TrainingSet, CyclePhase, TrainingDayConfig } from '../core/types/training'
import type { CoachRecommendation } from '../core/types/algorithm'
import { cloudService, COLLECTIONS } from '../services/cloud'
import { estimate1RM } from '../core/algorithms/rm-calculator'
import { generateRPEAdjustment } from '../core/algorithms/rpe-manager'
import { getCycleInfo, getCyclePhase, generateDailyPlan } from '../core/algorithms/dup-engine'
import { evaluateDeloadNeed } from '../core/algorithms/deload-detector'
import { detectPlateau } from '../core/algorithms/plateau-detector'
import { generateReturnPlan } from '../core/algorithms/return-planner'
import { assessFatigue } from '../core/algorithms/fatigue-assessor'
import { formatDate, daysBetween } from '../utils/format'
import { useExerciseStore } from './exercise'
import type { Exercise } from '../core/types/exercise'

// 延迟获取 userStore，避免循环依赖
// eslint-disable-next-line @typescript-eslint/no-var-requires
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
  const weekInCycle = computed(() => cycleInfo.value.microWeek)
  const currentCyclePhase = computed((): CyclePhase => getCyclePhase(cycleInfo.value.microWeek))

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

  // 设置计划开始日期
  function setPlanStartDate(date: string) {
    planStartDate.value = date
    uni.setStorageSync('wt_plan_start_date', date)
  }

  // 生成今日训练计划
  function generateTodayPlan() {
    if (isTraining.value) return
    try {
      const info = getCycleInfo(planStartDate.value, formatDate(new Date()))
      const phase = getCyclePhase(info.microWeek)

      // 获取用户动作最大值
      const userStore = getUserStore()
      const exerciseMaxMap = new Map<string, number>()
      for (const [id, max] of Object.entries(userStore.exerciseMaxes)) {
        exerciseMaxMap.set(id, (max as any).estimated1RM)
      }

      // 获取动作库数据
      const exerciseStore = useExerciseStore()
      const exerciseData: Exercise[] = exerciseStore.exercises

      // 构建训练日配置（默认上肢力量日）
      const dayConfig: TrainingDayConfig = {
        dayLabel: '训练日',
        dayType: 'upper_power',
        exercises: [
          { exerciseId: 'bench_press', sets: 4, repsRange: [4, 6], rpeTarget: 8, percent1RM: 0.85 },
          { exerciseId: 'overhead_press', sets: 3, repsRange: [6, 8], rpeTarget: 7.5, percent1RM: 0.75 },
          { exerciseId: 'barbell_row', sets: 4, repsRange: [6, 8], rpeTarget: 7.5, percent1RM: 0.75 },
          { exerciseId: 'barbell_curl', sets: 3, repsRange: [8, 12], rpeTarget: 7, percent1RM: 0.65 },
          { exerciseId: 'tricep_pushdown', sets: 3, repsRange: [8, 12], rpeTarget: 7, percent1RM: 0.65 },
        ],
      }

      // 根据周期信息生成每日计划
      const plan = generateDailyPlan(
        dayConfig,
        exerciseData,
        exerciseMaxMap,
        formatDate(new Date()),
        info.macroCycle,
        info.microWeek,
        userStore.barWeight
      )
      currentPlan.value = plan
    } catch (e) {
      console.error('生成今日计划失败', e)
      currentPlan.value = null
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
      cycleWeek: activePlan.cycleWeek,
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
          // 返回调整建议（UI层使用）
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
      duration: 0, // TODO: 计算实际训练时长
    }

    // 保存到云端
    const id = await cloudService.add(COLLECTIONS.TRAINING_LOGS, log)
    trainingLogs.value.unshift({ ...log, _id: id })

    // 更新动作最大值（延迟获取 userStore，避免循环依赖）
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
    const deloadResult = evaluateDeloadNeed(trainingLogs.value, weekInCycle.value, currentCycleWeek.value)
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
    isTraining,
    currentExerciseIndex,
    currentSetIndex,
    currentContextData,
    todayLog,
    todayPlan,
    recentLogs,
    totalTrainingDays,
    currentCycleWeek,
    weekInCycle,
    currentCyclePhase,
    thisWeekLogs,
    weeklyVolume,
    weeklyAverageRPE,
    init,
    loadTrainingLogs,
    setPlanStartDate,
    generateTodayPlan,
    startTraining,
    recordSet,
    finishTraining,
    generateRecommendations,
    updateContextData,
  }
})
