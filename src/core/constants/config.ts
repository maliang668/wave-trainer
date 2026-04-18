// 系统配置常量
import type { SplitTemplate } from '../types/training'

// DUP（每日波动周期化）配置
export const DUP_CONFIG = {
  // 真正的DUP：同一周内不同训练日有不同强度
  // 例如：第1次训练重、第2次中等、第3次轻
  cycleLength: 4, // 4周一个宏周期
  macroCycleIncrease: 0.02, // 每个宏周期基础强度+2%
  deloadInterval: 4, // 每4个宏周期安排一次减负周（约16周）
  deloadVolumeReduction: 0.5, // 减负周容量减少50%

  // 每日强度配置（DUP核心）
  intensityLevels: {
    heavy: {
      label: '大重量日',
      percent1RM: 0.85, // 85% 1RM
      repsModifier: -2, // 次数减少2
      rpeTarget: 8.5, // 目标RPE
      setsModifier: 0, // 组数不变
      color: '#ef5350', // 红色
    },
    medium: {
      label: '中等日',
      percent1RM: 0.75, // 75% 1RM
      repsModifier: 0, // 次数不变
      rpeTarget: 7.5, // 目标RPE
      setsModifier: 0, // 组数不变
      color: '#ffa726', // 橙色
    },
    light: {
      label: '轻量日',
      percent1RM: 0.65, // 65% 1RM
      repsModifier: 2, // 次数增加2
      rpeTarget: 6.5, // 目标RPE
      setsModifier: -1, // 组数减少1
      color: '#66bb6a', // 绿色
    },
    deload: {
      label: '减负周',
      percent1RM: 0.60, // 60% 1RM
      repsModifier: 0,
      rpeTarget: 6, // 目标RPE 6
      setsModifier: -1, // 组数减少1
      volumeReduction: 0.5, // 额外容量减少50%
      color: '#4fc3f7', // 蓝色
    },
  },

  // 新手特殊配置：不区分强度等级，统一中等强度
  beginnerMode: {
    percent1RM: 0.70, // 70% 1RM
    rpeTarget: 7, // RPE 7
    repsRange: [8, 12] as [number, number], // 8-12次
  },
} as const

// 减负周配置
export const DELOAD_CONFIG = {
  defaultInterval: 4, // 默认每4个宏周期减负
  volumeReduction: 0.5, // 容量减少50%
  intensityReduction: 0, // 强度不降低
  rpeTarget: 6, // 减负周RPE目标
  highRPEScoreThreshold: 8.5, // 高RPE阈值
} as const

// 平台期检测配置
export const PLATEAU_CONFIG = {
  detectionWindowDays: 21,
  minDataPoints: 3,
  slopeThreshold: 0.5,
  lowVolumeThreshold: 10,
  highVolumeThreshold: 20,
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
  adjustmentPerRPE: 5,
  toleranceRange: 0.5,
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

// ===== 分化训练模板 =====
export const SPLIT_TEMPLATES: SplitTemplate[] = [
  // 1. 新手全身训练 3天/周
  {
    id: 'full_body_beginner',
    name: '新手全身入门',
    description: '每周3天全身训练，适合0-6个月训练经验的新手。以中等重量、8-12次为主，建立基础力量和动作模式。',
    level: 'beginner',
    daysPerWeek: 3,
    cycleDays: 7, // 7天一循环：练/休/练/休/练/休/休
    days: [
      {
        dayIndex: 0,
        label: '全身训练 A',
        type: 'full_body',
        description: '推类为主 + 下肢基础',
        exercises: [
          { exerciseId: 'squat', sets: 3, repsRange: [8, 10], rpeTarget: 7, percent1RM: 0.70 },
          { exerciseId: 'bench_press', sets: 3, repsRange: [8, 10], rpeTarget: 7, percent1RM: 0.70 },
          { exerciseId: 'barbell_row', sets: 3, repsRange: [8, 12], rpeTarget: 7, percent1RM: 0.65 },
          { exerciseId: 'overhead_press', sets: 2, repsRange: [8, 12], rpeTarget: 7, percent1RM: 0.65 },
          { exerciseId: 'plank', sets: 3, repsRange: [30, 60], rpeTarget: 6, percent1RM: 0 },
        ],
      },
      { dayIndex: 1, label: '休息', type: 'rest', exercises: [] },
      {
        dayIndex: 2,
        label: '全身训练 B',
        type: 'full_body',
        description: '拉类为主 + 下肢基础',
        exercises: [
          { exerciseId: 'deadlift', sets: 3, repsRange: [5, 8], rpeTarget: 7, percent1RM: 0.70 },
          { exerciseId: 'barbell_row', sets: 3, repsRange: [8, 10], rpeTarget: 7, percent1RM: 0.70 },
          { exerciseId: 'incline_bench_press', sets: 3, repsRange: [8, 12], rpeTarget: 7, percent1RM: 0.65 },
          { exerciseId: 'barbell_curl', sets: 2, repsRange: [10, 12], rpeTarget: 7, percent1RM: 0.60 },
          { exerciseId: 'tricep_pushdown', sets: 2, repsRange: [10, 12], rpeTarget: 7, percent1RM: 0.60 },
        ],
      },
      { dayIndex: 3, label: '休息', type: 'rest', exercises: [] },
      {
        dayIndex: 4,
        label: '全身训练 C',
        type: 'full_body',
        description: '综合训练',
        exercises: [
          { exerciseId: 'leg_press', sets: 3, repsRange: [10, 12], rpeTarget: 7, percent1RM: 0.65 },
          { exerciseId: 'dumbbell_bench_press', sets: 3, repsRange: [8, 12], rpeTarget: 7, percent1RM: 0.65 },
          { exerciseId: 'lat_pulldown', sets: 3, repsRange: [8, 12], rpeTarget: 7, percent1RM: 0.65 },
          { exerciseId: 'lateral_raise', sets: 2, repsRange: [12, 15], rpeTarget: 7, percent1RM: 0.55 },
          { exerciseId: 'leg_curl', sets: 2, repsRange: [10, 12], rpeTarget: 7, percent1RM: 0.60 },
        ],
      },
      { dayIndex: 5, label: '休息', type: 'rest', exercises: [] },
      { dayIndex: 6, label: '休息', type: 'rest', exercises: [] },
    ],
  },

  // 2. 上下肢分化 4天/周
  {
    id: 'upper_lower',
    name: '上下肢分化',
    description: '每周4天，上肢和下肢各练2次。结合DUP强度波动，适合6个月以上训练经验。',
    level: 'intermediate',
    daysPerWeek: 4,
    cycleDays: 7,
    days: [
      {
        dayIndex: 0,
        label: '上肢力量',
        type: 'upper',
        description: '卧推、划船等复合动作，大重量低次数',
        exercises: [
          { exerciseId: 'bench_press', sets: 4, repsRange: [4, 6], rpeTarget: 8, percent1RM: 0.85 },
          { exerciseId: 'barbell_row', sets: 4, repsRange: [5, 7], rpeTarget: 8, percent1RM: 0.80 },
          { exerciseId: 'overhead_press', sets: 3, repsRange: [6, 8], rpeTarget: 7.5, percent1RM: 0.75 },
          { exerciseId: 'barbell_curl', sets: 3, repsRange: [8, 12], rpeTarget: 7, percent1RM: 0.65 },
          { exerciseId: 'tricep_pushdown', sets: 3, repsRange: [8, 12], rpeTarget: 7, percent1RM: 0.65 },
        ],
      },
      {
        dayIndex: 1,
        label: '下肢力量',
        type: 'lower',
        description: '深蹲、硬拉等下肢复合动作',
        exercises: [
          { exerciseId: 'squat', sets: 4, repsRange: [4, 6], rpeTarget: 8, percent1RM: 0.85 },
          { exerciseId: 'romanian_deadlift', sets: 3, repsRange: [6, 8], rpeTarget: 7.5, percent1RM: 0.75 },
          { exerciseId: 'leg_press', sets: 3, repsRange: [8, 10], rpeTarget: 7, percent1RM: 0.70 },
          { exerciseId: 'leg_curl', sets: 3, repsRange: [8, 12], rpeTarget: 7, percent1RM: 0.65 },
          { exerciseId: 'calf_raise', sets: 3, repsRange: [10, 15], rpeTarget: 7, percent1RM: 0.60 },
        ],
      },
      { dayIndex: 2, label: '休息', type: 'rest', exercises: [] },
      {
        dayIndex: 3,
        label: '上肢肌肥大',
        type: 'upper',
        description: '中等重量高次数，追求肌肉肥大',
        exercises: [
          { exerciseId: 'incline_bench_press', sets: 3, repsRange: [8, 12], rpeTarget: 7, percent1RM: 0.70 },
          { exerciseId: 'lat_pulldown', sets: 3, repsRange: [8, 12], rpeTarget: 7, percent1RM: 0.70 },
          { exerciseId: 'dumbbell_shoulder_press', sets: 3, repsRange: [8, 12], rpeTarget: 7, percent1RM: 0.70 },
          { exerciseId: 'dumbbell_curl', sets: 3, repsRange: [10, 15], rpeTarget: 7, percent1RM: 0.60 },
          { exerciseId: 'overhead_tricep_extension', sets: 3, repsRange: [10, 15], rpeTarget: 7, percent1RM: 0.60 },
        ],
      },
      {
        dayIndex: 4,
        label: '下肢肌肥大',
        type: 'lower',
        description: '中等重量高次数，追求下肢肌肉发展',
        exercises: [
          { exerciseId: 'front_squat', sets: 3, repsRange: [8, 10], rpeTarget: 7, percent1RM: 0.70 },
          { exerciseId: 'leg_extension', sets: 3, repsRange: [10, 15], rpeTarget: 7, percent1RM: 0.65 },
          { exerciseId: 'hip_thrust', sets: 3, repsRange: [8, 12], rpeTarget: 7, percent1RM: 0.70 },
          { exerciseId: 'leg_curl', sets: 3, repsRange: [10, 15], rpeTarget: 7, percent1RM: 0.60 },
          { exerciseId: 'calf_raise', sets: 4, repsRange: [12, 20], rpeTarget: 7, percent1RM: 0.55 },
        ],
      },
      { dayIndex: 5, label: '休息', type: 'rest', exercises: [] },
      { dayIndex: 6, label: '休息', type: 'rest', exercises: [] },
    ],
  },

  // 3. 推拉腿 3天/周
  {
    id: 'push_pull_legs',
    name: '推拉腿三分化',
    description: '经典推拉腿分化，每周3天循环。推日练胸肩三头，拉日练背二头，腿日练下肢。适合有一定基础的训练者。',
    level: 'intermediate',
    daysPerWeek: 3,
    cycleDays: 7,
    days: [
      {
        dayIndex: 0,
        label: '推日',
        type: 'push',
        description: '胸大肌、三角肌前束、肱三头肌',
        exercises: [
          { exerciseId: 'bench_press', sets: 4, repsRange: [5, 8], rpeTarget: 7.5, percent1RM: 0.80 },
          { exerciseId: 'incline_bench_press', sets: 3, repsRange: [8, 12], rpeTarget: 7.5, percent1RM: 0.70 },
          { exerciseId: 'overhead_press', sets: 3, repsRange: [6, 10], rpeTarget: 7.5, percent1RM: 0.75 },
          { exerciseId: 'lateral_raise', sets: 3, repsRange: [12, 15], rpeTarget: 7, percent1RM: 0.55 },
          { exerciseId: 'tricep_pushdown', sets: 3, repsRange: [10, 15], rpeTarget: 7, percent1RM: 0.60 },
        ],
      },
      { dayIndex: 1, label: '休息', type: 'rest', exercises: [] },
      {
        dayIndex: 2,
        label: '拉日',
        type: 'pull',
        description: '背阔肌、斜方肌、肱二头肌',
        exercises: [
          { exerciseId: 'deadlift', sets: 4, repsRange: [4, 6], rpeTarget: 8, percent1RM: 0.85 },
          { exerciseId: 'barbell_row', sets: 4, repsRange: [6, 8], rpeTarget: 7.5, percent1RM: 0.75 },
          { exerciseId: 'lat_pulldown', sets: 3, repsRange: [8, 12], rpeTarget: 7, percent1RM: 0.70 },
          { exerciseId: 'face_pull', sets: 3, repsRange: [12, 15], rpeTarget: 7, percent1RM: 0.50 },
          { exerciseId: 'barbell_curl', sets: 3, repsRange: [10, 12], rpeTarget: 7, percent1RM: 0.60 },
        ],
      },
      { dayIndex: 3, label: '休息', type: 'rest', exercises: [] },
      {
        dayIndex: 4,
        label: '腿日',
        type: 'legs',
        description: '股四头肌、腘绳肌、臀肌、小腿',
        exercises: [
          { exerciseId: 'squat', sets: 4, repsRange: [5, 8], rpeTarget: 8, percent1RM: 0.80 },
          { exerciseId: 'romanian_deadlift', sets: 3, repsRange: [8, 10], rpeTarget: 7.5, percent1RM: 0.70 },
          { exerciseId: 'leg_press', sets: 3, repsRange: [10, 12], rpeTarget: 7, percent1RM: 0.70 },
          { exerciseId: 'leg_extension', sets: 3, repsRange: [10, 15], rpeTarget: 7, percent1RM: 0.65 },
          { exerciseId: 'calf_raise', sets: 4, repsRange: [12, 20], rpeTarget: 7, percent1RM: 0.55 },
        ],
      },
      { dayIndex: 5, label: '休息', type: 'rest', exercises: [] },
      { dayIndex: 6, label: '休息', type: 'rest', exercises: [] },
    ],
  },

  // 4. 胸背腿5天循环（用户个人偏好）
  {
    id: 'chest_back_legs',
    name: '胸背腿五天循环',
    description: '5天一循环：胸部→背部→休息→腿部→休息。每个肌群训练容量更大，适合中高级训练者。结合DUP强度波动效果更佳。',
    level: 'advanced',
    daysPerWeek: 3,
    cycleDays: 5, // 5天一循环
    days: [
      {
        dayIndex: 0,
        label: '胸部日',
        type: 'chest',
        description: '胸大肌、三角肌前束、肱三头肌',
        exercises: [
          { exerciseId: 'bench_press', sets: 4, repsRange: [5, 8], rpeTarget: 7.5, percent1RM: 0.80 },
          { exerciseId: 'incline_bench_press', sets: 4, repsRange: [8, 12], rpeTarget: 7.5, percent1RM: 0.70 },
          { exerciseId: 'dumbbell_fly', sets: 3, repsRange: [10, 15], rpeTarget: 7, percent1RM: 0.60 },
          { exerciseId: 'cable_crossover', sets: 3, repsRange: [10, 15], rpeTarget: 7, percent1RM: 0.55 },
          { exerciseId: 'tricep_pushdown', sets: 3, repsRange: [10, 12], rpeTarget: 7, percent1RM: 0.60 },
        ],
      },
      {
        dayIndex: 1,
        label: '背部日',
        type: 'back',
        description: '背阔肌、斜方肌、肱二头肌',
        exercises: [
          { exerciseId: 'barbell_row', sets: 4, repsRange: [5, 8], rpeTarget: 7.5, percent1RM: 0.80 },
          { exerciseId: 'lat_pulldown', sets: 4, repsRange: [8, 12], rpeTarget: 7.5, percent1RM: 0.70 },
          { exerciseId: 'cable_row', sets: 3, repsRange: [8, 12], rpeTarget: 7, percent1RM: 0.65 },
          { exerciseId: 'face_pull', sets: 3, repsRange: [12, 15], rpeTarget: 7, percent1RM: 0.50 },
          { exerciseId: 'barbell_curl', sets: 3, repsRange: [10, 12], rpeTarget: 7, percent1RM: 0.60 },
        ],
      },
      { dayIndex: 2, label: '休息', type: 'rest', exercises: [] },
      {
        dayIndex: 3,
        label: '腿部日',
        type: 'legs',
        description: '股四头肌、腘绳肌、臀肌、小腿',
        exercises: [
          { exerciseId: 'squat', sets: 4, repsRange: [5, 8], rpeTarget: 7.5, percent1RM: 0.80 },
          { exerciseId: 'romanian_deadlift', sets: 4, repsRange: [8, 10], rpeTarget: 7.5, percent1RM: 0.70 },
          { exerciseId: 'leg_press', sets: 3, repsRange: [10, 12], rpeTarget: 7, percent1RM: 0.70 },
          { exerciseId: 'hip_thrust', sets: 3, repsRange: [8, 12], rpeTarget: 7, percent1RM: 0.70 },
          { exerciseId: 'calf_raise', sets: 4, repsRange: [12, 20], rpeTarget: 7, percent1RM: 0.55 },
        ],
      },
      { dayIndex: 4, label: '休息', type: 'rest', exercises: [] },
    ],
  },
]

// 默认重量（新用户无e1RM数据时使用）
export const DEFAULT_WEIGHTS: Record<string, number> = {
  'bench_press': 40,
  'incline_bench_press': 30,
  'dumbbell_bench_press': 20,
  'barbell_row': 40,
  'overhead_press': 30,
  'dumbbell_shoulder_press': 15,
  'barbell_squat': 50,
  'squat': 50,
  'front_squat': 40,
  'deadlift': 60,
  'romanian_deadlift': 50,
  'barbell_curl': 15,
  'dumbbell_curl': 10,
  'tricep_pushdown': 20,
  'overhead_tricep_extension': 10,
  'close_grip_bench': 35,
  'lateral_raise': 10,
  'lat_pulldown': 35,
  'cable_row': 30,
  'leg_press': 60,
  'leg_extension': 25,
  'leg_curl': 25,
  'calf_raise': 30,
  'hip_thrust': 40,
  'face_pull': 15,
  'dumbbell_fly': 10,
  'cable_crossover': 15,
  'plank': 0,
  'push_up': 0,
  'pull_up': 0,
  'hanging_leg_raise': 0,
}
