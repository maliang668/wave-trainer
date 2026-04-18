<template>
  <view class="page">
    <!-- 时间筛选 -->
    <view class="filter-bar">
      <view
        v-for="f in filters" :key="f.value"
        class="filter-item"
        :class="{ active: activeFilter === f.value }"
        @tap="activeFilter = f.value"
      >
        <text>{{ f.label }}</text>
      </view>
    </view>

    <!-- 统计概览 -->
    <view class="stats-overview">
      <view class="stat-card">
        <text class="stat-value">{{ filteredLogs.length }}</text>
        <text class="stat-label">训练次数</text>
      </view>
      <view class="stat-card">
        <text class="stat-value">{{ totalVolumeText }}</text>
        <text class="stat-label">总容量(kg)</text>
      </view>
      <view class="stat-card">
        <text class="stat-value">{{ avgRPEText }}</text>
        <text class="stat-label">平均RPE</text>
      </view>
      <view class="stat-card">
        <text class="stat-value">{{ avgDurationText }}</text>
        <text class="stat-label">平均时长(分)</text>
      </view>
    </view>

    <!-- e1RM趋势 -->
    <view class="card section-card">
      <view class="section-header">
        <text class="section-title">📈 力量趋势 (e1RM)</text>
      </view>
      <view class="trend-selector">
        <view
          v-for="ex in trackedExercises"
          :key="ex.id"
          class="trend-tab"
          :class="{ active: selectedExercise === ex.id }"
          @tap="selectedExercise = ex.id"
        >
          <text>{{ ex.name }}</text>
        </view>
      </view>
      <!-- 简易趋势图（用view模拟柱状图） -->
      <view class="chart-area" v-if="e1RMHistory.length > 0">
        <view class="chart-bars">
          <view
            v-for="(point, i) in e1RMHistory"
            :key="i"
            class="chart-bar-wrapper"
          >
            <text class="bar-value">{{ point.value }}</text>
            <view
              class="chart-bar"
              :style="{ height: getBarHeight(point.value) + 'rpx' }"
            ></view>
            <text class="bar-label">{{ point.label }}</text>
          </view>
        </view>
      </view>
      <view v-else class="empty-chart">
        <text class="empty-text">暂无数据，开始训练后这里会显示力量趋势</text>
      </view>
    </view>

    <!-- 训练容量趋势 -->
    <view class="card section-card">
      <view class="section-header">
        <text class="section-title">📊 训练容量</text>
      </view>
      <view class="volume-chart" v-if="volumeHistory.length > 0">
        <view
          v-for="(item, i) in volumeHistory"
          :key="i"
          class="volume-row"
        >
          <text class="volume-label">{{ item.label }}</text>
          <view class="volume-bar-bg">
            <view
              class="volume-bar-fill"
              :style="{ width: getVolumeWidth(item.value) + '%' }"
            ></view>
          </view>
          <text class="volume-value">{{ formatVolume(item.value) }}</text>
        </view>
      </view>
      <view v-else class="empty-chart">
        <text class="empty-text">暂无数据</text>
      </view>
    </view>

    <!-- RPE分布 -->
    <view class="card section-card">
      <view class="section-header">
        <text class="section-title">🎯 RPE分布</text>
      </view>
      <view class="rpe-distribution" v-if="allRPEs.length > 0">
        <view class="rpe-bar-row">
          <text class="rpe-bar-label">RPE 9-10</text>
          <view class="rpe-bar-bg">
            <view class="rpe-bar-fill high" :style="{ width: rpeDistribution.high + '%' }"></view>
          </view>
          <text class="rpe-bar-value">{{ rpeDistribution.high }}%</text>
        </view>
        <view class="rpe-bar-row">
          <text class="rpe-bar-label">RPE 7-8</text>
          <view class="rpe-bar-bg">
            <view class="rpe-bar-fill medium" :style="{ width: rpeDistribution.medium + '%' }"></view>
          </view>
          <text class="rpe-bar-value">{{ rpeDistribution.medium }}%</text>
        </view>
        <view class="rpe-bar-row">
          <text class="rpe-bar-label">RPE 5-6</text>
          <view class="rpe-bar-bg">
            <view class="rpe-bar-fill low" :style="{ width: rpeDistribution.low + '%' }"></view>
          </view>
          <text class="rpe-bar-value">{{ rpeDistribution.low }}%</text>
        </view>
      </view>
      <view v-else class="empty-chart">
        <text class="empty-text">暂无数据</text>
      </view>
    </view>

    <!-- 本周总结 -->
    <view class="card section-card">
      <view class="section-header">
        <text class="section-title">📋 本周总结</text>
      </view>
      <view class="weekly-summary">
        <view class="summary-row">
          <text class="summary-label">训练天数</text>
          <text class="summary-value">{{ trainingStore.thisWeekLogs.length }} / 5</text>
        </view>
        <view class="summary-row">
          <text class="summary-label">总容量</text>
          <text class="summary-value">{{ formatVolume(trainingStore.weeklyVolume) }} kg</text>
        </view>
        <view class="summary-row">
          <text class="summary-label">平均RPE</text>
          <text class="summary-value" :class="weeklyRPEColor">{{ trainingStore.weeklyAverageRPE.toFixed(1) }}</text>
        </view>
        <view class="summary-row">
          <text class="summary-label">当前周期</text>
          <text class="summary-value">第{{ trainingStore.currentCycleWeek }}周</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useTrainingStore } from '../../stores/training'
import { formatDateShort, formatVolume } from '../../utils/format'

const trainingStore = useTrainingStore()

// 时间筛选
const filters = [
  { label: '周', value: 'week' },
  { label: '月', value: 'month' },
  { label: '季度', value: 'quarter' },
  { label: '全部', value: 'all' },
]
const activeFilter = ref('month')

const filteredLogs = computed(() => {
  const now = new Date()
  let cutoff: Date

  switch (activeFilter.value) {
    case 'week':
      cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      break
    case 'month':
      cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      break
    case 'quarter':
      cutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      break
    default:
      return trainingStore.trainingLogs
  }

  return trainingStore.trainingLogs.filter(log => new Date(log.date) >= cutoff)
})

// 统计概览
const totalVolume = computed(() =>
  filteredLogs.value.reduce((sum, log) =>
    sum + log.exercises.reduce((s, ex) => s + ex.totalVolume, 0), 0
  )
)

const totalVolumeText = computed(() => {
  const v = totalVolume.value
  if (v >= 1000000) return (v / 1000000).toFixed(1) + 'M'
  if (v >= 1000) return (v / 1000).toFixed(1) + 'k'
  return String(v)
})

const allRPEs = computed(() =>
  filteredLogs.value.flatMap(log => log.exercises.map(ex => ex.averageRPE))
)

const avgRPEText = computed(() => {
  if (allRPEs.value.length === 0) return '-'
  return (allRPEs.value.reduce((s, r) => s + r, 0) / allRPEs.value.length).toFixed(1)
})

const avgDurationText = computed(() => {
  if (filteredLogs.value.length === 0) return '-'
  const total = filteredLogs.value.reduce((s, l) => s + (l.duration || 0), 0)
  return Math.round(total / filteredLogs.value.length).toString()
})

// RPE分布
const rpeDistribution = computed(() => {
  if (allRPEs.value.length === 0) return { high: 0, medium: 0, low: 0 }
  const total = allRPEs.value.length
  return {
    high: Math.round(allRPEs.value.filter(r => r >= 9).length / total * 100),
    medium: Math.round(allRPEs.value.filter(r => r >= 7 && r < 9).length / total * 100),
    low: Math.round(allRPEs.value.filter(r => r < 7).length / total * 100),
  }
})

// 追踪的动作
const trackedExercises = [
  { id: 'barbell_bench_press', name: '卧推' },
  { id: 'barbell_squat', name: '深蹲' },
  { id: 'barbell_row', name: '划船' },
  { id: 'overhead_press', name: '肩推' },
  { id: 'deadlift', name: '硬拉' },
]
const selectedExercise = ref('barbell_bench_press')

// e1RM历史
const e1RMHistory = computed(() => {
  const logs = filteredLogs.value.filter(log =>
    log.exercises.some(ex => ex.exerciseId === selectedExercise.value)
  )

  return logs.slice(-10).reverse().map(log => {
    const ex = log.exercises.find(e => e.exerciseId === selectedExercise.value)
    return {
      label: formatDateShort(log.date),
      value: ex ? Math.round(ex.estimated1RM) : 0,
    }
  })
})

const maxE1RM = computed(() =>
  Math.max(...e1RMHistory.value.map(p => p.value), 1)
)

function getBarHeight(value: number): number {
  return Math.max(20, (value / maxE1RM.value) * 200)
}

// 容量历史
const volumeHistory = computed(() => {
  return filteredLogs.value.slice(0, 8).reverse().map(log => ({
    label: formatDateShort(log.date),
    value: log.exercises.reduce((s, ex) => s + ex.totalVolume, 0),
  }))
})

const maxVolume = computed(() =>
  Math.max(...volumeHistory.value.map(v => v.value), 1)
)

function getVolumeWidth(value: number): number {
  return Math.max(5, (value / maxVolume.value) * 100)
}

// 本周RPE颜色
const weeklyRPEColor = computed(() => {
  const rpe = trainingStore.weeklyAverageRPE
  if (rpe >= 8.5) return 'text-danger'
  if (rpe >= 7.5) return 'text-warning'
  return 'text-success'
})
</script>

<style scoped>
.page {
  padding-bottom: 40rpx;
  background: var(--bg-primary, #000000);
  min-height: 100vh;
}

/* 筛选栏 */
.filter-bar {
  display: flex;
  gap: 12rpx;
  padding: 20rpx 24rpx;
  background: var(--bg-secondary, #1C1C1E);
  position: sticky;
  top: 0;
  z-index: 10;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}
.filter-item {
  padding: 10rpx 32rpx;
  border-radius: 40rpx;
  background: var(--bg-tertiary, #2C2C2E);
  font-size: 26rpx;
  color: var(--text-secondary, #8E8E93);
  font-weight: 500;
  transition: all 0.25s ease;
}
.filter-item.active {
  background: var(--accent, #0A84FF);
  color: #FFFFFF;
  font-weight: 600;
}

/* 统计概览 */
.stats-overview {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16rpx;
  padding: 20rpx 24rpx;
}
.stat-card {
  background: var(--bg-secondary, #1C1C1E);
  border-radius: var(--radius-md, 20rpx);
  padding: 28rpx 20rpx;
  text-align: center;
  border: 1rpx solid var(--separator, #38383A);
}
.stat-value {
  display: block;
  font-size: 40rpx;
  font-weight: 700;
  color: var(--text-primary, #FFFFFF);
  letter-spacing: -1rpx;
}
.stat-label {
  display: block;
  font-size: 22rpx;
  color: var(--text-secondary, #8E8E93);
  margin-top: 8rpx;
  font-weight: 400;
}

/* 区块卡片 */
.section-card {
  margin: 16rpx 24rpx;
  background: var(--bg-secondary, #1C1C1E);
  border-radius: var(--radius-lg, 28rpx);
  padding: 32rpx;
  border: 1rpx solid var(--separator, #38383A);
}
.section-header {
  margin-bottom: 24rpx;
}
.section-title {
  font-size: 30rpx;
  font-weight: 700;
  color: var(--text-primary, #FFFFFF);
}

/* 趋势选择器 */
.trend-selector {
  display: flex;
  gap: 10rpx;
  margin-bottom: 24rpx;
  overflow-x: auto;
  white-space: nowrap;
}
.trend-tab {
  padding: 8rpx 24rpx;
  border-radius: 40rpx;
  background: var(--bg-tertiary, #2C2C2E);
  font-size: 24rpx;
  color: var(--text-secondary, #8E8E93);
  flex-shrink: 0;
  font-weight: 500;
  transition: all 0.25s ease;
}
.trend-tab.active {
  background: var(--accent, #0A84FF);
  color: #FFFFFF;
  font-weight: 600;
}

/* 柱状图 */
.chart-area {
  padding: 20rpx 0;
}
.chart-bars {
  display: flex;
  align-items: flex-end;
  gap: 10rpx;
  height: 280rpx;
  padding: 0 8rpx;
}
.chart-bar-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  justify-content: flex-end;
}
.bar-value {
  font-size: 20rpx;
  color: var(--text-tertiary, #636366);
  margin-bottom: 6rpx;
  font-weight: 500;
}
.chart-bar {
  width: 100%;
  min-height: 8rpx;
  background: linear-gradient(180deg, var(--accent, #0A84FF), var(--accent-secondary, #5E5CE6));
  border-radius: 8rpx 8rpx 0 0;
  transition: height 0.3s ease;
}
.bar-label {
  font-size: 18rpx;
  color: var(--text-tertiary, #636366);
  margin-top: 10rpx;
}

/* 容量图 */
.volume-chart {
  padding: 12rpx 0;
}
.volume-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 16rpx;
}
.volume-label {
  font-size: 22rpx;
  color: var(--text-secondary, #8E8E93);
  min-width: 80rpx;
  font-weight: 500;
}
.volume-bar-bg {
  flex: 1;
  height: 20rpx;
  background: var(--bg-tertiary, #2C2C2E);
  border-radius: 10rpx;
  overflow: hidden;
}
.volume-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--green, #30D158), #28a745);
  border-radius: 10rpx;
  transition: width 0.3s ease;
}
.volume-value {
  font-size: 22rpx;
  color: var(--text-secondary, #8E8E93);
  min-width: 60rpx;
  text-align: right;
  font-weight: 500;
}

/* RPE分布 */
.rpe-distribution {
  padding: 12rpx 0;
}
.rpe-bar-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 20rpx;
}
.rpe-bar-label {
  font-size: 24rpx;
  color: var(--text-primary, #FFFFFF);
  min-width: 120rpx;
  font-weight: 500;
}
.rpe-bar-bg {
  flex: 1;
  height: 24rpx;
  background: var(--bg-tertiary, #2C2C2E);
  border-radius: 12rpx;
  overflow: hidden;
}
.rpe-bar-fill {
  height: 100%;
  border-radius: 12rpx;
  transition: width 0.3s ease;
}
.rpe-bar-fill.high {
  background: linear-gradient(90deg, var(--red, #FF453A), #d32f2f);
}
.rpe-bar-fill.medium {
  background: linear-gradient(90deg, var(--orange, #FF9F0A), #e65100);
}
.rpe-bar-fill.low {
  background: linear-gradient(90deg, var(--green, #30D158), #1b8a3a);
}
.rpe-bar-value {
  font-size: 24rpx;
  color: var(--text-secondary, #8E8E93);
  min-width: 60rpx;
  text-align: right;
  font-weight: 600;
}

/* 空状态 */
.empty-chart {
  padding: 60rpx 0;
  text-align: center;
}
.empty-text {
  font-size: 26rpx;
  color: var(--text-tertiary, #636366);
}

/* 本周总结 */
.weekly-summary {
  padding: 12rpx 0;
}
.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 0;
  border-bottom: 1rpx solid var(--separator, #38383A);
}
.summary-row:last-child {
  border-bottom: none;
}
.summary-label {
  font-size: 28rpx;
  color: var(--text-secondary, #8E8E93);
  font-weight: 400;
}
.summary-value {
  font-size: 28rpx;
  font-weight: 600;
  color: var(--text-primary, #FFFFFF);
}

/* 颜色辅助类 */
.text-danger {
  color: var(--red, #FF453A) !important;
}
.text-warning {
  color: var(--orange, #FF9F0A) !important;
}
.text-success {
  color: var(--green, #30D158) !important;
}
</style>
