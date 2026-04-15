<template>
  <view class="weight-input">
    <view class="weight-btn minus" @tap="$emit('change', -delta)">-{{ delta }}</view>
    <input
      type="digit"
      :value="String(modelValue)"
      class="weight-field"
      @input="onInput"
    />
    <view class="weight-btn plus" @tap="$emit('change', delta)">+{{ delta }}</view>
  </view>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue: number
  delta?: number
  unit?: string
}>(), {
  delta: 2.5,
  unit: 'kg',
})

const emit = defineEmits(['update:modelValue', 'change'])

function onInput(e: any) {
  const val = parseFloat(e.detail.value)
  if (!isNaN(val) && val >= 0) {
    emit('update:modelValue', val)
  }
}
</script>

<style scoped>
.weight-input { display: flex; align-items: center; gap: 8rpx; }
.weight-btn {
  background: #2a2a4a; color: #4fc3f7; font-size: 24rpx;
  padding: 12rpx 16rpx; border-radius: 8rpx; min-width: 80rpx; text-align: center;
}
.weight-field {
  background: #1a1a2e; border: 1rpx solid #3a3a5a; border-radius: 8rpx;
  padding: 12rpx 16rpx; color: #e0e0e0; font-size: 30rpx; text-align: center;
  flex: 1; min-width: 120rpx;
}
</style>
