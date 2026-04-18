<template>
  <view class="page">
    <!-- 调试入口：快速点击3次或长按 -->
    <view class="debug-trigger" @tap="onHeaderTap" @longpress="onLongPressHeader">
      <text class="debug-trigger-text">训练</text>
    </view>

    <!-- 非训练模式 -->
    <view v-if="!trainingStore.isTraining">

      <!-- 未选择模板：引导选择 -->
      <view class="card onboard-card" v-if="!trainingStore.hasSelectedTemplate">
        <text class="onboard-emoji">🏋️</text>
        <text class="onboard-title">选择你的训练方案</text>
        <text class="onboard-desc">根据你的训练经验，选择合适的分化训练方案。系统会根据DUP科学周期化自动安排每日训练内容。</text>
        <view class="btn-primary onboard-btn" @tap="goToSplitPicker">
          选择训练方案
        </view>
      </view>

      <!-- 已选择模板 -->
      <template v-else>
        <!-- 今日计划卡片 -->
        <view class="card plan-card" v-if="trainingStore.todayPlan">
          <view class="plan-header" @longpress="onLongPressHeader">
            <view class="plan-title">
              <text class="phase-tag" :style="{ background: phaseColor }">
                {{ trainingStore.currentIntensityLabel }}
              </text>
              <text class="plan-week">{{ trainingStore.todayPlan.splitDayLabel || '训练日' }}</text>
            </view>
            <view class="plan-header-right">
              <text class="plan-date">{{ todayDate }}</text>
              <text class="switch-plan" @tap="goToSplitPicker">切换方案</text>
            </view>
          </view>
          <view class="plan-meta">
            <text class="meta-item">⏱️ 预计 {{ trainingStore.todayPlan.estimatedDuration }}分钟</text>
            <text class="meta-item">💪 {{ trainingStore.todayPlan.exercises.length }}个动作</text>
            <text class="meta-item" v-if="trainingStore.selectedTemplate">
              📋 {{ trainingStore.selectedTemplate.name }}
            </text>
          </view>
          <text class="estimation-hint" v-if="estimationHint">{{ estimationHint }}</text>
        </view>

        <!-- 休息日 -->
        <view class="card rest-card" v-else>
          <text class="rest-emoji">😴</text>
          <text class="rest-text">今天是休息日</text>
          <text class="rest-sub">好好恢复，为下次训练蓄力</text>
          <text class="rest-sub" v-if="trainingStore.selectedTemplate">
            当前方案：{{ trainingStore.selectedTemplate.name }}
          </text>
          <view class="rest-actions">
            <view class="btn-secondary rest-switch-btn" @tap="goToSplitPicker">
              切换方案
            </view>
            <view class="btn-primary rest-train-btn" @tap="trainAnyway">
              仍要训练
            </view>
          </view>
        </view>

        <!-- 动作列表 -->
        <view v-if="trainingStore.todayPlan" class="exercise-list">
          <view class="section-title">今日训练</view>
          <view class="plan-actions">
            <view class="btn-secondary btn-sm" @tap="resetToDefaultPlan" v-if="isCustomPlan">
              恢复默认
            </view>
          </view>
          <view
            v-for="(ex, index) in trainingStore.todayPlan.exercises"
            :key="ex.exerciseId + '-' + index"
            class="card exercise-card"
          >
            <view class="ex-header">
              <text class="ex-name">{{ ex.name }}</text>
              <view class="ex-header-right">
                <text class="ex-muscle">{{ MUSCLE_GROUP_NAMES[ex.muscleGroup] || ex.muscleGroup }}</text>
                <view class="ex-action-btns">
                  <view class="ex-btn insert" @tap="insertExerciseAt(index)">
                    <text>+</text>
                  </view>
                  <view class="ex-btn remove" @tap="removeExerciseAt(index)">
                    <text>−</text>
                  </view>
                </view>
              </view>
            </view>
            <view class="ex-details">
              <view class="ex-detail-item">
                <text class="detail-label">重量</text>
                <text class="detail-value text-primary">{{ ex.suggestedWeight }}kg</text>
                <text class="detail-hint" v-if="ex.suggestedWeight > 20">含杠铃</text>
              </view>
              <view class="ex-detail-item">
                <text class="detail-label">组数</text>
                <text class="detail-value">{{ ex.sets }}组</text>
              </view>
              <view class="ex-detail-item">
                <text class="detail-label">次数</text>
                <text class="detail-value">{{ ex.targetReps[0] }}-{{ ex.targetReps[1] }}</text>
              </view>
              <view class="ex-detail-item">
                <text class="detail-label">RPE</text>
                <text class="detail-value text-warning">{{ ex.targetRPE }}</text>
              </view>
            </view>
            <!-- 热身组 -->
            <view v-if="ex.warmupSets.length > 0" class="warmup-section">
              <text class="warmup-title">🔥 热身</text>
              <view v-for="(ws, wi) in ex.warmupSets" :key="wi" class="warmup-set">
                <text>{{ ws.weight }}kg × {{ ws.reps }}</text>
              </view>
            </view>
          </view>

          <!-- 底部添加动作按钮 -->
          <view class="btn-secondary add-exercise-bottom" @tap="appendExercise">
            + 添加其他动作
          </view>
        </view>

        <!-- 开始训练按钮 -->
        <view v-if="trainingStore.todayPlan" class="start-btn-wrapper">
          <view class="btn-primary start-btn" @tap="startTraining">
            开始训练
          </view>
        </view>
      </template>

      <!-- 力量测试入口（始终显示） -->
      <view class="card strength-test-entry" @tap="goToStrengthTest" style="margin-top: 24rpx;">
        <view class="ste-header">
          <text class="ste-icon">💪</text>
          <view class="ste-info">
            <text class="ste-title">力量测试</text>
            <text class="ste-desc">测试实际力量，让训练重量更准确</text>
          </view>
        </view>
        <text class="ste-arrow">›</text>
      </view>

      <!-- 最近训练 -->
      <view class="recent-section" v-if="recentLogs.length > 0">
        <view class="section-title">最近训练</view>
        <view v-for="log in recentLogs" :key="log._id" class="card log-card">
          <view class="log-header">
            <text class="log-date">{{ log.date }}</text>
            <text class="log-phase" :style="{ background: getPhaseColor(log.cyclePhase) + '33', color: getPhaseColor(log.cyclePhase) }">
              {{ getCyclePhaseName(log.cyclePhase) }}
            </text>
          </view>
          <view class="log-exercises">
            <text v-for="ex in log.exercises" :key="ex.exerciseId" class="log-ex-name">
              {{ ex.name }}
              <text class="log-ex-rpe" :class="getRPEColor(ex.averageRPE)">RPE {{ ex.averageRPE.toFixed(1) }}</text>
            </text>
          </view>
          <view class="log-stats">
            <text>容量 {{ formatVolume(log.exercises.reduce((s, e) => s + e.totalVolume, 0)) }}kg</text>
            <text>⏱️ {{ log.duration || 0 }}分钟</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 训练执行模式 -->
    <view v-else class="training-mode">
      <!-- 训练进度条 -->
      <view class="training-progress">
        <view class="progress-bar">
          <view class="progress-fill" :style="{ width: progressPercent + '%' }"></view>
        </view>
        <text class="progress-text">{{ completedSets }} / {{ totalSets }} 组</text>
      </view>

      <!-- 当前动作 -->
      <view v-if="currentExercise" class="card current-exercise">
        <view class="current-ex-header">
          <text class="current-ex-name">{{ currentExercise.name }}</text>
          <text class="current-ex-target">目标 RPE {{ currentExercise.targetRPE }}</text>
        </view>

        <!-- 已完成的组 -->
        <view v-if="completedSetsForExercise.length > 0" class="completed-sets">
          <view v-for="set in completedSetsForExercise" :key="set.setNumber" class="set-row completed">
            <text class="set-number">✅ 第{{ set.setNumber }}组</text>
            <text>{{ set.weight }}kg × {{ set.reps }} @ RPE {{ set.rpe }}</text>
          </view>
        </view>

        <!-- 当前组输入 -->
        <view class="set-input-area">
          <text class="set-label">第{{ nextSetNumber }}组</text>

          <view class="input-row">
            <view class="input-group">
              <text class="input-label">重量(kg)</text>
              <view class="weight-input">
                <view class="weight-btn" @tap="adjustWeight(-2.5)">-2.5</view>
                <input
                  type="digit"
                  :value="currentWeight"
                  class="weight-field"
                  @input="onWeightInput"
                  @confirm="focusReps"
                />
                <view class="weight-btn" @tap="adjustWeight(2.5)">+2.5</view>
              </view>
            </view>

            <view class="input-group">
              <text class="input-label">次数</text>
              <input
                type="number"
                :value="currentReps"
                class="reps-field"
                @input="onRepsInput"
                @confirm="focusRPE"
              />
            </view>
          </view>

          <!-- RPE输入 -->
          <view class="rpe-input-area">
            <text class="input-label">RPE ({{ rpeDescription }})</text>
            <!-- 新手模式 -->
            <view v-if="userStore.rpeMode === 'beginner'" class="rpe-beginner">
              <view
                v-for="(level, i) in beginnerLevels"
                :key="i"
                class="rpe-level-btn"
                :class="{ active: selectedBeginnerLevel === i }"
                @tap="selectBeginnerRPE(i)"
              >
                <text class="rpe-emoji">{{ level.emoji }}</text>
                <text class="rpe-label">{{ level.label }}</text>
              </view>
            </view>
            <!-- 进阶模式 -->
            <view v-else class="rpe-advanced">
              <slider
                :min="5"
                :max="10"
                :step="0.5"
                :value="currentRPE"
                activeColor="#0A84FF"
                backgroundColor="#2C2C2E"
                block-size="20"
                @change="onRPEChange"
              />
              <text class="rpe-value">RPE {{ currentRPE }}</text>
            </view>
          </view>

          <!-- 完成按钮 -->
          <view class="btn-primary complete-btn" @tap="completeSet">
            完成这组
          </view>

          <!-- RPE调整建议 -->
          <view v-if="rpeAdvice" class="advice-card" :class="rpeAdviceClass">
            <text class="advice-text">{{ rpeAdvice }}</text>
          </view>
        </view>
      </view>

      <!-- 组间休息计时器 -->
      <view v-if="showTimer" class="timer-card card">
        <text class="timer-label">组间休息</text>
        <text class="timer-display">{{ timerDisplay }}</text>
        <view class="timer-controls">
          <view class="btn-secondary" @tap="skipTimer">跳过</view>
          <view class="btn-primary" @tap="toggleTimer">
            {{ timerRunning ? '暂停' : '开始' }}
          </view>
        </view>
      </view>

      <!-- 完成训练按钮 -->
      <view class="finish-btn-wrapper">
        <view class="btn-secondary finish-btn" @tap="finishTraining">
          结束训练
        </view>
      </view>
    </view>

    <!-- 开发者调试面板 -->
    <DebugPanel :visible="showDebugPanel" @close="showDebugPanel = false" />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useTrainingStore } from '../../stores/training'
import { useUserStore } from '../../stores/user'
import { useExerciseStore } from '../../stores/exercise'
import { getRPEDescription } from '../../core/algorithms/rpe-manager'
import { getCyclePhaseName, getPhaseColor } from '../../core/algorithms/dup-engine'
import { RPE_CONFIG } from '../../core/constants/config'
import { formatVolume, formatDate } from '../../utils/format'
import { MUSCLE_GROUP_NAMES } from '../../core/types/exercise'
import type { TrainingSet } from '../../core/types/training'
import DebugPanel from '../../components/debug-panel/debug-panel.vue'

const trainingStore = useTrainingStore()
const userStore = useUserStore()
const exerciseStore = useExerciseStore()

// 日期
const todayDate = formatDate(new Date())

// 当前强度等级颜色
const phaseColor = computed(() => {
  if (!trainingStore.todayPlan) return '#888'
  return getPhaseColor(trainingStore.todayPlan.cyclePhase)
})

// 估算说明（新用户显示"基于体重XXkg估算"）
const estimationHint = computed(() => {
  const profile = userStore.profile?.profile
  if (!profile || !profile.weight) return ''
  // 如果没有任何训练记录，显示估算说明
  if (trainingStore.trainingLogs.length > 0) return ''
  const parts = [`体重 ${profile.weight}kg`]
  if (profile.bodyFat) parts.push(`体脂 ${profile.bodyFat}%`)
  if (profile.age) parts.push(`年龄 ${profile.age}岁`)
  parts.push(`性别 ${profile.gender === 'female' ? '女' : '男'}`)
  return '📊 基于 ' + parts.join('，') + ' 估算（训练后自动校准）'
})

// 最近训练
const recentLogs = computed(() => trainingStore.trainingLogs.slice(0, 5))

// 训练执行状态
const currentWeight = ref('')
const currentReps = ref('')
const currentRPE = ref(7.5)
const selectedBeginnerLevel = ref(-1)
const rpeAdvice = ref('')
const rpeAdviceClass = ref('')

// 计时器
const showTimer = ref(false)
const timerSeconds = ref(120)
const timerRunning = ref(false)
let timerInterval: ReturnType<typeof setInterval> | null = null

// 当前动作
const currentExercise = computed(() => {
  if (!trainingStore.todayPlan) return null
  return trainingStore.todayPlan.exercises[trainingStore.currentExerciseIndex] || null
})

// 进度
const totalSets = computed(() => {
  if (!trainingStore.todayPlan) return 0
  return trainingStore.todayPlan.exercises.reduce((sum, ex) => sum + ex.sets, 0)
})

const completedSets = computed(() => {
  if (!trainingStore.todayLog.exercises) return 0
  return trainingStore.todayLog.exercises.reduce((sum, ex) => sum + (ex.sets?.filter((s: TrainingSet) => !s.isWarmup && s.completed).length || 0), 0)
})

const progressPercent = computed(() => {
  if (totalSets.value === 0) return 0
  return Math.round((completedSets.value / totalSets.value) * 100)
})

const completedSetsForExercise = computed(() => {
  if (!trainingStore.todayLog.exercises) return []
  const ex = trainingStore.todayLog.exercises[trainingStore.currentExerciseIndex]
  return ex ? ex.sets.filter(s => !s.isWarmup && s.completed) : []
})

const nextSetNumber = computed(() => completedSetsForExercise.value.length + 1)

// RPE描述
const rpeDescription = computed(() => getRPEDescription(currentRPE.value))

// 新手RPE档位
const beginnerLevels = RPE_CONFIG.beginnerLevels

// RPE颜色
function getRPEColor(rpe: number): string {
  if (rpe >= 9) return 'text-danger'
  if (rpe >= 8) return 'text-warning'
  return 'text-success'
}

// 跳转到力量测试
function goToStrengthTest() {
  uni.navigateTo({ url: '/pages/strength-test/strength-test' })
}

// 跳转到模板选择页
function goToSplitPicker() {
  uni.navigateTo({ url: '/pages/split-picker/split-picker' })
}

// 休息日仍要训练：让用户选择训练日类型，临时生成计划
function trainAnyway() {
  const template = trainingStore.selectedTemplate
  if (!template) {
    goToSplitPicker()
    return
  }
  // 获取模板中所有非休息日
  const trainingDays = template.days.filter(d => d.type !== 'rest')
  if (trainingDays.length === 0) return

  // 如果只有一个训练日类型，直接用
  if (trainingDays.length === 1) {
    trainingStore.forceGeneratePlan(trainingDays[0])
    return
  }

  // 多个训练日类型，让用户选择
  uni.showActionSheet({
    itemList: trainingDays.map(d => d.label),
    success: (res) => {
      trainingStore.forceGeneratePlan(trainingDays[res.tapIndex])
    },
  })
}

// 开始训练
function startTraining() {
  trainingStore.startTraining()
  if (currentExercise.value) {
    currentWeight.value = String(currentExercise.value.suggestedWeight)
    currentReps.value = String(currentExercise.value.targetReps[0])
    currentRPE.value = currentExercise.value.targetRPE
  }
}

// 调整重量
function adjustWeight(delta: number) {
  const w = parseFloat(currentWeight.value) || 0
  currentWeight.value = String(Math.max(0, w + delta))
}

// 手动输入重量
function onWeightInput(e: any) {
  currentWeight.value = e.detail.value
}

// 手动输入次数
function onRepsInput(e: any) {
  currentReps.value = e.detail.value
}

// 新手RPE选择
function selectBeginnerRPE(level: number) {
  selectedBeginnerLevel.value = level
  const rpeMap = [5.5, 7.5, 9.5]
  currentRPE.value = rpeMap[level] || 7.5
}

// RPE滑块变化
function onRPEChange(e: any) {
  currentRPE.value = e.detail.value
}

// 完成一组
function completeSet() {
  const weight = parseFloat(currentWeight.value)
  const reps = parseInt(currentReps.value)
  const rpe = currentRPE.value

  if (!weight || !reps || weight <= 0 || reps <= 0) {
    uni.showToast({ title: '请输入有效的重量和次数', icon: 'none' })
    return
  }

  const set: TrainingSet = {
    setNumber: nextSetNumber.value,
    weight,
    reps,
    rpe,
    isWarmup: false,
    completed: true,
  }

  // 记录这组
  const adjustment = trainingStore.recordSet(trainingStore.currentExerciseIndex, set)

  // 显示RPE调整建议
  if (adjustment && adjustment.adjustmentPercent !== 0) {
    rpeAdvice.value = adjustment.reason
    rpeAdviceClass.value = adjustment.adjustmentPercent > 0 ? 'advice-increase' : 'advice-decrease'
    if (adjustment.suggestedWeight !== weight) {
      currentWeight.value = String(adjustment.suggestedWeight)
    }
  } else {
    rpeAdvice.value = ''
  }

  // 检查是否完成当前动作的所有组
  if (currentExercise.value && completedSetsForExercise.value.length >= currentExercise.value.sets) {
    moveToNextExercise()
  } else {
    showTimer.value = true
    timerSeconds.value = userStore.profile?.preferences.restTimerDefault || 120
    startTimer()
  }

  selectedBeginnerLevel.value = -1
}

// 移动到下一个动作
function moveToNextExercise() {
  const nextIndex = trainingStore.currentExerciseIndex + 1
  if (trainingStore.todayPlan && nextIndex < trainingStore.todayPlan.exercises.length) {
    trainingStore.currentExerciseIndex = nextIndex
    const nextEx = trainingStore.todayPlan.exercises[nextIndex]
    currentWeight.value = String(nextEx.suggestedWeight)
    currentReps.value = String(nextEx.targetReps[0])
    currentRPE.value = nextEx.targetRPE
    rpeAdvice.value = ''
    showTimer.value = false
    stopTimer()
  } else {
    finishTraining()
  }
}

// 计时器
function startTimer() {
  stopTimer()
  timerRunning.value = true
  timerInterval = setInterval(() => {
    if (timerSeconds.value > 0) {
      timerSeconds.value--
    } else {
      stopTimer()
      uni.vibrateShort()
      uni.showToast({ title: '休息结束！', icon: 'none' })
    }
  }, 1000)
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
  timerRunning.value = false
}

function toggleTimer() {
  if (timerRunning.value) {
    stopTimer()
  } else {
    startTimer()
  }
}

function skipTimer() {
  stopTimer()
  showTimer.value = false
}

const timerDisplay = computed(() => {
  const mins = Math.floor(timerSeconds.value / 60)
  const secs = timerSeconds.value % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
})

// 结束训练
function finishTraining() {
  stopTimer()
  uni.showModal({
    title: '结束训练？',
    content: `已完成 ${completedSets.value} 组训练`,
    success: (res) => {
      if (res.confirm) {
        trainingStore.finishTraining()
        uni.showToast({ title: '训练已保存！', icon: 'success' })
      }
    },
  })
}

// 输入焦点
function focusReps() { /* uni-app input focus */ }
function focusRPE() { /* uni-app input focus */ }

// 自定义计划
const isCustomPlan = ref(false)
const showDebugPanel = ref(false)
let tapCount = 0
let tapTimer: any = null

// 快速点击标题区域3次打开调试面板
function onHeaderTap() {
  tapCount++
  if (tapTimer) clearTimeout(tapTimer)
  tapTimer = setTimeout(() => { tapCount = 0 }, 800)
  if (tapCount >= 3) {
    tapCount = 0
    showDebugPanel.value = true
  }
}

// 长按也可以打开
function onLongPressHeader() {
  showDebugPanel.value = true
}
const insertAtIndex = ref(-1) // -1 表示追加到末尾

// 在指定位置后插入动作
function insertExerciseAt(index: number) {
  insertAtIndex.value = index
  uni.navigateTo({ url: '/pages/exercise-picker/exercise-picker' })
}

// 在末尾追加动作
function appendExercise() {
  insertAtIndex.value = -1
  uni.navigateTo({ url: '/pages/exercise-picker/exercise-picker' })
}

// 删除指定位置的动作
function removeExerciseAt(index: number) {
  if (!trainingStore.todayPlan) return
  const currentExercises = trainingStore.todayPlan.exercises.map(ex => ({
    exerciseId: ex.exerciseId,
    sets: ex.sets,
    repsRange: ex.targetReps,
    rpeTarget: ex.targetRPE,
    percent1RM: 0.75, // 保留原值不影响
  }))
  currentExercises.splice(index, 1)
  isCustomPlan.value = true
  rebuildPlanWithExercises(currentExercises)
}

// 动作选择完成回调（从全局变量读取）
function onExercisesSelected(ids: string[]) {
  if (!ids || ids.length === 0) return
  isCustomPlan.value = true

  // 获取当前计划中的动作配置
  const currentExercises = trainingStore.todayPlan
    ? trainingStore.todayPlan.exercises.map(ex => ({
        exerciseId: ex.exerciseId,
        sets: ex.sets,
        repsRange: ex.targetReps,
        rpeTarget: ex.targetRPE,
        percent1RM: 0.75,
      }))
    : []

  // 为新选择的动作生成配置
  const exerciseStoreLocal = useExerciseStore()
  const newExercises = ids.map(id => {
    const ex = exerciseStoreLocal.getExercise(id)
    const isCompound = ex?.category === 'compound'
    return {
      exerciseId: id,
      sets: isCompound ? 4 : 3,
      repsRange: isCompound ? [4, 8] : [8, 12] as [number, number],
      rpeTarget: isCompound ? 7.5 : 7,
      percent1RM: isCompound ? 0.75 : 0.65,
    }
  })

  // 根据插入位置合并
  let mergedExercises: any[]
  if (insertAtIndex.value >= 0 && insertAtIndex.value < currentExercises.length) {
    // 在指定位置后插入
    mergedExercises = [
      ...currentExercises.slice(0, insertAtIndex.value + 1),
      ...newExercises,
      ...currentExercises.slice(insertAtIndex.value + 1),
    ]
  } else {
    // 追加到末尾
    mergedExercises = [...currentExercises, ...newExercises]
  }

  rebuildPlanWithExercises(mergedExercises)
}

// 用动作配置列表重建训练计划
function rebuildPlanWithExercises(exercises: any[]) {
  if (exercises.length === 0) {
    trainingStore.generateTodayPlan()
    return
  }
  trainingStore.updateDayExercises(exercises)
}

// 恢复默认计划
function resetToDefaultPlan() {
  isCustomPlan.value = false
  insertAtIndex.value = -1
  trainingStore.generateTodayPlan()
}

// 生命周期
onShow(() => {
  if (trainingStore.isTraining) return

  // 检查是否有从动作选择器返回的结果
  const app = getApp() as any
  if (app.exercisePickerResult && Array.isArray(app.exercisePickerResult)) {
    const ids = app.exercisePickerResult
    app.exercisePickerResult = null // 清除，只用一次
    onExercisesSelected(ids)
    return // 不重新生成计划，保留用户选择
  }

  trainingStore.generateTodayPlan()
})
</script>

<style scoped>
.page {
  padding-bottom: 120rpx;
}
.debug-trigger {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 80rpx;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
}
.debug-trigger-text {
  font-size: 1rpx;
  color: transparent;
}

/* 引导卡片 */
.onboard-card {
  text-align: center;
  padding: 80rpx 48rpx;
  background: var(--bg-secondary);
  border: 1rpx solid var(--separator);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg);
}
.onboard-emoji {
  font-size: 100rpx;
  display: block;
  margin-bottom: 24rpx;
}
.onboard-title {
  display: block;
  font-size: 40rpx;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 16rpx;
  letter-spacing: 0.5rpx;
}
.onboard-desc {
  display: block;
  font-size: 28rpx;
  color: var(--text-secondary);
  line-height: 1.8;
  margin-bottom: 48rpx;
}
.onboard-btn {
  width: 100%;
  margin: 0 auto;
  padding: 32rpx;
  font-size: 34rpx;
  font-weight: 600;
  border-radius: var(--radius-lg);
  text-align: center;
  background: var(--gradient-primary);
  color: #FFFFFF;
  box-shadow: var(--shadow-md);
}

/* 计划卡片 */
.plan-card {
  background: var(--bg-secondary);
  border: 1rpx solid var(--separator);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}
.plan-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}
.plan-title {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.phase-tag {
  font-size: 22rpx;
  padding: 6rpx 20rpx;
  border-radius: 999rpx;
  font-weight: 600;
  color: #FFFFFF;
  background: var(--accent);
}
.plan-week {
  font-size: 30rpx;
  color: var(--text-primary);
  font-weight: 700;
}
.plan-header-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8rpx;
}
.plan-date {
  font-size: 24rpx;
  color: var(--text-tertiary);
}
.switch-plan {
  font-size: 22rpx;
  color: var(--accent);
  padding: 6rpx 16rpx;
  border-radius: 999rpx;
  background: rgba(10, 132, 255, 0.1);
}
.plan-meta {
  display: flex;
  gap: 20rpx;
  flex-wrap: wrap;
}
.meta-item {
  font-size: 22rpx;
  color: var(--text-secondary);
}
.estimation-hint {
  display: block;
  font-size: 22rpx;
  color: var(--text-tertiary);
  margin-top: 8rpx;
  font-style: italic;
}

/* 力量测试入口 */
.strength-test-entry {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 2rpx dashed var(--orange);
  background: rgba(255, 159, 10, 0.06);
  margin-bottom: 20rpx;
  border-radius: var(--radius-md);
  padding: 24rpx;
}
.strength-test-entry:active {
  background: rgba(255, 159, 10, 0.12);
}
.ste-header {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.ste-icon { font-size: 40rpx; }
.ste-info { flex: 1; }
.ste-title {
  display: block;
  font-size: 30rpx;
  font-weight: 700;
  color: var(--orange);
}
.ste-desc {
  display: block;
  font-size: 22rpx;
  color: var(--text-secondary);
  margin-top: 4rpx;
}
.ste-arrow {
  font-size: 36rpx;
  color: var(--text-tertiary);
  font-weight: 300;
}

/* 休息日 */
.rest-card {
  text-align: center;
  padding: 80rpx 48rpx;
}
.rest-emoji {
  font-size: 80rpx;
  opacity: 0.8;
}
.rest-text {
  display: block;
  font-size: 36rpx;
  font-weight: 600;
  margin-top: 20rpx;
  color: var(--text-primary);
}
.rest-sub {
  display: block;
  font-size: 26rpx;
  color: var(--text-secondary);
  margin-top: 8rpx;
}
.rest-actions {
  display: flex;
  gap: 20rpx;
  margin-top: 36rpx;
  justify-content: center;
}
.rest-switch-btn {
  padding: 20rpx 40rpx;
  font-size: 28rpx;
  border-radius: var(--radius-lg);
  background: var(--bg-tertiary);
  color: var(--text-primary);
  font-weight: 500;
}
.rest-train-btn {
  padding: 20rpx 40rpx;
  font-size: 28rpx;
  border-radius: var(--radius-lg);
  background: var(--gradient-primary);
  color: #FFFFFF;
  font-weight: 600;
  box-shadow: var(--shadow-sm);
}

/* 动作列表 */
.section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--text-primary);
  margin: 32rpx 0 16rpx;
  padding-left: 8rpx;
}
.plan-actions {
  display: flex;
  gap: 12rpx;
  margin-bottom: 16rpx;
}
.btn-sm {
  padding: 12rpx 24rpx;
  font-size: 24rpx;
  border-radius: 999rpx;
}
.exercise-card {
  border-left: none;
  background: var(--bg-secondary);
  border: 1rpx solid var(--separator);
  border-radius: var(--radius-lg);
}
.ex-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}
.ex-name {
  font-size: 34rpx;
  font-weight: 700;
  color: var(--text-primary);
}
.ex-header-right {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.ex-muscle {
  font-size: 22rpx;
  color: var(--text-secondary);
  background: var(--bg-tertiary);
  padding: 6rpx 18rpx;
  border-radius: 999rpx;
}
.ex-action-btns {
  display: flex;
  gap: 8rpx;
}
.ex-btn {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  font-weight: 700;
}
.ex-btn.insert {
  background: rgba(10, 132, 255, 0.12);
  color: var(--accent);
}
.ex-btn.remove {
  background: rgba(255, 69, 58, 0.12);
  color: var(--red);
}
.add-exercise-bottom {
  width: 100%;
  padding: 24rpx;
  text-align: center;
  font-size: 28rpx;
  border-radius: var(--radius-md);
  margin-top: 16rpx;
  border: 2rpx dashed var(--separator);
  color: var(--accent);
  font-weight: 500;
}
.ex-details {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8rpx;
}
.ex-detail-item {
  text-align: center;
}
.detail-label {
  display: block;
  font-size: 22rpx;
  color: var(--text-tertiary);
  margin-bottom: 4rpx;
}
.detail-value {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--text-primary);
}
.detail-hint {
  display: block;
  font-size: 18rpx;
  color: var(--text-tertiary);
  margin-top: 2rpx;
}
.warmup-section {
  margin-top: 16rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid var(--separator);
}
.warmup-title {
  font-size: 24rpx;
  color: var(--orange);
  margin-bottom: 8rpx;
  font-weight: 500;
}
.warmup-set {
  font-size: 24rpx;
  color: var(--text-secondary);
  line-height: 1.8;
}

/* 开始按钮 */
.start-btn-wrapper {
  padding: 32rpx 0;
}
.start-btn {
  width: 100%;
  padding: 36rpx;
  font-size: 36rpx;
  font-weight: 700;
  border-radius: var(--radius-lg);
  background: var(--gradient-primary);
  color: #FFFFFF;
  box-shadow: var(--shadow-md);
  letter-spacing: 1rpx;
}

/* 最近训练 */
.log-card {
  border-left: none;
  background: var(--bg-secondary);
  border: 1rpx solid var(--separator);
  border-radius: var(--radius-lg);
}
.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
}
.log-date {
  font-size: 28rpx;
  font-weight: 600;
  color: var(--text-primary);
}
.log-phase {
  font-size: 22rpx;
  padding: 4rpx 16rpx;
  border-radius: 999rpx;
  background: var(--accent);
  color: #FFFFFF;
  font-weight: 500;
}
.log-exercises {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-bottom: 12rpx;
}
.log-ex-name {
  font-size: 24rpx;
  color: var(--text-secondary);
  background: var(--bg-tertiary);
  padding: 6rpx 16rpx;
  border-radius: 999rpx;
}
.log-ex-rpe {
  margin-left: 8rpx;
  font-size: 22rpx;
  color: var(--text-tertiary);
}
.log-stats {
  display: flex;
  gap: 24rpx;
  font-size: 24rpx;
  color: var(--text-secondary);
}

/* 训练执行模式 */
.training-mode {
  padding-bottom: 200rpx;
}
.training-progress {
  padding: 16rpx 24rpx;
  background: var(--bg-secondary);
  position: sticky;
  top: 0;
  z-index: 10;
  border-bottom: 1rpx solid var(--separator);
}
.progress-bar {
  height: 6rpx;
  background: var(--bg-tertiary);
  border-radius: 3rpx;
  overflow: hidden;
  margin-bottom: 8rpx;
}
.progress-fill {
  height: 100%;
  background: var(--accent);
  border-radius: 3rpx;
  transition: width 0.3s;
}
.progress-text {
  font-size: 24rpx;
  color: var(--text-secondary);
  text-align: center;
}

/* 当前动作 */
.current-exercise {
  border-left: none;
  background: var(--bg-secondary);
  border: 1rpx solid var(--separator);
  border-radius: var(--radius-lg);
}
.current-ex-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}
.current-ex-name {
  font-size: 40rpx;
  font-weight: 700;
  color: var(--text-primary);
}
.current-ex-target {
  font-size: 26rpx;
  color: var(--text-secondary);
  font-weight: 500;
}

/* 已完成的组 */
.completed-sets {
  margin-bottom: 24rpx;
}
.set-row.completed {
  display: flex;
  justify-content: space-between;
  padding: 8rpx 0;
  font-size: 26rpx;
  color: var(--text-secondary);
}

/* 输入区域 */
.set-input-area {
  background: var(--bg-tertiary);
  border-radius: var(--radius-lg);
  padding: 32rpx;
  margin-top: 16rpx;
  border: 1rpx solid var(--separator);
  box-shadow: var(--shadow-sm);
}
.set-label {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--accent);
  margin-bottom: 20rpx;
  display: block;
}
.input-row {
  display: flex;
  gap: 16rpx;
  margin-bottom: 24rpx;
}
.input-group {
  flex: 1;
}
.input-label {
  display: block;
  font-size: 24rpx;
  color: var(--text-secondary);
  margin-bottom: 8rpx;
}
.weight-input {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.weight-btn {
  background: var(--bg-secondary);
  color: var(--accent);
  font-size: 22rpx;
  padding: 10rpx 20rpx;
  border-radius: 999rpx;
  min-width: 80rpx;
  text-align: center;
  border: 1rpx solid var(--separator);
  font-weight: 500;
}
.weight-field, .reps-field {
  background: var(--bg-secondary);
  border: 1rpx solid var(--separator);
  border-radius: var(--radius-md);
  padding: 14rpx 16rpx;
  color: var(--text-primary);
  font-size: 30rpx;
  text-align: center;
  flex: 1;
}
.reps-field {
  width: 100%;
}

/* RPE输入 */
.rpe-input-area {
  margin-bottom: 24rpx;
}
.rpe-beginner {
  display: flex;
  gap: 12rpx;
  margin-top: 12rpx;
}
.rpe-level-btn {
  flex: 1;
  text-align: center;
  padding: 16rpx;
  background: var(--bg-secondary);
  border: 2rpx solid var(--separator);
  border-radius: var(--radius-md);
  transition: all 0.2s;
}
.rpe-level-btn.active {
  border-color: var(--accent);
  background: rgba(10, 132, 255, 0.1);
  box-shadow: 0 0 0 2rpx rgba(10, 132, 255, 0.2);
}
.rpe-emoji {
  font-size: 36rpx;
  display: block;
}
.rpe-label {
  font-size: 22rpx;
  color: var(--text-secondary);
  display: block;
  margin-top: 4rpx;
}
.rpe-advanced {
  margin-top: 12rpx;
  padding: 0 8rpx;
}
.rpe-value {
  display: block;
  text-align: center;
  font-size: 28rpx;
  color: var(--accent);
  font-weight: 600;
  margin-top: 8rpx;
}

/* 完成按钮 */
.complete-btn {
  width: 100%;
  padding: 28rpx;
  font-size: 32rpx;
  font-weight: 600;
  border-radius: var(--radius-lg);
  background: var(--gradient-primary);
  color: #FFFFFF;
  box-shadow: var(--shadow-md);
}

/* RPE建议 */
.advice-card {
  margin-top: 16rpx;
  padding: 20rpx;
  border-radius: var(--radius-md);
  font-size: 24rpx;
  border-left: none;
}
.advice-increase {
  background: rgba(48, 209, 88, 0.08);
  border: 1rpx solid rgba(48, 209, 88, 0.2);
}
.advice-decrease {
  background: rgba(255, 159, 10, 0.08);
  border: 1rpx solid rgba(255, 159, 10, 0.2);
}
.advice-text {
  color: var(--text-secondary);
}

/* 计时器 */
.timer-card {
  text-align: center;
  margin-top: 24rpx;
}
.timer-label {
  font-size: 26rpx;
  color: var(--text-secondary);
  display: block;
  margin-bottom: 12rpx;
}
.timer-display {
  font-size: 80rpx;
  font-weight: 700;
  color: var(--accent);
  display: block;
  margin-bottom: 24rpx;
  font-variant-numeric: tabular-nums;
  letter-spacing: 2rpx;
}
.timer-controls {
  display: flex;
  gap: 16rpx;
}

/* 结束按钮 */
.finish-btn-wrapper {
  margin-top: 32rpx;
}
.finish-btn {
  width: 100%;
  padding: 28rpx;
  font-size: 30rpx;
  font-weight: 600;
  border-radius: var(--radius-lg);
  background: var(--gradient-primary);
  color: #FFFFFF;
  box-shadow: var(--shadow-md);
}
</style>
