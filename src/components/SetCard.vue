<template>
  <view class="set-card" :class="{ completed: set.completed, warmup: set.isWarmup }">
    <text class="set-number">{{ set.isWarmup ? '🔥' : '#' }}{{ set.setNumber }}</text>
    <text class="set-data">{{ set.weight }}kg × {{ set.reps }}</text>
    <text class="set-rpe" :class="rpeColor">RPE {{ set.rpe }}</text>
    <text class="set-status">{{ set.completed ? '✅' : '⬜' }}</text>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TrainingSet } from '../core/types/training'

const props = defineProps<{ set: TrainingSet }>()

const rpeColor = computed(() => {
  if (props.set.rpe >= 9) return 'text-danger'
  if (props.set.rpe >= 8) return 'text-warning'
  return 'text-success'
})
</script>

<style scoped>
.set-card {
  display: flex; align-items: center; gap: 16rpx;
  padding: 12rpx 16rpx; border-radius: 8rpx;
  background: #1a1a2e; margin-bottom: 8rpx;
}
.set-card.completed { opacity: 0.7; }
.set-card.warmup { border-left: 3rpx solid #ffa726; }
.set-number { font-size: 26rpx; color: #888; min-width: 60rpx; }
.set-data { font-size: 28rpx; color: #e0e0e0; flex: 1; }
.set-rpe { font-size: 24rpx; min-width: 100rpx; text-align: center; }
.set-status { font-size: 24rpx; }
</style>
