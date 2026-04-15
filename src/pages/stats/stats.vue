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
.page { padding-bottom: 40rpx; }

/* 筛选栏 */
.filter-bar {
  display: flex; gap: 12rpx; padding: 16rpx 24rpx;
  background: #1a1a2e; position: sticky; top: 0; z-index: 10;
}
.filter-item {
  padding: 8rpx 24rpx; border-radius: 20rpx;
  background: #2a2a4a; font-size: 26rpx; color: #888;
}
.filter-item.active { background: #4fc3f7; color: #0f0f23; font-weight: 600; }

/* 统计概览 */
.stats-overview {
  display: grid; grid-template-columns: 1fr 1fr; gap: 16rpx;
  padding: 16rpx 24rpx;
}
.stat-card {
  background: #1a1a2e; border-radius: 12rpx; padding: 20rpx;
  text-align: center;
}
.stat-value { display: block; font-size: 36rpx; font-weight: 700; color: #4fc3f7; }
.stat-label { display: block; font-size: 22rpx; color: #888; margin-top: 4rpx; }

/* 区块卡片 */
.section-card { margin: 16rpx 24rpx; }
.section-header { margin-bottom: 20rpx; }
.section-title { font-size: 30rpx; font-weight: 600; }

/* 趋势选择器 */
.trend-selector {
  display: flex; gap: 8rpx; margin-bottom: 20rpx;
  overflow-x: auto; white-space: nowrap;
}
.trend-tab {
  padding: 6rpx 16rpx; border-radius: 16rpx;
  background: #2a2a4a; font-size: 24rpx; color: #888;
  flex-shrink: 0;
}
.trend-tab.active { background: rgba(79,195,247,0.2); color: #4fc3f7; }

/* 柱状图 */
.chart-area { padding: 16rpx 0; }
.chart-bars {
  display: flex; align-items: flex-end; gap: 8rpx;
  height: 280rpx; padding: 0 8rpx;
}
.chart-bar-wrapper {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; height: 100%;
  justify-content: flex-end;
}
.bar-value { font-size: 20rpx; color: #aaa; margin-bottom: 4rpx; }
.chart-bar {
  width: 100%; min-height: 8rpx;
  background: linear-gradient(180deg, #4fc3f7, #0288d1);
  border-radius: 4rpx 4rpx 0 0;
  transition: height 0.3s;
}
.bar-label { font-size: 18rpx; color: #666; margin-top: 8rpx; }

/* 容量图 */
.volume-chart { padding: 8rpx 0; }
.volume-row {
  display: flex; align-items: center; gap: 12rpx;
  margin-bottom: 12rpx;
}
.volume-label { font-size: 22rpx; color: #888; min-width: 80rpx; }
.volume-bar-bg {
  flex: 1; height: 16rpx; background: #2a2a4a;
  border-radius: 8rpx; overflow: hidden;
}
.volume-bar-fill {
  height: 100%; background: linear-gradient(90deg, #66bb6a, #43a047);
  border-radius: 8rpx; transition: width 0.3s;
}
.volume-value { font-size: 22rpx; color: #aaa; min-width: 60rpx; text-align: right; }

/* RPE分布 */
.rpe-distribution { padding: 8rpx 0; }
.rpe-bar-row {
  display: flex; align-items: center; gap: 12rpx;
  margin-bottom: 16rpx;
}
.rpe-bar-label { font-size: 24rpx; color: #ccc; min-width: 120rpx; }
.rpe-bar-bg {
  flex: 1; height: 24rpx; background: #2a2a4a;
  border-radius: 12rpx; overflow: hidden;
}
.rpe-bar-fill {
  height: 100%; border-radius: 12rpx; transition: width 0.3s;
}
.rpe-bar-fill.high { background: linear-gradient(90deg, #ef5350, #c62828); }
.rpe-bar-fill.medium { background: linear-gradient(90deg, #ffa726, #e65100); }
.rpe-bar-fill.low { background: linear-gradient(90deg, #66bb6a, #2e7d32); }
.rpe-bar-value { font-size: 24rpx; color: #aaa; min-width: 60rpx; text-align: right; }

/* 空状态 */
.empty-chart {
  padding: 60rpx 0; text-align: center;
}
.empty-text { font-size: 26rpx; color: #666; }

/* 本周总结 */
.weekly-summary { padding: 8rpx 0; }
.summary-row {
  display: flex; justify-content: space-between;
  padding: 12rpx 0; border-bottom: 1rpx solid #2a2a4a;
}
.summary-row:last-child { border-bottom: none; }
.summary-label { font-size: 28rpx; color: #aaa; }
.summary-value { font-size: 28rpx; font-weight: 600; color: #e0e0e0; }
</style>
