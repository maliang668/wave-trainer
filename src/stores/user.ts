import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { UserProfile, UserPreferences, BodyMetric, ExerciseMax } from '../core/types/user'
import { cloudService, COLLECTIONS } from '../services/cloud'

export const useUserStore = defineStore('user', () => {
  // 状态
  const profile = ref<UserProfile | null>(null)
  const bodyMetrics = ref<BodyMetric[]>([])
  const exerciseMaxes = ref<Record<string, ExerciseMax>>({})
  const isLoading = ref(false)

  // 计算属性
  const isLoggedIn = computed(() => !!profile.value)
  const barWeight = computed(() => profile.value?.profile.barWeight || 20)
  const rpeMode = computed(() => profile.value?.preferences.rpeMode || 'beginner')
  const weightUnit = computed(() => profile.value?.preferences.weightUnit || 'kg')

  const latestWeight = computed(() => {
    if (bodyMetrics.value.length === 0) return 0
    return bodyMetrics.value[0].weight
  })

  // 初始化
  async function init() {
    isLoading.value = true
    try {
      await cloudService.init()
      await loadProfile()
      await loadExerciseMaxes()
      await loadBodyMetrics()
    } catch (e) {
      console.error('用户Store初始化失败', e)
    } finally {
      isLoading.value = false
    }
  }

  // 加载用户资料
  async function loadProfile() {
    const list = await cloudService.query(COLLECTIONS.USERS, {}, 'createdAt', 'desc', 1)
    if (list.length > 0) {
      profile.value = list[0]
    } else {
      // 创建默认用户资料
      const defaultProfile: UserProfile = {
        nickName: '训练者',
        avatarUrl: '',
        profile: {
          weight: 70,
          height: 175,
          birthday: '2000-01-01',
          gender: 'male',
          barWeight: 20,
        },
        preferences: {
          rpeMode: 'beginner',
          weightUnit: 'kg',
          restTimerDefault: 120,
          enableWarmupCalc: true,
          notificationsEnabled: true,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      const id = await cloudService.add(COLLECTIONS.USERS, defaultProfile)
      profile.value = { ...defaultProfile, _id: id, _openid: '' } as UserProfile & { _id: string }
    }
  }

  // 更新用户资料
  async function updateProfile(updates: Partial<UserProfile>) {
    if (!profile.value) return
    const updated = { ...profile.value, ...updates, updatedAt: new Date().toISOString() }
    const id = (profile.value as any)._id
    if (id) {
      await cloudService.update(COLLECTIONS.USERS, id, updated)
    }
    profile.value = updated
  }

  // 更新偏好设置
  async function updatePreferences(preferences: Partial<UserPreferences>) {
    if (!profile.value) return
    await updateProfile({ preferences: { ...profile.value.preferences, ...preferences } })
  }

  // 加载动作最大值
  async function loadExerciseMaxes() {
    const list = await cloudService.query(COLLECTIONS.EXERCISE_MAXES, {}, 'updatedAt', 'desc', 100)
    const maxMap: Record<string, ExerciseMax> = {}
    for (const item of list) {
      maxMap[item.exerciseId] = item
    }
    exerciseMaxes.value = maxMap
  }

  // 更新动作最大值
  async function updateExerciseMax(
    exerciseId: string,
    exerciseName: string,
    e1RM: number,
    confidence: 'high' | 'medium' | 'low',
    method: 'rpe_adjusted' | 'direct_test' | 'formula'
  ) {
    const existing = exerciseMaxes.value[exerciseId]
    const now = new Date().toISOString()

    const historyEntry = {
      date: now,
      e1RM,
      method,
      confidence,
    }

    if (existing) {
      // 仅当新值更高或置信度更高时更新
      if (e1RM > existing.estimated1RM || confidence === 'high') {
        const updated: ExerciseMax = {
          ...existing,
          estimated1RM: Math.max(e1RM, existing.estimated1RM),
          confidence,
          history: [historyEntry, ...existing.history].slice(0, 50),
          updatedAt: now,
        }
        const id = (existing as any)._id
        if (id) {
          await cloudService.update(COLLECTIONS.EXERCISE_MAXES, id, updated)
        }
        exerciseMaxes.value[exerciseId] = updated
      }
    } else {
      const newMax: ExerciseMax = {
        exerciseId,
        exerciseName,
        estimated1RM: e1RM,
        confidence,
        history: [historyEntry],
        updatedAt: now,
      }
      const id = await cloudService.add(COLLECTIONS.EXERCISE_MAXES, newMax)
      exerciseMaxes.value[exerciseId] = { ...newMax, _id: id } as ExerciseMax & { _id: string }
    }
  }

  // 加载身体数据
  async function loadBodyMetrics() {
    const list = await cloudService.query(COLLECTIONS.BODY_METRICS, {}, 'date', 'desc', 100)
    bodyMetrics.value = list
  }

  // 添加身体数据
  async function addBodyMetric(metric: Omit<BodyMetric, '_id' | '_openid' | 'createdAt'>) {
    const fullMetric: BodyMetric = {
      ...metric,
      createdAt: new Date().toISOString(),
    }
    const id = await cloudService.add(COLLECTIONS.BODY_METRICS, fullMetric)
    bodyMetrics.value.unshift({ ...fullMetric, _id: id } as BodyMetric & { _id: string })
  }

  return {
    profile,
    bodyMetrics,
    exerciseMaxes,
    isLoading,
    isLoggedIn,
    barWeight,
    rpeMode,
    weightUnit,
    latestWeight,
    init,
    updateProfile,
    updatePreferences,
    updateExerciseMax,
    loadExerciseMaxes,
    addBodyMetric,
    loadBodyMetrics,
  }
})
