<template>
  <view class="page">
    <!-- 方案名称 -->
    <view class="card name-card">
      <text class="section-label">方案名称</text>
      <input
        class="name-input"
        type="text"
        placeholder="例如：我的五天循环"
        :value="templateName"
        @input="onNameInput"
        maxlength="20"
      />
    </view>

    <!-- 循环日程列表 -->
    <view class="section-header">
      <text class="section-title">循环日程</text>
      <text class="section-hint">共{{ cycleDays.length }}天，训练{{ trainingDayCount }}天</text>
    </view>

    <view
      v-for="(day, index) in cycleDays"
      :key="index"
      class="card day-card"
    >
      <view class="day-main">
        <view class="day-type-badge" :class="{ rest: day.type === 'rest' }">
          <text class="day-type-icon">{{ getDayTypeIcon(day.type) }}</text>
        </view>
        <view class="day-info">
          <text class="day-label">{{ day.label }}</text>
          <text class="day-desc">{{ getDayTypeDesc(day.type) }}</text>
          <text class="day-exercises" v-if="day.type !== 'rest'">
            {{ day.exercises.length }}个动作
          </text>
        </view>
      </view>
      <view class="day-actions">
        <view class="action-btn" @tap="moveDay(index, -1)" :class="{ disabled: index === 0 }">
          <text class="action-icon">↑</text>
        </view>
        <view class="action-btn" @tap="moveDay(index, 1)" :class="{ disabled: index === cycleDays.length - 1 }">
          <text class="action-icon">↓</text>
        </view>
        <view class="action-btn delete" @tap="removeDay(index)">
          <text class="action-icon">✕</text>
        </view>
      </view>
    </view>

    <!-- 添加日程按钮 -->
    <view class="add-day-section">
      <text class="section-label">添加日程</text>
      <scroll-view scroll-x class="type-chips-scroll">
        <view class="type-chips">
          <view
            v-for="opt in dayTypeOptions"
            :key="opt.value"
            class="type-chip"
            :class="{ selected: selectedType === opt.value, rest: opt.value === 'rest' }"
            @tap="selectedType = opt.value"
          >
            <text class="chip-icon">{{ opt.icon }}</text>
            <text class="chip-label">{{ opt.label }}</text>
          </view>
        </view>
      </scroll-view>
      <view class="btn-primary add-btn" @tap="addDay">
        + 添加{{ selectedTypeLabel }}
      </view>
    </view>

    <!-- 循环预览 -->
    <view class="preview-section" v-if="cycleDays.length > 0">
      <text class="section-title">循环预览</text>
      <view class="cycle-preview">
        <view
          v-for="(day, index) in cycleDays"
          :key="'p'+index"
          class="preview-day"
          :class="{ rest: day.type === 'rest' }"
        >
          <text class="preview-icon">{{ getDayTypeIcon(day.type) }}</text>
          <text class="preview-label">{{ day.label.length > 2 ? day.label.substring(0, 2) : day.label }}</text>
        </view>
      </view>
    </view>

    <!-- 保存按钮 -->
    <view class="save-wrapper" v-if="canSave">
      <view class="btn-primary save-btn" @tap="saveTemplate">
        保存自定义方案
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { DAY_TYPE_OPTIONS, DAY_TYPE_DEFAULT_EXERCISES, CUSTOM_TEMPLATE_STORAGE_KEY } from '../../core/constants/config'
import type { SplitDayConfig } from '../../core/types/training'
import { useTrainingStore } from '../../stores/training'

const trainingStore = useTrainingStore()
const templateName = ref('我的自定义方案')
const cycleDays = ref<SplitDayConfig[]>([])
const selectedType = ref('chest')

const dayTypeOptions = DAY_TYPE_OPTIONS

const selectedTypeLabel = computed(() => {
  const opt = dayTypeOptions.find(o => o.value === selectedType.value)
  return opt ? opt.label : ''
})

const trainingDayCount = computed(() => cycleDays.value.filter(d => d.type !== 'rest').length)

const canSave = computed(() => {
  return templateName.value.trim().length > 0
    && cycleDays.value.length >= 2
    && trainingDayCount.value >= 1
})

function getDayTypeIcon(type: string): string {
  const opt = dayTypeOptions.find(o => o.value === type)
  return opt ? opt.icon : '🏋️'
}

function getDayTypeDesc(type: string): string {
  const opt = dayTypeOptions.find(o => o.value === type)
  return opt ? opt.description : ''
}

function onNameInput(e: any) {
  templateName.value = e.detail.value
}

function addDay() {
  const type = selectedType.value as any
  const opt = dayTypeOptions.find(o => o.value === type)
  const label = opt ? opt.label + '日' : '训练日'

  const dayConfig: SplitDayConfig = {
    dayIndex: cycleDays.value.length,
    label: type === 'rest' ? '休息' : label,
    type,
    exercises: type === 'rest' ? [] : [...(DAY_TYPE_DEFAULT_EXERCISES[type] || [])],
    description: opt ? opt.description : undefined,
  }

  cycleDays.value.push(dayConfig)
  // 重新编号
  cycleDays.value.forEach((d, i) => { d.dayIndex = i })
}

function removeDay(index: number) {
  cycleDays.value.splice(index, 1)
  cycleDays.value.forEach((d, i) => { d.dayIndex = i })
}

function moveDay(index: number, direction: number) {
  const newIndex = index + direction
  if (newIndex < 0 || newIndex >= cycleDays.value.length) return
  const temp = cycleDays.value[index]
  cycleDays.value[index] = cycleDays.value[newIndex]
  cycleDays.value[newIndex] = temp
  cycleDays.value.forEach((d, i) => { d.dayIndex = i })
}

function saveTemplate() {
  if (!canSave.value) return

  const customTemplate: SplitTemplate = {
    id: 'custom',
    name: templateName.value.trim(),
    description: `自定义方案：${cycleDays.value.length}天一循环，每周训练${trainingDayCount.value}天`,
    level: 'intermediate',
    daysPerWeek: trainingDayCount.value,
    cycleDays: cycleDays.value.length,
    days: [...cycleDays.value],
    isCustom: true,
  }

  // 保存到本地存储
  uni.setStorageSync(CUSTOM_TEMPLATE_STORAGE_KEY, JSON.stringify(customTemplate))

  // 选择该模板
  trainingStore.selectTemplate('custom')

  uni.showToast({ title: '自定义方案已保存！', icon: 'success' })
  setTimeout(() => {
    uni.navigateBack()
  }, 500)
}

// 加载已保存的自定义模板
function loadExistingCustom() {
  try {
    const saved = uni.getStorageSync(CUSTOM_TEMPLATE_STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved) as SplitTemplate
      templateName.value = parsed.name
      cycleDays.value = parsed.days.map(d => ({ ...d }))
    }
  } catch { /* ignore */ }
}

loadExistingCustom()
</script>

<style scoped>
.page {
  padding: 24rpx;
  padding-bottom: 160rpx;
}

/* 名称输入 */
.name-card {
  margin-bottom: 24rpx;
}
.section-label {
  display: block;
  font-size: 26rpx;
  color: #888;
  margin-bottom: 12rpx;
}
.name-input {
  background: #0f0f23;
  border: 1rpx solid #3a3a5a;
  border-radius: 12rpx;
  padding: 20rpx 24rpx;
  color: #e0e0e0;
  font-size: 32rpx;
}

/* 日程列表 */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}
.section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #e0e0e0;
}
.section-hint {
  font-size: 24rpx;
  color: #888;
}

.day-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
  padding: 20rpx 24rpx;
}
.day-main {
  display: flex;
  align-items: center;
  gap: 16rpx;
  flex: 1;
}
.day-type-badge {
  width: 72rpx;
  height: 72rpx;
  border-radius: 16rpx;
  background: rgba(79, 195, 247, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
}
.day-type-badge.rest {
  background: rgba(136, 136, 136, 0.1);
}
.day-type-icon { font-size: 32rpx; }
.day-info {
  flex: 1;
}
.day-label {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: #e0e0e0;
}
.day-desc {
  display: block;
  font-size: 22rpx;
  color: #888;
  margin-top: 4rpx;
}
.day-exercises {
  display: block;
  font-size: 22rpx;
  color: #4fc3f7;
  margin-top: 4rpx;
}

.day-actions {
  display: flex;
  gap: 8rpx;
}
.action-btn {
  width: 56rpx;
  height: 56rpx;
  border-radius: 12rpx;
  background: #2a2a4a;
  display: flex;
  align-items: center;
  justify-content: center;
}
.action-btn.disabled {
  opacity: 0.3;
}
.action-btn.delete {
  background: rgba(239, 83, 80, 0.15);
}
.action-icon {
  font-size: 24rpx;
  color: #ccc;
}
.action-btn.delete .action-icon {
  color: #ef5350;
}

/* 添加日程 */
.add-day-section {
  margin-top: 32rpx;
  margin-bottom: 24rpx;
}
.type-chips-scroll {
  white-space: nowrap;
  margin-bottom: 16rpx;
}
.type-chips {
  display: inline-flex;
  gap: 12rpx;
  padding: 4rpx 0;
}
.type-chip {
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
  padding: 12rpx 20rpx;
  border-radius: 24rpx;
  background: #2a2a4a;
  border: 2rpx solid transparent;
}
.type-chip.selected {
  border-color: #4fc3f7;
  background: rgba(79, 195, 247, 0.1);
}
.type-chip.rest.selected {
  border-color: #888;
  background: rgba(136, 136, 136, 0.1);
}
.chip-icon { font-size: 24rpx; }
.chip-label { font-size: 24rpx; color: #ccc; }
.type-chip.selected .chip-label { color: #4fc3f7; font-weight: 600; }
.type-chip.rest.selected .chip-label { color: #aaa; }

.add-btn {
  width: 100%;
  padding: 20rpx;
  font-size: 28rpx;
  border-radius: 12rpx;
  text-align: center;
  background: #2a2a4a;
  color: #4fc3f7;
  border: 1rpx solid #3a3a5a;
}

/* 循环预览 */
.preview-section {
  margin-top: 32rpx;
  margin-bottom: 24rpx;
}
.cycle-preview {
  display: flex;
  gap: 8rpx;
  flex-wrap: wrap;
  margin-top: 16rpx;
}
.preview-day {
  flex: 1;
  min-width: 100rpx;
  text-align: center;
  padding: 16rpx 8rpx;
  border-radius: 12rpx;
  background: rgba(79, 195, 247, 0.1);
  border: 1rpx solid rgba(79, 195, 247, 0.2);
}
.preview-day.rest {
  background: rgba(136, 136, 136, 0.08);
  border-color: rgba(136, 136, 136, 0.15);
}
.preview-icon { display: block; font-size: 28rpx; margin-bottom: 4rpx; }
.preview-label { display: block; font-size: 22rpx; color: #4fc3f7; font-weight: 600; }
.preview-day.rest .preview-label { color: #888; }

/* 保存按钮 */
.save-wrapper {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24rpx;
  background: #0f0f23;
  border-top: 1rpx solid #2a2a4a;
}
.save-btn {
  width: 100%;
  padding: 28rpx;
  font-size: 34rpx;
  border-radius: 16rpx;
  text-align: center;
}
</style>
