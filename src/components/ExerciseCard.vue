<template>
  <view class="exercise-card" :class="{ active: isActive }">
    <view class="ex-header">
      <text class="ex-name">{{ name }}</text>
      <text class="ex-muscle">{{ muscleGroup }}</text>
    </view>
    <view class="ex-info">
      <view class="info-item">
        <text class="info-label">重量</text>
        <text class="info-value text-primary">{{ weight }}kg</text>
      </view>
      <view class="info-item">
        <text class="info-label">组×次</text>
        <text class="info-value">{{ sets }}×{{ reps }}</text>
      </view>
      <view class="info-item">
        <text class="info-label">RPE</text>
        <text class="info-value text-warning">{{ rpe }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
defineProps<{
  name: string
  muscleGroup: string
  weight: number
  sets: number
  reps: string
  rpe: number
  isActive?: boolean
}>()
</script>

<style scoped>
.exercise-card {
  background: #1a1a2e; border-radius: 12rpx; padding: 20rpx;
  margin-bottom: 16rpx; border-left: 4rpx solid #3a3a5a;
}
.exercise-card.active { border-left-color: #4fc3f7; }
.ex-header { display: flex; justify-content: space-between; margin-bottom: 12rpx; }
.ex-name { font-size: 30rpx; font-weight: 600; }
.ex-muscle { font-size: 22rpx; color: #888; background: #2a2a4a; padding: 2rpx 10rpx; border-radius: 4rpx; }
.ex-info { display: flex; justify-content: space-around; }
.info-item { text-align: center; }
.info-label { display: block; font-size: 22rpx; color: #888; }
.info-value { font-size: 28rpx; font-weight: 600; }
</style>
