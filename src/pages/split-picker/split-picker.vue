<template>
  <view class="page">
    <view class="header">
      <text class="header-title">选择训练方案</text>
      <text class="header-sub">根据你的训练经验选择合适的分化方案</text>
    </view>

    <view
      v-for="template in templates"
      :key="template.id"
      class="card template-card"
      :class="{ selected: selectedId === template.id }"
      @tap="selectTemplate(template.id)"
    >
      <!-- 头部：名称 + 等级 -->
      <view class="template-header">
        <text class="template-name">{{ template.name }}</text>
        <view class="level-badge" :class="template.level">
          <text class="level-text">{{ levelLabels[template.level] }}</text>
        </view>
      </view>

      <!-- 描述 -->
      <text class="template-desc">{{ template.description }}</text>

      <!-- 信息标签 -->
      <view class="template-tags">
        <view class="tag">
          <text class="tag-icon">📅</text>
          <text class="tag-text">每周{{ template.daysPerWeek }}天</text>
        </view>
        <view class="tag">
          <text class="tag-icon">🔄</text>
          <text class="tag-text">{{ template.cycleDays }}天一循环</text>
        </view>
      </view>

      <!-- 循环日程可视化 -->
      <view class="cycle-visual">
        <view
          v-for="(day, index) in template.days"
          :key="index"
          class="cycle-day"
          :class="{ rest: day.type === 'rest', active: day.type !== 'rest' }"
        >
          <text class="cycle-day-label">{{ day.label.length > 2 ? day.label.substring(0, 2) : day.label }}</text>
        </view>
      </view>

      <!-- 选中指示器 -->
      <view v-if="selectedId === template.id" class="selected-indicator">
        <text class="check-icon">✓</text>
        <text class="selected-text">已选择</text>
      </view>
    </view>

    <!-- 自定义方案入口 -->
    <view class="card custom-entry" @tap="goToCustom">
      <view class="custom-entry-main">
        <text class="custom-entry-icon">✨</text>
        <view class="custom-entry-info">
          <text class="custom-entry-title">自定义方案</text>
          <text class="custom-entry-desc">根据自己的需求创建个性化训练分化</text>
        </view>
      </view>
      <text class="custom-entry-arrow">›</text>
    </view>

    <!-- 确认按钮 -->
    <view class="confirm-wrapper" v-if="selectedId">
      <view class="btn-primary confirm-btn" @tap="confirmSelection">
        确认选择
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { SPLIT_TEMPLATES, CUSTOM_TEMPLATE_STORAGE_KEY } from '../../core/constants/config'
import { useTrainingStore } from '../../stores/training'
import type { SplitTemplate } from '../../core/types/training'

const trainingStore = useTrainingStore()
const selectedId = ref(trainingStore.selectedTemplateId || '')

// 模板列表（含自定义方案）
const templates = ref<SplitTemplate[]>([...SPLIT_TEMPLATES])

// 每次页面显示时重新加载（因为 localStorage 不是响应式的）
function loadTemplates() {
  const list = [...SPLIT_TEMPLATES]
  try {
    const saved = uni.getStorageSync(CUSTOM_TEMPLATE_STORAGE_KEY)
    if (saved) {
      const custom = JSON.parse(saved) as SplitTemplate
      if (!list.find(t => t.id === custom.id)) {
        list.push(custom)
      }
    }
  } catch { /* ignore */ }
  templates.value = list
  // 同步选中状态
  selectedId.value = trainingStore.selectedTemplateId || ''
}

onShow(() => {
  loadTemplates()
})

const levelLabels: Record<string, string> = {
  beginner: '新手',
  intermediate: '进阶',
  advanced: '高级',
}

function selectTemplate(id: string) {
  selectedId.value = id
}

function confirmSelection() {
  if (!selectedId.value) return
  trainingStore.selectTemplate(selectedId.value)
  uni.showToast({ title: '方案已选择！', icon: 'success' })
  setTimeout(() => {
    uni.navigateBack()
  }, 500)
}

function goToCustom() {
  uni.navigateTo({ url: '/pages/custom-split/custom-split' })
}
</script>

<style scoped>
.page {
  padding: 24rpx;
  padding-bottom: 160rpx;
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

/* 模板卡片 */
.template-card {
  margin-bottom: 24rpx;
  border: 2rpx solid var(--separator);
  transition: all 0.2s;
}
.template-card.selected {
  border-color: var(--accent);
  background: var(--bg-secondary);
  box-shadow: 0 0 20rpx rgba(10, 132, 255, 0.15);
}

.template-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}
.template-name {
  font-size: 34rpx;
  font-weight: 700;
  color: var(--text-primary);
}

/* 等级标签 */
.level-badge {
  padding: 4rpx 16rpx;
  border-radius: var(--radius-sm);
  font-size: 22rpx;
}
.level-badge.beginner {
  background: rgba(48, 209, 88, 0.2);
  color: var(--green);
}
.level-badge.intermediate {
  background: rgba(255, 159, 10, 0.2);
  color: var(--orange);
}
.level-badge.advanced {
  background: rgba(255, 69, 58, 0.2);
  color: var(--red);
}
.level-text {
  font-size: 22rpx;
  font-weight: 600;
}

.template-desc {
  display: block;
  font-size: 26rpx;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 16rpx;
}

/* 信息标签 */
.template-tags {
  display: flex;
  gap: 16rpx;
  margin-bottom: 16rpx;
}
.tag {
  display: flex;
  align-items: center;
  gap: 6rpx;
  background: var(--bg-tertiary);
  padding: 6rpx 16rpx;
  border-radius: var(--radius-sm);
}
.tag-icon { font-size: 22rpx; }
.tag-text { font-size: 22rpx; color: var(--text-secondary); }

/* 循环日程可视化 */
.cycle-visual {
  display: flex;
  gap: 8rpx;
  flex-wrap: wrap;
  margin-bottom: 12rpx;
}
.cycle-day {
  flex: 1;
  min-width: 80rpx;
  text-align: center;
  padding: 10rpx 4rpx;
  border-radius: var(--radius-sm);
  background: var(--bg-tertiary);
}
.cycle-day.active {
  background: rgba(10, 132, 255, 0.15);
  border: 1rpx solid rgba(10, 132, 255, 0.3);
}
.cycle-day.rest {
  background: rgba(142, 142, 147, 0.1);
  border: 1rpx solid rgba(142, 142, 147, 0.2);
}
.cycle-day-label {
  font-size: 20rpx;
  color: var(--text-secondary);
}
.cycle-day.active .cycle-day-label {
  color: var(--accent);
  font-weight: 600;
}

/* 选中指示器 */
.selected-indicator {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding-top: 12rpx;
  border-top: 1rpx solid var(--separator);
}
.check-icon {
  font-size: 28rpx;
  color: var(--accent);
  font-weight: 700;
}
.selected-text {
  font-size: 24rpx;
  color: var(--accent);
  font-weight: 600;
}

/* 确认按钮 */
.confirm-wrapper {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24rpx;
  background: var(--bg-primary);
  border-top: 1rpx solid var(--separator);
}
.confirm-btn {
  width: 100%;
  padding: 28rpx;
  font-size: 34rpx;
  border-radius: var(--radius-md);
  text-align: center;
}

/* 自定义方案入口 */
.custom-entry {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
  border: 2rpx dashed var(--separator-opaque);
  background: rgba(10, 132, 255, 0.03);
}
.custom-entry:active {
  background: rgba(10, 132, 255, 0.08);
}
.custom-entry-main {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.custom-entry-icon { font-size: 40rpx; }
.custom-entry-info {
  flex: 1;
}
.custom-entry-title {
  display: block;
  font-size: 32rpx;
  font-weight: 700;
  color: var(--accent);
}
.custom-entry-desc {
  display: block;
  font-size: 24rpx;
  color: var(--text-secondary);
  margin-top: 4rpx;
}
.custom-entry-arrow {
  font-size: 36rpx;
  color: var(--text-tertiary);
  font-weight: 300;
}
</style>
