<template>
  <view class="page">
    <!-- 用户信息卡片 -->
    <view class="card user-card">
      <view class="user-avatar">
        <text class="avatar-text">{{ avatarText }}</text>
      </view>
      <view class="user-info">
        <text class="user-name">{{ userStore.profile?.nickName || '训练者' }}</text>
        <text class="user-stats">已训练 {{ trainingStore.totalTrainingDays }} 天</text>
      </view>
    </view>

    <!-- 身体数据 -->
    <view class="card">
      <view class="section-title">📏 身体数据</view>
      <view class="body-data-form">
        <view class="form-row">
          <text class="form-label">体重</text>
          <view class="form-input-group">
            <input
              type="digit"
              v-model="bodyWeight"
              class="form-input"
              placeholder="输入体重"
            />
            <text class="form-unit">kg</text>
          </view>
        </view>
        <view class="form-row">
          <text class="form-label">体脂率</text>
          <view class="form-input-group">
            <input
              type="digit"
              v-model="bodyFat"
              class="form-input"
              placeholder="选填"
            />
            <text class="form-unit">%</text>
          </view>
        </view>
        <view class="btn-primary save-body-btn" @tap="saveBodyData">
          记录身体数据
        </view>
      </view>

      <!-- 身体数据历史 -->
      <view v-if="userStore.bodyMetrics.length > 0" class="body-history">
        <text class="history-title">最近记录</text>
        <view v-for="metric in userStore.bodyMetrics.slice(0, 5)" :key="metric._id" class="history-row">
          <text class="history-date">{{ metric.date }}</text>
          <text class="history-weight">{{ metric.weight }}kg</text>
          <text v-if="metric.bodyFat" class="history-fat">{{ metric.bodyFat }}%</text>
        </view>
      </view>
    </view>

    <!-- 训练设置 -->
    <view class="card">
      <view class="section-title">⚙️ 训练设置</view>

      <view class="setting-row" @tap="toggleRPEMode">
        <text class="setting-label">RPE输入模式</text>
        <view class="setting-value">
          <text>{{ userStore.rpeMode === 'beginner' ? '新手(3档)' : '进阶(10级)' }}</text>
          <text class="setting-arrow">›</text>
        </view>
      </view>

      <view class="setting-row" @tap="toggleUnit">
        <text class="setting-label">重量单位</text>
        <view class="setting-value">
          <text>{{ userStore.weightUnit === 'kg' ? '公斤(kg)' : '磅(lb)' }}</text>
          <text class="setting-arrow">›</text>
        </view>
      </view>

      <view class="setting-row">
        <text class="setting-label">空杆重量</text>
        <view class="form-input-group" style="width: 160rpx;">
          <input
            type="digit"
            :value="String(userStore.barWeight)"
            class="form-input small"
            @blur="updateBarWeight"
          />
          <text class="form-unit">kg</text>
        </view>
      </view>

      <view class="setting-row">
        <text class="setting-label">默认组间休息</text>
        <view class="form-input-group" style="width: 160rpx;">
          <input
            type="number"
            :value="String(userStore.profile?.preferences.restTimerDefault || 120)"
            class="form-input small"
            @blur="updateRestTimer"
          />
          <text class="form-unit">秒</text>
        </view>
      </view>

      <view class="setting-row" @tap="toggleWarmup">
        <text class="setting-label">自动计算热身组</text>
        <switch
          :checked="userStore.profile?.preferences.enableWarmupCalc ?? true"
          color="#4fc3f7"
          @change="toggleWarmup"
        />
      </view>
    </view>

    <!-- 计划设置 -->
    <view class="card">
      <view class="section-title">📋 训练计划</view>
      <view class="setting-row" @tap="showPlanStartPicker = true">
        <text class="setting-label">计划开始日期</text>
        <view class="setting-value">
          <text>{{ trainingStore.planStartDate }}</text>
          <text class="setting-arrow">›</text>
        </view>
      </view>
      <view class="setting-row">
        <text class="setting-label">当前周期</text>
        <text class="setting-info">第{{ trainingStore.currentCycleWeek }}周 / 第{{ weekInCycle }}天</text>
      </view>
      <picker mode="date" :value="trainingStore.planStartDate" @change="onPlanDateChange">
        <view class="btn-secondary" style="margin-top: 12rpx;">修改计划开始日期</view>
      </picker>
    </view>

    <!-- 数据管理 -->
    <view class="card">
      <view class="section-title">💾 数据管理</view>
      <view class="setting-row" @tap="exportData">
        <text class="setting-label">导出训练数据</text>
        <text class="setting-arrow">›</text>
      </view>
      <view class="setting-row" @tap="confirmClearData">
        <text class="setting-label text-danger">清除所有数据</text>
        <text class="setting-arrow">›</text>
      </view>
    </view>

    <!-- 关于 -->
    <view class="card about-card">
      <text class="app-name">WaveTrainer</text>
      <text class="app-version">v1.0.0 MVP</text>
      <text class="app-desc">波浪负荷渐进循环训练助手</text>
      <text class="app-desc">科学训练，柔性坚持</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useUserStore } from '../../stores/user'
import { useTrainingStore } from '../../stores/training'
import { formatDate } from '../../utils/format'

const userStore = useUserStore()
const trainingStore = useTrainingStore()

// 身体数据输入
const bodyWeight = ref('')
const bodyFat = ref('')

// 计算属性
const avatarText = computed(() => {
  const name = userStore.profile?.nickName || '训练者'
  return name.charAt(0)
})

const weekInCycle = computed(() => {
  const week = trainingStore.currentCycleWeek
  return ((week - 1) % 4) + 1
})

// 保存身体数据
function saveBodyData() {
  const weight = parseFloat(bodyWeight.value)
  if (!weight || weight <= 0) {
    uni.showToast({ title: '请输入有效体重', icon: 'none' })
    return
  }

  userStore.addBodyMetric({
    date: formatDate(new Date()),
    weight,
    bodyFat: parseFloat(bodyFat.value) || undefined,
  })

  bodyWeight.value = ''
  bodyFat.value = ''
  uni.showToast({ title: '已记录', icon: 'success' })
}

// 设置操作
function toggleRPEMode() {
  const newMode = userStore.rpeMode === 'beginner' ? 'advanced' : 'beginner'
  userStore.updatePreferences({ rpeMode: newMode })
}

function toggleUnit() {
  const newUnit = userStore.weightUnit === 'kg' ? 'lb' : 'kg'
  userStore.updatePreferences({ weightUnit: newUnit })
}

function updateBarWeight(e: any) {
  const val = parseFloat(e.detail.value)
  if (val && val > 0 && userStore.profile) {
    userStore.updateProfile({ profile: { ...userStore.profile.profile, barWeight: val } })
  }
}

function updateRestTimer(e: any) {
  const val = parseInt(e.detail.value)
  if (val && val > 0 && userStore.profile) {
    userStore.updatePreferences({ restTimerDefault: val })
  }
}

function toggleWarmup(e: any) {
  if (userStore.profile) {
    userStore.updatePreferences({ enableWarmupCalc: e.detail.value })
  }
}

// 计划日期
const showPlanStartPicker = ref(false)

function onPlanDateChange(e: any) {
  trainingStore.setPlanStartDate(e.detail.value)
  uni.showToast({ title: '已更新', icon: 'success' })
}

// 数据管理
function exportData() {
  const data = {
    trainingLogs: trainingStore.trainingLogs,
    bodyMetrics: userStore.bodyMetrics,
    exerciseMaxes: userStore.exerciseMaxes,
    exportDate: new Date().toISOString(),
  }

  uni.showModal({
    title: '导出数据',
    content: '训练数据将复制到剪贴板',
    success: () => {
      uni.setClipboardData({
        data: JSON.stringify(data, null, 2),
        success: () => {
          uni.showToast({ title: '已复制到剪贴板', icon: 'success' })
        },
      })
    },
  })
}

function confirmClearData() {
  uni.showModal({
    title: '⚠️ 确认清除',
    content: '此操作不可撤销，所有训练数据将被永久删除',
    confirmText: '确认删除',
    confirmColor: '#ef5350',
    success: (res) => {
      if (res.confirm) {
        uni.clearStorageSync()
        uni.showToast({ title: '数据已清除', icon: 'success' })
        setTimeout(() => uni.reLaunch({ url: '/pages/index/index' }), 1000)
      }
    },
  })
}
</script>

<style scoped>
.page { padding-bottom: 40rpx; }

/* 用户卡片 */
.user-card {
  display: flex; align-items: center; gap: 24rpx;
  background: linear-gradient(135deg, #1a1a2e, #16213e);
  border: 1rpx solid #2a2a4a;
}
.user-avatar {
  width: 100rpx; height: 100rpx; border-radius: 50%;
  background: linear-gradient(135deg, #4fc3f7, #0288d1);
  display: flex; align-items: center; justify-content: center;
}
.avatar-text {
  font-size: 40rpx; font-weight: 700; color: white;
}
.user-info { flex: 1; }
.user-name { display: block; font-size: 34rpx; font-weight: 700; }
.user-stats { display: block; font-size: 24rpx; color: #888; margin-top: 4rpx; }

/* 通用 */
.section-title {
  font-size: 30rpx; font-weight: 600; color: #e0e0e0;
  margin-bottom: 20rpx; padding-left: 8rpx;
}

/* 身体数据表单 */
.body-data-form { padding: 0; }
.form-row {
  display: flex; justify-content: space-between;
  align-items: center; margin-bottom: 20rpx;
}
.form-label { font-size: 28rpx; color: #ccc; }
.form-input-group {
  display: flex; align-items: center; gap: 8rpx;
}
.form-input {
  background: #0f0f23; border: 1rpx solid #3a3a5a;
  border-radius: 8rpx; padding: 12rpx 16rpx;
  color: #e0e0e0; font-size: 28rpx; text-align: right;
  width: 200rpx;
}
.form-input.small { width: 100rpx; padding: 8rpx 12rpx; font-size: 26rpx; }
.form-unit { font-size: 24rpx; color: #888; }
.save-body-btn {
  width: 100%; padding: 20rpx; font-size: 28rpx;
  border-radius: 12rpx; text-align: center; margin-top: 8rpx;
}

/* 身体数据历史 */
.body-history { margin-top: 24rpx; padding-top: 16rpx; border-top: 1rpx solid #2a2a4a; }
.history-title { font-size: 24rpx; color: #888; margin-bottom: 12rpx; display: block; }
.history-row {
  display: flex; gap: 24rpx; padding: 8rpx 0;
  font-size: 26rpx; color: #aaa;
}
.history-date { flex: 1; }
.history-weight { color: #4fc3f7; font-weight: 600; }
.history-fat { color: #ffa726; }

/* 设置行 */
.setting-row {
  display: flex; justify-content: space-between;
  align-items: center; padding: 20rpx 0;
  border-bottom: 1rpx solid #1f1f3a;
}
.setting-row:last-child { border-bottom: none; }
.setting-label { font-size: 28rpx; color: #e0e0e0; }
.setting-value {
  display: flex; align-items: center; gap: 8rpx;
  font-size: 26rpx; color: #888;
}
.setting-info { font-size: 26rpx; color: #4fc3f7; }
.setting-arrow { font-size: 32rpx; color: #555; }

/* 关于 */
.about-card { text-align: center; padding: 40rpx 24rpx; }
.app-name { display: block; font-size: 36rpx; font-weight: 700; color: #4fc3f7; }
.app-version { display: block; font-size: 24rpx; color: #666; margin-top: 4rpx; }
.app-desc { display: block; font-size: 24rpx; color: #888; margin-top: 8rpx; }
</style>
