<template>
  <view class="debug-overlay" v-if="visible" @tap.stop="emit('close')">
    <view class="debug-panel" @tap.stop>
      <view class="debug-header">
        <text class="debug-title">🔧 开发者调试</text>
        <text class="debug-close" @tap="emit('close')">✕</text>
      </view>

      <!-- 日期模拟 -->
      <view class="debug-section">
        <text class="section-label">📅 日期模拟</text>
        <view class="debug-row">
          <input type="text" v-model="simDate" class="debug-input" placeholder="YYYY-MM-DD" />
          <view class="debug-btn" @tap="setStartDate">
            <text>设置起始日</text>
          </view>
        </view>
        <view class="debug-row">
          <text class="debug-info">当前起始日: {{ trainingStore.planStartDate }}</text>
        </view>
        <view class="debug-row">
          <text class="debug-info">今天: {{ todayStr }}</text>
        </view>
        <view class="debug-row">
          <text class="debug-info">训练天数: {{ daysSinceStart }}</text>
        </view>
      </view>

      <!-- 插入测试数据 -->
      <view class="debug-section">
        <text class="section-label">📊 插入测试数据</text>
        <view class="debug-btn danger" @tap="insertTestData">
          <text>插入15条训练记录（30天）</text>
        </view>
        <view class="debug-btn" @tap="insertTestData2">
          <text>插入30条训练记录（60天）</text>
        </view>
      </view>

      <!-- 查看 e1RM -->
      <view class="debug-section">
        <text class="section-label">💪 e1RM 数据</text>
        <view v-if="e1rmList.length === 0">
          <text class="debug-info">暂无数据</text>
        </view>
        <view v-for="item in e1rmList" :key="item.id" class="debug-row">
          <text class="debug-info">{{ item.name }}: {{ item.e1rm }}kg ({{ item.confidence }})</text>
        </view>
      </view>

      <!-- 模式切换 -->
      <view class="debug-section">
        <text class="section-label">⚙️ 模式切换</text>
        <view class="debug-row">
          <text class="debug-info">当前方案: {{ currentTemplateName }}</text>
        </view>
        <view class="debug-btn" @tap="regeneratePlan">
          <text>重新生成今日计划</text>
        </view>
      </view>

      <!-- 清除数据 -->
      <view class="debug-section">
        <text class="section-label">🗑️ 清除数据</text>
        <view class="debug-btn danger" @tap="clearAllData">
          <text>清除所有数据</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useTrainingStore } from '../../stores/training'
import { useUserStore } from '../../stores/user'
import { formatDate } from '../../utils/format'

const props = defineProps<{
  visible: boolean
}>()
const emit = defineEmits<{
  (e: 'close'): void
}>()

const trainingStore = useTrainingStore()
const userStore = useUserStore()

const simDate = ref('')
const todayStr = formatDate(new Date())

const daysSinceStart = computed(() => {
  if (!trainingStore.planStartDate) return 0
  const start = new Date(trainingStore.planStartDate)
  const now = new Date()
  return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
})

const e1rmList = computed(() => {
  return Object.entries(userStore.exerciseMaxes).map(([id, max]: any) => ({
    id,
    name: max.exerciseName || id,
    e1rm: max.estimated1RM,
    confidence: max.confidence,
  }))
})

const currentTemplateName = computed(() => {
  return trainingStore.selectedTemplate?.name || '未选择'
})

function setStartDate() {
  if (!simDate.value || !/^\d{4}-\d{2}-\d{2}$/.test(simDate.value)) {
    uni.showToast({ title: '请输入有效日期 YYYY-MM-DD', icon: 'none' })
    return
  }
  trainingStore.setPlanStartDate(simDate.value)
  trainingStore.generateTodayPlan()
  uni.showToast({ title: '已设置，计划已重新生成', icon: 'success' })
}

function insertTestData(days = 30, count = 15) {
  const logs = trainingStore.trainingLogs
  const today = new Date()

  const exercises = [
    { exerciseId: 'bench_press', name: '卧推', baseWeight: 40 },
    { exerciseId: 'squat', name: '深蹲', baseWeight: 50 },
    { exerciseId: 'deadlift', name: '硬拉', baseWeight: 60 },
    { exerciseId: 'barbell_row', name: '杠铃划船', baseWeight: 35 },
    { exerciseId: 'overhead_press', name: '推举', baseWeight: 25 },
  ]

  const phases = ['light', 'medium', 'heavy']

  for (let i = 0; i < count; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - (count - 1 - i) * (days / count))
    const dateStr = formatDate(d)

    // 避免重复日期
    if (logs.find((l: any) => l.date === dateStr)) continue

    const phaseIndex = i % 3
    const progression = i * 0.5 // 每次训练增加0.5kg

    const exerciseRecords = exercises.map(ex => {
      const weight = ex.baseWeight + progression
      const reps = phaseIndex === 2 ? 5 : phaseIndex === 1 ? 8 : 12
      const rpe = phaseIndex === 2 ? 8.5 : 7
      const sets = 4
      const totalVolume = weight * reps * sets
      return {
        exerciseId: ex.exerciseId,
        name: ex.name,
        sets: Array.from({ length: sets }, () => ({ weight, reps, rpe })),
        totalVolume,
        averageRPE: rpe,
      }
    })

    logs.push({
      date: dateStr,
      exercises: exerciseRecords,
      totalVolume: exerciseRecords.reduce((s, ex) => s + ex.totalVolume, 0),
      duration: 45 + Math.floor(Math.random() * 15),
      cyclePhase: phases[phaseIndex],
    } as any)
  }

  // 同时更新 e1RM
  exercises.forEach(ex => {
    const finalWeight = ex.baseWeight + (count - 1) * 0.5
    userStore.updateExerciseMax(ex.exerciseId, ex.name, Math.round(finalWeight * 1.2 / 2.5) * 2.5, 'medium', 'formula')
  })

  uni.showToast({ title: `已插入${count}条训练记录`, icon: 'success' })
}

function insertTestData2() {
  insertTestData(60, 30)
}

function regeneratePlan() {
  trainingStore.generateTodayPlan()
  uni.showToast({ title: '计划已重新生成', icon: 'success' })
}

function clearAllData() {
  uni.showModal({
    title: '确认清除',
    content: '将清除所有训练记录和e1RM数据，此操作不可撤销',
    success: (res) => {
      if (res.confirm) {
        trainingStore.trainingLogs.splice(0, trainingStore.trainingLogs.length)
        // Clear exercise maxes
        const maxes = userStore.exerciseMaxes
        Object.keys(maxes).forEach(key => {
          delete maxes[key]
        })
        trainingStore.setPlanStartDate(formatDate(new Date()))
        trainingStore.generateTodayPlan()
        uni.showToast({ title: '已清除', icon: 'success' })
      }
    }
  })
}
</script>

<style scoped>
.debug-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  z-index: 9999;
  display: flex;
  align-items: flex-end;
}
.debug-panel {
  width: 100%;
  max-height: 80vh;
  background: var(--bg-secondary);
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  padding: 32rpx;
  overflow-y: auto;
}
.debug-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
  padding-bottom: 16rpx;
  border-bottom: 1rpx solid var(--separator);
}
.debug-title {
  font-size: 32rpx;
  font-weight: 700;
  color: var(--red);
}
.debug-close {
  font-size: 32rpx;
  color: var(--text-secondary);
  padding: 8rpx 16rpx;
}
.debug-section {
  margin-bottom: 24rpx;
  padding: 20rpx;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
}
.section-label {
  display: block;
  font-size: 26rpx;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 12rpx;
}
.debug-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 12rpx;
}
.debug-input {
  flex: 1;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
  padding: 12rpx 16rpx;
  font-size: 26rpx;
  color: var(--text-primary);
}
.debug-info {
  font-size: 24rpx;
  color: var(--text-secondary);
  word-break: break-all;
}
.debug-btn {
  padding: 12rpx 20rpx;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
  margin-bottom: 8rpx;
}
.debug-btn text {
  font-size: 24rpx;
  color: var(--accent);
}
.debug-btn.danger text {
  color: var(--red);
}
</style>
