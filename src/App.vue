<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app'

onLaunch(() => {
  console.log('WaveTrainer App Launch')
})
</script>

<style>
/* ========================================
   Apple Health + Gemini Design System
   Dark Theme with Frosted Glass
   ======================================== */

/* Design Tokens */
page {
  /* Backgrounds */
  --bg-primary: #000000;
  --bg-secondary: #1C1C1E;
  --bg-tertiary: #2C2C2E;
  --bg-elevated: #1C1C1E;
  --bg-grouped: #000000;
  --bg-grouped-secondary: #1C1C1E;

  /* Separators */
  --separator: #38383A;
  --separator-opaque: #545458;

  /* Text */
  --text-primary: #FFFFFF;
  --text-secondary: #8E8E93;
  --text-tertiary: #636366;
  --text-quaternary: #48484A;

  /* Accent */
  --accent: #0A84FF;
  --accent-secondary: #5E5CE6;
  --accent-gradient: linear-gradient(135deg, #0A84FF, #5E5CE6);

  /* Semantic */
  --green: #30D158;
  --orange: #FF9F0A;
  --red: #FF453A;
  --yellow: #FFD60A;
  --cyan: #64D2FF;
  --pink: #FF375F;

  /* Gradients */
  --gradient-card: linear-gradient(180deg, #1C1C1E 0%, #2C2C2E 100%);
  --gradient-primary: linear-gradient(135deg, #0A84FF 0%, #5E5CE6 100%);
  --gradient-green: linear-gradient(135deg, #30D158 0%, #28A745 100%);
  --gradient-orange: linear-gradient(135deg, #FF9F0A 0%, #FF9500 100%);
  --gradient-red: linear-gradient(135deg, #FF453A 0%, #FF3B30 100%);

  /* Spacing */
  --spacing-xs: 8rpx;
  --spacing-sm: 16rpx;
  --spacing-md: 24rpx;
  --spacing-lg: 32rpx;
  --spacing-xl: 48rpx;
  --spacing-2xl: 64rpx;

  /* Radius */
  --radius-sm: 12rpx;
  --radius-md: 20rpx;
  --radius-lg: 28rpx;
  --radius-xl: 36rpx;
  --radius-full: 9999rpx;

  /* Typography */
  --font-xs: 22rpx;
  --font-sm: 26rpx;
  --font-md: 30rpx;
  --font-lg: 34rpx;
  --font-xl: 40rpx;
  --font-2xl: 48rpx;
  --font-3xl: 64rpx;

  /* Shadows */
  --shadow-sm: 0 2rpx 8rpx rgba(0, 0, 0, 0.3);
  --shadow-md: 0 8rpx 24rpx rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 16rpx 48rpx rgba(0, 0, 0, 0.5);

  /* Base styles */
  background-color: var(--bg-primary);
  color: var(--text-primary);
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', Roboto, sans-serif;
  font-size: var(--font-md);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* ========================================
   Layout
   ======================================== */

.container {
  padding: var(--spacing-md);
}

/* ========================================
   Cards
   ======================================== */

.card {
  background: var(--gradient-card);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  margin-bottom: var(--spacing-md);
  box-shadow: var(--shadow-md);
  border: 1rpx solid var(--separator);
}

.card-glass {
  background: rgba(28, 28, 30, 0.72);
  backdrop-filter: blur(40rpx);
  -webkit-backdrop-filter: blur(40rpx);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  margin-bottom: var(--spacing-md);
  box-shadow: var(--shadow-md);
  border: 1rpx solid rgba(255, 255, 255, 0.06);
}

/* ========================================
   Buttons
   ======================================== */

.btn-primary {
  background: var(--gradient-primary);
  color: var(--text-primary);
  border: none;
  border-radius: var(--radius-md);
  padding: var(--spacing-md) var(--spacing-xl);
  font-size: var(--font-md);
  font-weight: 600;
  text-align: center;
  box-shadow: var(--shadow-sm);
  transition: opacity 0.25s ease, transform 0.2s ease;
}

.btn-primary:active {
  opacity: 0.8;
  transform: scale(0.97);
}

.btn-secondary {
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1rpx solid var(--separator);
  border-radius: var(--radius-md);
  padding: var(--spacing-md) var(--spacing-xl);
  font-size: var(--font-md);
  text-align: center;
  transition: opacity 0.25s ease, transform 0.2s ease;
}

.btn-secondary:active {
  opacity: 0.8;
  transform: scale(0.97);
}

/* ========================================
   Text Utilities
   ======================================== */

.text-primary {
  color: var(--accent);
}

.text-secondary {
  color: var(--text-secondary);
}

.text-tertiary {
  color: var(--text-tertiary);
}

.text-success {
  color: var(--green);
}

.text-warning {
  color: var(--orange);
}

.text-danger {
  color: var(--red);
}

.text-muted {
  color: var(--text-tertiary);
}

.text-accent {
  color: var(--accent);
}

/* ========================================
   Badge
   ======================================== */

.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-full);
  font-size: var(--font-xs);
  font-weight: 500;
  background-color: var(--bg-tertiary);
  color: var(--text-secondary);
  border: 1rpx solid var(--separator);
}

.badge-accent {
  background-color: rgba(10, 132, 255, 0.16);
  color: var(--accent);
  border-color: rgba(10, 132, 255, 0.24);
}

.badge-success {
  background-color: rgba(48, 209, 88, 0.16);
  color: var(--green);
  border-color: rgba(48, 209, 88, 0.24);
}

.badge-warning {
  background-color: rgba(255, 159, 10, 0.16);
  color: var(--orange);
  border-color: rgba(255, 159, 10, 0.24);
}

.badge-danger {
  background-color: rgba(255, 69, 58, 0.16);
  color: var(--red);
  border-color: rgba(255, 69, 58, 0.24);
}

/* ========================================
   Divider
   ======================================== */

.divider {
  height: 1rpx;
  background-color: var(--separator);
  margin: var(--spacing-md) 0;
}

.divider-opaque {
  height: 1rpx;
  background-color: var(--separator-opaque);
  margin: var(--spacing-md) 0;
}
</style>
