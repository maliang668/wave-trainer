<template>
  <view class="rpe-input">
    <text class="rpe-label">{{ label }}</text>
    <!-- 新手模式 -->
    <view v-if="mode === 'beginner'" class="rpe-beginner">
      <view
        v-for="(level, i) in levels"
        :key="i"
        class="rpe-level"
        :class="{ active: modelValue === level.value }"
        @tap="$emit('update:modelValue', level.value)"
      >
        <text class="rpe-emoji">{{ level.emoji }}</text>
        <text class="rpe-text">{{ level.label }}</text>
      </view>
    </view>
    <!-- 进阶模式 -->
    <view v-else class="rpe-advanced">
      <slider
        :min="5" :max="10" :step="0.5"
        :value="modelValue"
        activeColor="#4fc3f7"
        backgroundColor="#2a2a4a"
        block-size="20"
        @change="$emit('update:modelValue', $event.detail.value)"
      />
      <text class="rpe-display">RPE {{ modelValue }}</text>
      <text class="rpe-desc">{{ description }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getRPEDescription } from '../core/algorithms/rpe-manager'

const props = withDefaults(defineProps<{
  modelValue: number
  mode?: 'beginner' | 'advanced'
  label?: string
}>(), {
  mode: 'beginner',
  label: 'RPE',
})

defineEmits(['update:modelValue'])

const levels = [
  { emoji: '😊', label: '轻松', value: 5.5 },
  { emoji: '💪', label: '适中', value: 7.5 },
  { emoji: '😤', label: '吃力', value: 9.5 },
]

const description = computed(() => getRPEDescription(props.modelValue))
</script>

<style scoped>
.rpe-input { margin: 16rpx 0; }
.rpe-label { font-size: 24rpx; color: #888; display: block; margin-bottom: 12rpx; }
.rpe-beginner { display: flex; gap: 12rpx; }
.rpe-level {
  flex: 1; text-align: center; padding: 16rpx 8rpx;
  background: #1a1a2e; border: 2rpx solid #3a3a5a; border-radius: 12rpx;
}
.rpe-level.active { border-color: #4fc3f7; background: rgba(79,195,247,0.1); }
.rpe-emoji { font-size: 32rpx; display: block; }
.rpe-text { font-size: 24rpx; color: #ccc; display: block; margin-top: 4rpx; }
.rpe-advanced { padding: 0 8rpx; }
.rpe-display { display: block; text-align: center; font-size: 28rpx; color: #4fc3f7; font-weight: 600; margin-top: 8rpx; }
.rpe-desc { display: block; text-align: center; font-size: 22rpx; color: #888; margin-top: 4rpx; }
</style>
