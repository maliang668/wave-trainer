<template>
  <view class="page">
    <!-- 智能建议卡片 -->
    <view class="recommendations">
      <view class="section-title">🧠 智能建议</view>
      <view v-if="trainingStore.recommendations.length > 0">
        <view
          v-for="(rec, i) in trainingStore.recommendations"
          :key="i"
          class="card rec-card"
          :class="rec.type"
        >
          <view class="rec-header">
            <text class="rec-icon">{{ getRecIcon(rec.type) }}</text>
            <text class="rec-title">{{ rec.title }}</text>
          </view>
          <text class="rec-message">{{ rec.message }}</text>
          <view class="rec-actions" v-if="rec.type === 'deload_reminder'">
            <view class="btn-primary btn-sm" @tap="applyDeload">安排减负周</view>
            <view class="btn-secondary btn-sm" @tap="dismissRec(i)">继续训练</view>
          </view>
          <view class="rec-actions" v-if="rec.type === 'plateau_break'">
            <view class="btn-primary btn-sm" @tap="viewBreakthrough">查看突破方案</view>
          </view>
          <view class="rec-actions" v-if="rec.type === 'return_plan'">
            <view class="btn-primary btn-sm" @tap="viewReturnPlan">查看回归方案</view>
          </view>
        </view>
      </view>
      <view v-else class="card empty-rec">
        <text class="empty-rec-text">✅ 一切正常，继续保持！</text>
        <text class="empty-rec-sub">建议将积累更多训练数据后，智能助手会提供更精准的分析</text>
      </view>
    </view>

    <!-- 疲劳评估 -->
    <view class="card fatigue-card">
      <view class="section-title">⚡ 疲劳评估</view>
      <view class="fatigue-score" :class="fatigueLevel">
        <text class="fatigue-number">{{ fatigueScore }}</text>
        <text class="fatigue-label">{{ fatigueLevelText }}</text>
      </view>
      <text class="fatigue-advice">{{ fatigueAdvice }}</text>
      <view class="fatigue-metrics">
        <view class="metric-row">
          <text class="metric-label">RPE趋势</text>
          <text class="metric-value" :class="rpeTrendColor">{{ rpeTrendText }}</text>
        </view>
        <view class="metric-row">
          <text class="metric-label">本周休息天数</text>
          <text class="metric-value">{{ restDaysText }}</text>
        </view>
        <view class="metric-row">
          <text class="metric-label">容量变化</text>
          <text class="metric-value" :class="volumeChangeColor">{{ volumeChangeText }}</text>
        </view>
      </view>
    </view>

    <!-- 情境记录 -->
    <view class="card context-card">
      <view class="section-title">📝 今日情境</view>
      <text class="context-sub">记录今天的身体状态，帮助系统提供更精准的建议</text>

      <view class="context-item">
        <text class="context-label">😴 睡眠质量</text>
        <view class="star-rating">
          <text
            v-for="i in 5" :key="'s'+i"
            class="star"
            :class="{ filled: contextData.sleepQuality >= i }"
            @tap="contextData.sleepQuality = i"
          >★</text>
        </view>
      </view>

      <view class="context-item">
        <text class="context-label">😰 压力水平</text>
        <view class="star-rating">
          <text
            v-for="i in 5" :key="'st'+i"
            class="star"
            :class="{ filled: contextData.stressLevel >= i }"
            @tap="contextData.stressLevel = i"
          >★</text>
        </view>
      </view>

      <view class="context-item">
        <text class="context-label">🥗 营养质量</text>
        <view class="star-rating">
          <text
            v-for="i in 5" :key="'n'+i"
            class="star"
            :class="{ filled: contextData.nutritionQuality >= i }"
            @tap="contextData.nutritionQuality = i"
          >★</text>
        </view>
      </view>

      <view class="context-item">
        <text class="context-label">🔥 训练动力</text>
        <view class="star-rating">
          <text
            v-for="i in 5" :key="'m'+i"
            class="star"
            :class="{ filled: contextData.motivation >= i }"
            @tap="contextData.motivation = i"
          >★</text>
        </view>
      </view>

      <view class="btn-primary save-context-btn" @tap="saveContext">
        保存
      </view>
    </view>

    <!-- 停训回归方案 -->
    <view v-if="showReturnPlan" class="card return-plan-card">
      <view class="section-title">🔄 停训回归方案</view>
      <view v-for="(week, i) in returnPlan.weeks" :key="i" class="return-week">
        <view class="rw-header">
          <text class="rw-phase">{{ week.message }}</text>
        </view>
        <view class="rw-details">
          <text class="rw-detail">容量: {{ week.volumePercent }}%</text>
          <text class="rw-detail">强度: {{ week.intensityPercent }}%</text>
          <text class="rw-detail">RPE: {{ week.rpeTarget }}</text>
        </view>
      </view>
      <text v-if="returnPlan.note" class="return-note">{{ returnPlan.note }}</text>
      <view class="btn-secondary" @tap="showReturnPlan = false" style="margin-top: 16rpx;">关闭</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useTrainingStore } from '../../stores/training'
import { assessFatigue } from '../../core/algorithms/fatigue-assessor'
import { generateReturnPlan } from '../../core/algorithms/return-planner'
import type { ContextData } from '../../core/types/training'

const trainingStore = useTrainingStore()

// 情境数据
const contextData = reactive<ContextData>({
  sleepQuality: 3,
  stressLevel: 3,
  nutritionQuality: 3,
  motivation: 3,
})

// 停训回归
const showReturnPlan = ref(false)
const returnPlan = computed(() => {
  if (trainingStore.trainingLogs.length === 0) {
    return generateReturnPlan(30) // 默认展示
  }
  const lastDate = trainingStore.trainingLogs[0].date
  const days = Math.floor((Date.now() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24))
  return generateReturnPlan(Math.max(days, 7))
})

// 疲劳评估 —— 使用 assessFatigue（fatigue-assessor.ts 的实际导出函数）
// 参数签名: assessFatigue(logs, { sleep, stress, nutrition })
const fatigue = computed(() =>
  assessFatigue(trainingStore.trainingLogs, {
    sleep: contextData.sleepQuality,
    stress: contextData.stressLevel,
    nutrition: contextData.nutritionQuality,
  })
)

const fatigueScore = computed(() => fatigue.value.fatigueScore)
const fatigueLevel = computed(() => fatigue.value.level)
const fatigueLevelText = computed(() => {
  const map: Record<string, string> = { low: '恢复良好', moderate: '轻度疲劳', high: '高度疲劳' }
  return map[fatigue.value.level] || '未知'
})
const fatigueAdvice = computed(() => fatigue.value.advice)

const rpeTrendText = computed(() => {
  const map: Record<string, string> = {
    increasing: '📈 上升中', stable_high: '⚠️ 持续偏高',
    stable: '➡️ 稳定', decreasing: '📉 下降中',
  }
  return map[fatigue.value.metrics.rpeTrend] || '➡️ 稳定'
})
const rpeTrendColor = computed(() => {
  const t = fatigue.value.metrics.rpeTrend
  if (t === 'increasing' || t === 'stable_high') return 'text-danger'
  if (t === 'decreasing') return 'text-success'
  return 'text-muted'
})

const restDaysText = computed(() => {
  const d = fatigue.value.metrics.restDays
  if (d >= 4) return `${d}天 ✅`
  if (d >= 2) return `${d}天 ⚡`
  return `${d}天 ⚠️`
})

const volumeChange = computed(() => fatigue.value.metrics.performanceChange)
const volumeChangeText = computed(() => {
  const c = volumeChange.value
  if (c > 5) return `+${c.toFixed(0)}% 📈`
  if (c < -5) return `${c.toFixed(0)}% 📉`
  return `${c >= 0 ? '+' : ''}${c.toFixed(0)}% ➡️`
})
const volumeChangeColor = computed(() => {
  if (volumeChange.value < -10) return 'text-danger'
  if (volumeChange.value > 5) return 'text-success'
  return 'text-muted'
})

// 建议图标
function getRecIcon(type: string): string {
  const icons: Record<string, string> = {
    fatigue_warning: '⚠️', plateau_break: '🔍', deload_reminder: '🔔',
    return_plan: '🔄', progress_note: '📈',
  }
  return icons[type] || '💡'
}

// 操作
function applyDeload() {
  uni.showToast({ title: '减负周已安排', icon: 'success' })
}

function dismissRec(index: number) {
  trainingStore.recommendations.splice(index, 1)
}

function viewBreakthrough() {
  uni.showToast({ title: '突破方案已生成', icon: 'success' })
}

function viewReturnPlan() {
  showReturnPlan.value = true
}

function saveContext() {
  trainingStore.updateContextData({ ...contextData })
  trainingStore.generateRecommendations()
  uni.showToast({ title: '已保存', icon: 'success' })
}
</script>

<style scoped>
.page { padding-bottom: 40rpx; }

/* 建议卡片 */
.recommendations { padding: 0 24rpx; }
.section-title {
  font-size: 30rpx; font-weight: 600; color: #e0e0e0;
  margin: 24rpx 0 16rpx; padding-left: 8rpx;
}
.rec-card {
  margin-bottom: 16rpx; border-left: 4rpx solid #3a3a5a;
}
.rec-card.fatigue_warning { border-left-color: #ef5350; }
.rec-card.plateau_break { border-left-color: #ffa726; }
.rec-card.deload_reminder { border-left-color: #42a5f5; }
.rec-card.return_plan { border-left-color: #ab47bc; }
.rec-card.progress_note { border-left-color: #66bb6a; }
.rec-header {
  display: flex; align-items: center; gap: 12rpx; margin-bottom: 12rpx;
}
.rec-icon { font-size: 32rpx; }
.rec-title { font-size: 30rpx; font-weight: 600; }
.rec-message { font-size: 26rpx; color: #ccc; line-height: 1.6; }
.rec-actions {
  display: flex; gap: 12rpx; margin-top: 16rpx;
}
.btn-sm {
  padding: 12rpx 24rpx; font-size: 24rpx; border-radius: 8rpx;
}
.empty-rec {
  text-align: center; padding: 40rpx 24rpx;
}
.empty-rec-text { display: block; font-size: 28rpx; color: #66bb6a; }
.empty-rec-sub { display: block; font-size: 24rpx; color: #666; margin-top: 8rpx; }

/* 疲劳评估 */
.fatigue-card { margin: 0 24rpx 16rpx; }
.fatigue-score {
  display: flex; align-items: center; gap: 20rpx;
  padding: 24rpx; border-radius: 12rpx; margin-bottom: 16rpx;
}
.fatigue-score.low { background: rgba(102,187,106,0.1); }
.fatigue-score.moderate { background: rgba(255,167,38,0.1); }
.fatigue-score.high { background: rgba(239,83,80,0.1); }
.fatigue-number { font-size: 56rpx; font-weight: 700; }
.fatigue-score.low .fatigue-number { color: #66bb6a; }
.fatigue-score.moderate .fatigue-number { color: #ffa726; }
.fatigue-score.high .fatigue-number { color: #ef5350; }
.fatigue-label { font-size: 28rpx; color: #ccc; }
.fatigue-advice {
  display: block; font-size: 26rpx; color: #aaa;
  line-height: 1.6; margin-bottom: 16rpx;
}
.fatigue-metrics { padding-top: 16rpx; border-top: 1rpx solid #2a2a4a; }
.metric-row {
  display: flex; justify-content: space-between;
  padding: 10rpx 0;
}
.metric-label { font-size: 26rpx; color: #888; }
.metric-value { font-size: 26rpx; font-weight: 600; }

/* 情境记录 */
.context-card { margin: 0 24rpx 16rpx; }
.context-sub {
  display: block; font-size: 24rpx; color: #666;
  margin-bottom: 24rpx;
}
.context-item {
  display: flex; justify-content: space-between;
  align-items: center; margin-bottom: 20rpx;
}
.context-label { font-size: 28rpx; }
.star-rating { display: flex; gap: 8rpx; }
.star {
  font-size: 36rpx; color: #3a3a5a;
  transition: color 0.2s;
}
.star.filled { color: #ffc107; }
.save-context-btn {
  margin-top: 16rpx; width: 100%; padding: 20rpx;
  font-size: 28rpx; border-radius: 12rpx; text-align: center;
}

/* 停训回归 */
.return-plan-card { margin: 0 24rpx 16rpx; }
.return-week {
  padding: 16rpx 0; border-bottom: 1rpx solid #2a2a4a;
}
.return-week:last-of-type { border-bottom: none; }
.rw-header { margin-bottom: 8rpx; }
.rw-phase { font-size: 26rpx; color: #4fc3f7; font-weight: 600; }
.rw-details { display: flex; gap: 24rpx; }
.rw-detail { font-size: 24rpx; color: #888; }
.return-note {
  display: block; margin-top: 16rpx; padding: 16rpx;
  background: rgba(79,195,247,0.1); border-radius: 8rpx;
  font-size: 24rpx; color: #4fc3f7; line-height: 1.6;
}
</style>
