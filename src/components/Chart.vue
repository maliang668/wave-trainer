<template>
  <view class="chart-container">
    <view v-if="title" class="chart-title">
      <text>{{ title }}</text>
    </view>
    <view class="chart-canvas-wrapper">
      <canvas
        :canvas-id="canvasId"
        :id="canvasId"
        class="chart-canvas"
        :style="{ width: `${width}px`, height: `${height}px` }"
      />
    </view>
    <view v-if="legend.length > 0" class="chart-legend">
      <view
        v-for="(item, index) in legend"
        :key="index"
        class="legend-item"
      >
        <view class="legend-color" :style="{ backgroundColor: item.color }" />
        <text class="legend-text">{{ item.label }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'

const props = withDefaults(defineProps<{
  canvasId?: string
  title?: string
  width?: number
  height?: number
  legend?: Array<{ label: string; color: string }>
}>(), {
  canvasId: 'chart',
  title: '',
  width: 300,
  height: 200,
  legend: () => [],
})

const emit = defineEmits<{
  ready: [context: any]
}>()

onMounted(() => {
  // 在小程序中，canvas需要在mounted后初始化
  // 实际图表绘制逻辑将在后续实现中完善
  setTimeout(() => {
    const query = uni.createSelectorQuery()
    query.select(`#${props.canvasId}`)
      // @ts-ignore - uni-app fields 参数类型定义不完整
      .fields({ node: true, size: true } as any)
      .exec((res) => {
        if (res[0]) {
          emit('ready', res[0])
        }
      })
  }, 100)
})
</script>

<style scoped>
.chart-container {
  background-color: #1a1a2e;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
}

.chart-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #e0e0e0;
  margin-bottom: 16rpx;
}

.chart-canvas-wrapper {
  display: flex;
  justify-content: center;
}

.chart-canvas {
  width: 100%;
}

.chart-legend {
  display: flex;
  gap: 24rpx;
  justify-content: center;
  margin-top: 16rpx;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.legend-color {
  width: 16rpx;
  height: 16rpx;
  border-radius: 4rpx;
}

.legend-text {
  font-size: 22rpx;
  color: #888888;
}
</style>