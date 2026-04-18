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
import { SPLIT_TEMPLATES } from '../../core/constants/config'
import { useTrainingStore } from '../../stores/training'

const trainingStore = useTrainingStore()
const templates = SPLIT_TEMPLATES
const selectedId = ref(trainingStore.selectedTemplateId || '')

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
  color: #e0e0e0;
  margin-bottom: 8rpx;
}
.header-sub {
  display: block;
  font-size: 26rpx;
  color: #888;
}

/* 模板卡片 */
.template-card {
  margin-bottom: 24rpx;
  border: 2rpx solid #2a2a4a;
  transition: all 0.2s;
}
.template-card.selected {
  border-color: #4fc3f7;
  background: linear-gradient(135deg, #1a1a2e, #16213e);
  box-shadow: 0 0 20rpx rgba(79, 195, 247, 0.15);
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
  color: #e0e0e0;
}

/* 等级标签 */
.level-badge {
  padding: 4rpx 16rpx;
  border-radius: 8rpx;
  font-size: 22rpx;
}
.level-badge.beginner {
  background: rgba(102, 187, 106, 0.2);
  color: #66bb6a;
}
.level-badge.intermediate {
  background: rgba(255, 167, 38, 0.2);
  color: #ffa726;
}
.level-badge.advanced {
  background: rgba(239, 83, 80, 0.2);
  color: #ef5350;
}
.level-text {
  font-size: 22rpx;
  font-weight: 600;
}

.template-desc {
  display: block;
  font-size: 26rpx;
  color: #aaa;
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
  background: #2a2a4a;
  padding: 6rpx 16rpx;
  border-radius: 8rpx;
}
.tag-icon { font-size: 22rpx; }
.tag-text { font-size: 22rpx; color: #ccc; }

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
  border-radius: 8rpx;
  background: #2a2a4a;
}
.cycle-day.active {
  background: rgba(79, 195, 247, 0.15);
  border: 1rpx solid rgba(79, 195, 247, 0.3);
}
.cycle-day.rest {
  background: rgba(136, 136, 136, 0.1);
  border: 1rpx solid rgba(136, 136, 136, 0.2);
}
.cycle-day-label {
  font-size: 20rpx;
  color: #888;
}
.cycle-day.active .cycle-day-label {
  color: #4fc3f7;
  font-weight: 600;
}

/* 选中指示器 */
.selected-indicator {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding-top: 12rpx;
  border-top: 1rpx solid #2a2a4a;
}
.check-icon {
  font-size: 28rpx;
  color: #4fc3f7;
  font-weight: 700;
}
.selected-text {
  font-size: 24rpx;
  color: #4fc3f7;
  font-weight: 600;
}

/* 确认按钮 */
.confirm-wrapper {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24rpx;
  background: #0f0f23;
  border-top: 1rpx solid #2a2a4a;
}
.confirm-btn {
  width: 100%;
  padding: 28rpx;
  font-size: 34rpx;
  border-radius: 16rpx;
  text-align: center;
}

/* 自定义方案入口 */
.custom-entry {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
  border: 2rpx dashed #3a3a5a;
  background: rgba(79, 195, 247, 0.03);
}
.custom-entry:active {
  background: rgba(79, 195, 247, 0.08);
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
  color: #4fc3f7;
}
.custom-entry-desc {
  display: block;
  font-size: 24rpx;
  color: #888;
  margin-top: 4rpx;
}
.custom-entry-arrow {
  font-size: 36rpx;
  color: #666;
  font-weight: 300;
}
</style>
