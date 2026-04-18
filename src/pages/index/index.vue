<template>
  <view class="page">
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
          <view class="plan-header">
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
        </view>

        <!-- 休息日 -->
        <view class="card rest-card" v-else>
          <text class="rest-emoji">😴</text>
          <text class="rest-text">今天是休息日</text>
          <text class="rest-sub">好好恢复，为下次训练蓄力</text>
          <text class="rest-sub" v-if="trainingStore.selectedTemplate">
            当前方案：{{ trainingStore.selectedTemplate.name }}
          </text>
          <view class="btn-secondary rest-switch-btn" @tap="goToSplitPicker" style="margin-top: 24rpx;">
            切换方案
          </view>
        </view>

        <!-- 动作列表 -->
        <view v-if="trainingStore.todayPlan" class="exercise-list">
          <view class="section-title">今日训练</view>
          <view class="plan-actions">
            <view class="btn-secondary btn-sm" @tap="openExercisePicker">
              + 添加/替换动作
            </view>
            <view class="btn-secondary btn-sm" @tap="resetToDefaultPlan" v-if="isCustomPlan">
              恢复默认
            </view>
          </view>
          <view
            v-for="(ex, index) in trainingStore.todayPlan.exercises"
            :key="ex.exerciseId"
            class="card exercise-card"
          >
            <view class="ex-header">
              <text class="ex-name">{{ ex.name }}</text>
              <text class="ex-muscle">{{ MUSCLE_GROUP_NAMES[ex.muscleGroup] || ex.muscleGroup }}</text>
            </view>
            <view class="ex-details">
              <view class="ex-detail-item">
                <text class="detail-label">重量</text>
                <text class="detail-value text-primary">{{ ex.suggestedWeight }}kg</text>
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
        </view>

        <!-- 开始训练按钮 -->
        <view v-if="trainingStore.todayPlan" class="start-btn-wrapper">
          <view class="btn-primary start-btn" @tap="startTraining">
            开始训练
          </view>
        </view>
      </template>

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
                activeColor="#4fc3f7"
                backgroundColor="#2a2a4a"
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

// 跳转到模板选择页
function goToSplitPicker() {
  uni.navigateTo({ url: '/pages/split-picker/split-picker' })
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
const customExerciseIds = ref<string[]>([])

// 打开动作选择器
function openExercisePicker() {
  const currentIds = trainingStore.todayPlan
    ? trainingStore.todayPlan.exercises.map(ex => ex.exerciseId)
    : []
  customExerciseIds.value = currentIds
  uni.navigateTo({ url: '/pages/exercise-picker/exercise-picker' })
}

// 动作选择完成回调
function onExercisesSelected(ids: string[]) {
  customExerciseIds.value = ids
  isCustomPlan.value = true
  rebuildPlanWithExercises(ids)
}

// 用选定的动作重建训练计划
function rebuildPlanWithExercises(exerciseIds: string[]) {
  if (exerciseIds.length === 0) return

  const exerciseStoreLocal = useExerciseStore()
  const userStoreLocal = useUserStore()

  const exercises = exerciseIds.map(id => {
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

  trainingStore.updateDayExercises(exercises)
}

// 恢复默认计划
function resetToDefaultPlan() {
  isCustomPlan.value = false
  customExerciseIds.value = []
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

/* 引导卡片 */
.onboard-card {
  text-align: center;
  padding: 60rpx 32rpx;
  background: linear-gradient(135deg, #1a1a2e, #16213e);
  border: 1rpx solid #2a2a4a;
}
.onboard-emoji { font-size: 80rpx; display: block; margin-bottom: 16rpx; }
.onboard-title { display: block; font-size: 36rpx; font-weight: 700; color: #e0e0e0; margin-bottom: 16rpx; }
.onboard-desc { display: block; font-size: 26rpx; color: #aaa; line-height: 1.8; margin-bottom: 32rpx; }
.onboard-btn {
  width: 80%;
  margin: 0 auto;
  padding: 28rpx;
  font-size: 32rpx;
  border-radius: 16rpx;
  text-align: center;
}

/* 计划卡片 */
.plan-card {
  background: linear-gradient(135deg, #1a1a2e, #16213e);
  border: 1rpx solid #2a2a4a;
}
.plan-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}
.plan-title {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.phase-tag {
  font-size: 24rpx;
  padding: 4rpx 16rpx;
  border-radius: 8rpx;
  font-weight: 600;
  color: white;
}
.plan-week {
  font-size: 28rpx;
  color: #e0e0e0;
  font-weight: 600;
}
.plan-header-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8rpx;
}
.plan-date {
  font-size: 24rpx;
  color: #888;
}
.switch-plan {
  font-size: 22rpx;
  color: #4fc3f7;
  padding: 4rpx 12rpx;
}
.plan-meta {
  display: flex;
  gap: 24rpx;
  flex-wrap: wrap;
}
.meta-item {
  font-size: 24rpx;
  color: #aaa;
}

/* 休息日 */
.rest-card {
  text-align: center;
  padding: 60rpx 24rpx;
}
.rest-emoji { font-size: 80rpx; }
.rest-text { display: block; font-size: 36rpx; font-weight: 600; margin-top: 16rpx; }
.rest-sub { display: block; font-size: 26rpx; color: #888; margin-top: 8rpx; }
.rest-switch-btn {
  display: inline-block;
  padding: 12rpx 32rpx;
  font-size: 24rpx;
  border-radius: 8rpx;
}

/* 动作列表 */
.section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #e0e0e0;
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
  border-radius: 8rpx;
}
.exercise-card {
  border-left: 6rpx solid #4fc3f7;
}
.ex-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}
.ex-name {
  font-size: 32rpx;
  font-weight: 600;
}
.ex-muscle {
  font-size: 22rpx;
  color: #888;
  background: #2a2a4a;
  padding: 4rpx 12rpx;
  border-radius: 6rpx;
}
.ex-details {
  display: flex;
  justify-content: space-around;
}
.ex-detail-item {
  text-align: center;
}
.detail-label {
  display: block;
  font-size: 22rpx;
  color: #888;
  margin-bottom: 4rpx;
}
.detail-value {
  font-size: 30rpx;
  font-weight: 600;
}
.warmup-section {
  margin-top: 16rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid #2a2a4a;
}
.warmup-title {
  font-size: 24rpx;
  color: #ffa726;
  margin-bottom: 8rpx;
}
.warmup-set {
  font-size: 24rpx;
  color: #888;
  line-height: 1.8;
}

/* 开始按钮 */
.start-btn-wrapper {
  padding: 32rpx 0;
}
.start-btn {
  width: 100%;
  padding: 28rpx;
  font-size: 34rpx;
  border-radius: 16rpx;
}

/* 最近训练 */
.log-card {
  border-left: 4rpx solid #3a3a5a;
}
.log-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12rpx;
}
.log-date {
  font-size: 28rpx;
  font-weight: 600;
}
.log-phase {
  font-size: 22rpx;
  padding: 2rpx 12rpx;
  border-radius: 6rpx;
}
.log-exercises {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-bottom: 12rpx;
}
.log-ex-name {
  font-size: 24rpx;
  color: #ccc;
  background: #2a2a4a;
  padding: 4rpx 12rpx;
  border-radius: 6rpx;
}
.log-ex-rpe {
  margin-left: 8rpx;
  font-size: 22rpx;
}
.log-stats {
  display: flex;
  gap: 24rpx;
  font-size: 24rpx;
  color: #888;
}

/* 训练执行模式 */
.training-mode {
  padding-bottom: 200rpx;
}
.training-progress {
  padding: 16rpx 24rpx;
  background: #1a1a2e;
  position: sticky;
  top: 0;
  z-index: 10;
}
.progress-bar {
  height: 8rpx;
  background: #2a2a4a;
  border-radius: 4rpx;
  overflow: hidden;
  margin-bottom: 8rpx;
}
.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #4fc3f7, #0288d1);
  border-radius: 4rpx;
  transition: width 0.3s;
}
.progress-text {
  font-size: 24rpx;
  color: #888;
  text-align: center;
}

/* 当前动作 */
.current-exercise {
  border-left: 6rpx solid #4fc3f7;
}
.current-ex-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}
.current-ex-name {
  font-size: 36rpx;
  font-weight: 700;
}
.current-ex-target {
  font-size: 26rpx;
  color: #ffa726;
  font-weight: 600;
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
  color: #888;
}

/* 输入区域 */
.set-input-area {
  background: #0f0f23;
  border-radius: 12rpx;
  padding: 24rpx;
  margin-top: 16rpx;
}
.set-label {
  font-size: 30rpx;
  font-weight: 600;
  color: #4fc3f7;
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
  color: #888;
  margin-bottom: 8rpx;
}
.weight-input {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.weight-btn {
  background: #2a2a4a;
  color: #4fc3f7;
  font-size: 22rpx;
  padding: 8rpx 12rpx;
  border-radius: 8rpx;
  min-width: 80rpx;
  text-align: center;
}
.weight-field, .reps-field {
  background: #1a1a2e;
  border: 1rpx solid #3a3a5a;
  border-radius: 8rpx;
  padding: 12rpx 16rpx;
  color: #e0e0e0;
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
  gap: 16rpx;
  margin-top: 12rpx;
}
.rpe-level-btn {
  flex: 1;
  text-align: center;
  padding: 16rpx;
  background: #1a1a2e;
  border: 2rpx solid #3a3a5a;
  border-radius: 12rpx;
}
.rpe-level-btn.active {
  border-color: #4fc3f7;
  background: rgba(79, 195, 247, 0.1);
}
.rpe-emoji { font-size: 36rpx; display: block; }
.rpe-label { font-size: 24rpx; color: #ccc; display: block; margin-top: 4rpx; }
.rpe-advanced {
  margin-top: 12rpx;
  padding: 0 8rpx;
}
.rpe-value {
  display: block;
  text-align: center;
  font-size: 28rpx;
  color: #4fc3f7;
  font-weight: 600;
  margin-top: 8rpx;
}

/* 完成按钮 */
.complete-btn {
  width: 100%;
  padding: 24rpx;
  font-size: 32rpx;
}

/* RPE建议 */
.advice-card {
  margin-top: 16rpx;
  padding: 16rpx;
  border-radius: 8rpx;
  font-size: 24rpx;
}
.advice-increase { background: rgba(102, 187, 106, 0.1); border-left: 4rpx solid #66bb6a; }
.advice-decrease { background: rgba(255, 167, 38, 0.1); border-left: 4rpx solid #ffa726; }
.advice-text { color: #ccc; }

/* 计时器 */
.timer-card {
  text-align: center;
  margin-top: 24rpx;
}
.timer-label {
  font-size: 26rpx;
  color: #888;
  display: block;
  margin-bottom: 12rpx;
}
.timer-display {
  font-size: 72rpx;
  font-weight: 700;
  color: #4fc3f7;
  display: block;
  margin-bottom: 24rpx;
  font-variant-numeric: tabular-nums;
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
  padding: 24rpx;
  font-size: 30rpx;
}
</style>
