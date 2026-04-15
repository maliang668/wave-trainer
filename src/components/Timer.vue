<template>
  <view class="timer">
    <text class="timer-display">{{ display }}</text>
    <view class="timer-controls">
      <view class="btn-secondary" @tap="$emit('skip')">跳过</view>
      <view class="btn-primary" @tap="toggle">{{ running ? '暂停' : '开始' }}</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'

const props = withDefaults(defineProps<{
  seconds?: number
  autoStart?: boolean
}>(), {
  seconds: 120,
  autoStart: false,
})

const emit = defineEmits(['skip', 'complete', 'tick'])

const remaining = ref(props.seconds)
const running = ref(props.autoStart)
let interval: ReturnType<typeof setInterval> | null = null

const display = computed(() => {
  const m = Math.floor(remaining.value / 60)
  const s = remaining.value % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
})

function toggle() {
  running.value ? stop() : start()
}

function start() {
  running.value = true
  interval = setInterval(() => {
    if (remaining.value > 0) {
      remaining.value--
      emit('tick', remaining.value)
    } else {
      stop()
      emit('complete')
    }
  }, 1000)
}

function stop() {
  if (interval) { clearInterval(interval); interval = null }
  running.value = false
}

function reset() {
  stop()
  remaining.value = props.seconds
}

onUnmounted(() => stop())

defineExpose({ start, stop, reset, running, remaining })
</script>

<style scoped>
.timer { text-align: center; padding: 24rpx; }
.timer-display {
  font-size: 72rpx; font-weight: 700; color: #4fc3f7;
  font-variant-numeric: tabular-nums; display: block; margin-bottom: 24rpx;
}
.timer-controls { display: flex; gap: 16rpx; justify-content: center; }
</style>
