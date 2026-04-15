// 系统配置常量

// DUP周期化配置
export const DUP_CONFIG = {
  cycleLength: 4, // 4周一个微周期
  macroCycleIncrease: 0.025, // 每个宏周期强度+2.5%
  maxIntensity: 1.0, // 最大强度100%
  deloadWeek: 4, // 第4周为减负周
} as const

// 减负周配置
export const DELOAD_CONFIG = {
  defaultInterval: 5, // 默认每5周减负
  volumeReduction: 0.5, // 容量减少50%
  intensityReduction: 0, // 强度不降低
  rpeTarget: 6, // 减负周RPE目标
  highRPEScoreThreshold: 8.5, // 高RPE阈值
} as const

// 平台期检测配置
export const PLATEAU_CONFIG = {
  detectionWindowDays: 21, // 3周检测窗口
  minDataPoints: 3, // 最少3个数据点
  slopeThreshold: 0.5, // 斜率阈值
  lowVolumeThreshold: 10, // 低容量阈值(组/肌群/周)
  highVolumeThreshold: 20, // 高容量阈值
} as const

// 疲劳评估配置
export const FATIGUE_CONFIG = {
  highThreshold: 70,
  moderateThreshold: 45,
  weights: {
    rpeTrend: 0.30,
    performanceChange: 0.25,
    restDays: 0.20,
    selfReport: 0.25,
  },
} as const

// RPE配置
export const RPE_CONFIG = {
  adjustmentPerRPE: 5, // 每1 RPE偏差调整5%重量
  toleranceRange: 0.5, // RPE容差范围
  beginnerLevels: [
    { label: '轻松', emoji: '😊', rpeRange: [5, 6] as [number, number] },
    { label: '适中', emoji: '💪', rpeRange: [7, 8] as [number, number] },
    { label: '吃力', emoji: '😤', rpeRange: [9, 10] as [number, number] },
  ],
} as const

// 停训回归配置
export const RETURN_CONFIG = {
  minimal: { maxDays: 14, volumePercent: 80, intensityPercent: 90, rpeTarget: 7.5 },
  moderate: { maxDays: 28, weeks: 4 },
  extended: { maxDays: 90, weeks: 8 },
  restart: { weeks: 12 },
} as const

// 训练容量参考范围 (组/肌群/周)
export const VOLUME_GUIDELINES = {
  beginner: { min: 8, max: 12 },
  intermediate: { min: 10, max: 16 },
  advanced: { min: 12, max: 20 },
} as const