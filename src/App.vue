<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app'

onLaunch(() => {
  console.log('WaveTrainer App Launch')
})
</script>

<style>
/* 全局深色主题 */
page {
  background-color: #0f0f23;
  color: #e0e0e0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 28rpx;
  line-height: 1.6;
}

/* 通用样式 */
.container {
  padding: 24rpx;
}

.card {
  background-color: #1a1a2e;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
}

.text-primary {
  color: #4fc3f7;
}

.text-success {
  color: #66bb6a;
}

.text-warning {
  color: #ffa726;
}

.text-danger {
  color: #ef5350;
}

.text-muted {
  color: #888888;
}

.btn-primary {
  background: linear-gradient(135deg, #4fc3f7, #0288d1);
  color: white;
  border: none;
  border-radius: 12rpx;
  padding: 20rpx 40rpx;
  font-size: 30rpx;
  font-weight: 600;
  text-align: center;
}

.btn-secondary {
  background-color: #2a2a4a;
  color: #e0e0e0;
  border: 1rpx solid #3a3a5a;
  border-radius: 12rpx;
  padding: 20rpx 40rpx;
  font-size: 30rpx;
  text-align: center;
}
</style>