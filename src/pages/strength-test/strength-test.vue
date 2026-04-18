<template>
  <view class="page">
    <!-- Step 1: Select exercises -->
    <view v-if="step === 1">
      <view class="header">
        <text class="header-title">💪 力量测试</text>
        <text class="header-sub">选择要测试的动作，通过实际表现校准你的训练重量</text>
      </view>

      <view class="rm-tips">
        <text class="tips-title">💡 测试说明</text>
        <text class="tips-text">选择一个你能完成的重量和次数，系统会反推你的1RM。</text>
        <text class="tips-text">新手建议使用8RM测试，更安全且结果准确。</text>
      </view>

      <view class="section-title">选择测试动作</view>
      <view
        v-for="ex in testableExercises"
        :key="ex.id"
        class="card exercise-select-card"
        :class="{ selected: selectedExercises.includes(ex.id) }"
        @tap="toggleExercise(ex.id)"
      >
        <view class="ex-info">
          <text class="ex-name">{{ ex.name }}</text>
          <text class="ex-muscle">{{ ex.muscleGroup }}</text>
        </view>
        <view class="check-box" :class="{ checked: selectedExercises.includes(ex.id) }">
          <text v-if="selectedExercises.includes(ex.id)">✓</text>
        </view>
      </view>

      <view class="btn-primary next-btn" @tap="startTest" v-if="selectedExercises.length > 0">
        开始测试 ({{ selectedExercises.length }}个动作)
      </view>
    </view>

    <!-- Step 2: Test individual exercise -->
    <view v-if="step === 2">
      <view class="header">
        <text class="header-title">{{ currentExercise?.name }}</text>
        <text class="header-sub">{{ currentExerciseIndex + 1 }} / {{ selectedExercises.length }}</text>
      </view>

      <!-- RM Target Selector -->
      <view class="card">
        <text class="card-title">测试类型</text>
        <view class="rm-selector">
          <view
            v-for="opt in rmOptions"
            :key="opt.value"
            class="rm-tag"
            :class="{ active: rmTarget === opt.value }"
            @tap="rmTarget = opt.value"
          >
            <text>{{ opt.label }}</text>
          </view>
        </view>
        <text class="rm-tip">{{ currentRmTip }}</text>
      </view>

      <!-- Weight & Reps Input -->
      <view class="card">
        <text class="card-title">测试数据</text>
        <view class="input-row">
          <text class="input-label">重量</text>
          <input type="digit" v-model="testWeight" class="input-field" placeholder="输入重量" />
          <text class="input-unit">kg</text>
        </view>
        <view class="input-row">
          <text class="input-label">次数</text>
          <input type="number" v-model="testReps" class="input-field" placeholder="完成的次数" />
          <text class="input-unit">次</text>
        </view>
        <view class="input-row">
          <text class="input-label">RPE</text>
          <view class="rpe-buttons">
            <view
              v-for="r in rpeOptions"
              :key="r"
              class="rpe-tag"
              :class="{ active: testRPE === r }"
              @tap="testRPE = r"
            >
              <text>{{ r }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- Result -->
      <view class="card result-card" v-if="testResult">
        <text class="result-label">估算1RM</text>
        <text class="result-value">{{ testResult.estimated1RM }}kg</text>
        <text class="result-confidence" :class="testResult.confidence">
          置信度：{{ confidenceLabels[testResult.confidence] }}
        </text>
      </view>

      <view class="btn-row">
        <view class="btn-secondary" @tap="calculateTest" v-if="!testResult">
          计算
        </view>
        <view class="btn-primary" @tap="saveAndNext" v-if="testResult">
          保存并{{ isLastExercise ? '完成' : '下一个' }}
        </view>
        <view class="btn-secondary" @tap="skipExercise" v-if="!testResult">
          跳过
        </view>
      </view>
    </view>

    <!-- Step 3: Summary -->
    <view v-if="step === 3">
      <view class="header">
        <text class="header-title">✅ 测试完成</text>
        <text class="header-sub">你的力量数据已保存，训练计划将自动校准</text>
      </view>

      <view class="card" v-for="r in testResults" :key="r.exerciseId">
        <view class="result-row">
          <text class="result-name">{{ r.name }}</text>
          <text class="result-e1rm">{{ r.e1RM }}kg</text>
        </view>
        <text class="result-method">测试方式：{{ r.rmLabel }} · RPE {{ r.rpe }}</text>
      </view>

      <view class="btn-primary" @tap="goBack">
        返回首页
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useExerciseStore } from '../../stores/exercise'
import { useUserStore } from '../../stores/user'
import { estimate1RM } from '../../core/algorithms/rm-calculator'
import type { RMEstimate } from '../../core/types/algorithm'

const exerciseStore = useExerciseStore()
const userStore = useUserStore()

const step = ref(1)
const selectedExercises = ref<string[]>([])

// 可测试的复合动作列表
const testableExercises = computed(() => {
  return exerciseStore.exercises.filter(ex => ex.category === 'compound')
})

// RM选项
const rmOptions = [
  { label: '1RM', value: 1 },
  { label: '3RM', value: 3 },
  { label: '5RM', value: 5 },
  { label: '8RM', value: 8 },
]

const rmTarget = ref(5)
const testWeight = ref('')
const testReps = ref('')
const testRPE = ref(8)

const rpeOptions = [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10]

const rmTips: Record<number, string> = {
  1: '⚠️ 仅建议有经验的训练者，需要保护者',
  3: '适合中级训练者，注意安全',
  5: '推荐大多数训练者使用',
  8: '最适合新手，安全且准确',
}

const currentRmTip = computed(() => rmTips[rmTarget.value] || '')

const confidenceLabels: Record<string, string> = {
  high: '高',
  medium: '中',
  low: '低',
}

// 当前测试进度
const currentExerciseIndex = ref(0)
const currentExercise = computed(() => {
  const id = selectedExercises.value[currentExerciseIndex.value]
  return exerciseStore.exercises.find(ex => ex.id === id)
})

const isLastExercise = computed(() => {
  return currentExerciseIndex.value >= selectedExercises.value.length - 1
})

// 测试结果
const testResult = ref<RMEstimate | null>(null)
const testResults = ref<any[]>([])

function toggleExercise(id: string) {
  const idx = selectedExercises.value.indexOf(id)
  if (idx >= 0) {
    selectedExercises.value.splice(idx, 1)
  } else {
    selectedExercises.value.push(id)
  }
}

function startTest() {
  step.value = 2
  currentExerciseIndex.value = 0
  resetTestForm()
}

function resetTestForm() {
  testWeight.value = ''
  testReps.value = ''
  testRPE.value = 8
  rmTarget.value = 5
  testResult.value = null
}

function calculateTest() {
  const w = parseFloat(testWeight.value)
  const r = parseInt(testReps.value)
  if (!w || w <= 0 || !r || r <= 0) {
    uni.showToast({ title: '请输入有效的重量和次数', icon: 'none' })
    return
  }
  testResult.value = estimate1RM(w, r, testRPE.value)
}

function saveAndNext() {
  if (!testResult.value || !currentExercise.value) return

  const e1RM = Math.round(testResult.value.estimated1RM / 2.5) * 2.5

  userStore.updateExerciseMax(
    currentExercise.value.id,
    currentExercise.value.name,
    e1RM,
    testResult.value.confidence,
    'direct_test'
  )

  testResults.value.push({
    exerciseId: currentExercise.value.id,
    name: currentExercise.value.name,
    e1RM,
    rmLabel: rmOptions.find(o => o.value === rmTarget.value)?.label,
    rpe: testRPE.value,
    confidence: testResult.value.confidence,
  })

  if (isLastExercise.value) {
    step.value = 3
  } else {
    currentExerciseIndex.value++
    resetTestForm()
  }
}

function skipExercise() {
  if (isLastExercise.value) {
    if (testResults.value.length > 0) {
      step.value = 3
    } else {
      uni.navigateBack()
    }
  } else {
    currentExerciseIndex.value++
    resetTestForm()
  }
}

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped>
.page {
  padding: 24rpx;
  padding-bottom: 160rpx;
  min-height: 100vh;
  background: var(--bg-primary);
}
.header {
  margin-bottom: 32rpx;
  padding: 16rpx 0;
}
.header-title {
  display: block;
  font-size: 40rpx;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 8rpx;
}
.header-sub {
  display: block;
  font-size: 26rpx;
  color: var(--text-secondary);
}
.section-title {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 16rpx;
  margin-top: 24rpx;
}

/* Tips */
.rm-tips {
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  padding: 24rpx;
  margin-bottom: 24rpx;
  border-left: 6rpx solid var(--accent);
}
.tips-title {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: var(--accent);
  margin-bottom: 8rpx;
}
.tips-text {
  display: block;
  font-size: 24rpx;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-top: 4rpx;
}

/* Exercise select card */
.exercise-select-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
  border: 2rpx solid var(--separator);
}
.exercise-select-card.selected {
  border-color: var(--accent);
  background: rgba(10, 132, 255, 0.05);
}
.ex-info {
  flex: 1;
}
.ex-name {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: var(--text-primary);
}
.ex-muscle {
  display: block;
  font-size: 22rpx;
  color: var(--text-secondary);
  margin-top: 4rpx;
}
.check-box {
  width: 44rpx;
  height: 44rpx;
  border-radius: var(--radius-sm);
  border: 2rpx solid var(--separator-opaque);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  color: transparent;
}
.check-box.checked {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--text-primary);
}

/* RM selector */
.card-title {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 16rpx;
}
.rm-selector {
  display: flex;
  gap: 12rpx;
  margin-bottom: 12rpx;
}
.rm-tag {
  flex: 1;
  padding: 16rpx;
  text-align: center;
  border-radius: var(--radius-sm);
  background: var(--bg-tertiary);
  font-size: 28rpx;
  color: var(--text-secondary);
  font-weight: 600;
}
.rm-tag.active {
  background: rgba(10, 132, 255, 0.15);
  color: var(--accent);
  border: 1rpx solid rgba(10, 132, 255, 0.3);
}
.rm-tip {
  display: block;
  font-size: 22rpx;
  color: var(--orange);
  margin-top: 8rpx;
}

/* Input */
.input-row {
  display: flex;
  align-items: center;
  margin-bottom: 20rpx;
}
.input-label {
  width: 100rpx;
  font-size: 28rpx;
  color: var(--text-secondary);
}
.input-field {
  flex: 1;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
  padding: 16rpx 20rpx;
  font-size: 28rpx;
  color: var(--text-primary);
  margin: 0 12rpx;
}
.input-unit {
  font-size: 26rpx;
  color: var(--text-secondary);
  width: 60rpx;
}

/* RPE buttons */
.rpe-buttons {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
  margin: 0 12rpx;
}
.rpe-tag {
  padding: 8rpx 16rpx;
  border-radius: var(--radius-sm);
  background: var(--bg-tertiary);
  font-size: 24rpx;
  color: var(--text-secondary);
}
.rpe-tag.active {
  background: rgba(10, 132, 255, 0.15);
  color: var(--accent);
}

/* Result card */
.result-card {
  text-align: center;
  padding: 32rpx;
  border: 2rpx solid var(--accent);
  background: rgba(10, 132, 255, 0.05);
}
.result-label {
  display: block;
  font-size: 26rpx;
  color: var(--text-secondary);
  margin-bottom: 8rpx;
}
.result-value {
  display: block;
  font-size: 56rpx;
  font-weight: 700;
  color: var(--accent);
  margin-bottom: 8rpx;
}
.result-confidence {
  display: block;
  font-size: 24rpx;
}
.result-confidence.high { color: var(--green); }
.result-confidence.medium { color: var(--orange); }
.result-confidence.low { color: var(--red); }

/* Summary result */
.result-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8rpx;
}
.result-name {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--text-primary);
}
.result-e1rm {
  font-size: 34rpx;
  font-weight: 700;
  color: var(--accent);
}
.result-method {
  display: block;
  font-size: 22rpx;
  color: var(--text-tertiary);
  margin-top: 4rpx;
}

/* Buttons */
.next-btn {
  margin-top: 32rpx;
}
.btn-row {
  display: flex;
  gap: 16rpx;
  margin-top: 24rpx;
}
.btn-row .btn-primary,
.btn-row .btn-secondary {
  flex: 1;
  padding: 24rpx;
  text-align: center;
  border-radius: var(--radius-sm);
  font-size: 28rpx;
}

/* Global card style */
.card {
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  padding: 24rpx;
  margin-bottom: 20rpx;
}

/* Button styles (matching app global) */
.btn-primary {
  background: var(--gradient-primary);
  color: var(--text-primary);
  padding: 24rpx;
  border-radius: var(--radius-sm);
  text-align: center;
  font-size: 30rpx;
  font-weight: 600;
}
.btn-secondary {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  padding: 24rpx;
  border-radius: var(--radius-sm);
  text-align: center;
  font-size: 30rpx;
}
</style>
