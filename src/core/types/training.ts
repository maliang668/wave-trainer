import type { MuscleGroup } from './exercise'

// 训练组
export interface TrainingSet {
  setNumber: number
  weight: number
  reps: number
  rpe: number
  isWarmup: boolean
  completed: boolean
}

// 动作训练记录
export interface ExerciseRecord {
  exerciseId: string
  name: string
  muscleGroup: MuscleGroup
  sets: TrainingSet[]
  estimated1RM: number
  averageRPE: number
  totalVolume: number
}

// 训练日志
export interface TrainingLog {
  _id?: string
  _openid?: string
  date: string
  planId?: string
  planName?: string
  splitTemplateId?: string
  cycleDay: number
  cyclePhase: CyclePhase
  exercises: ExerciseRecord[]
  duration: number
  contextData: ContextData
  reflection?: string
  fatigueScore?: number
  createdAt: string
}

// DUP训练阶段（每日波动周期化）
export type CyclePhase = 'heavy' | 'medium' | 'light' | 'deload' | 'rest'

// 情境数据
export interface ContextData {
  sleepQuality: number  // 1-5
  stressLevel: number   // 1-5
  nutritionQuality: number // 1-5
  motivation: number    // 1-5
}

// 训练计划中的动作配置
export interface PlanExercise {
  exerciseId: string
  sets: number
  repsRange: [number, number]
  rpeTarget: number
  percent1RM: number
}

// 训练日配置
export interface TrainingDayConfig {
  dayLabel: string
  dayType: 'chest' | 'back' | 'legs' | 'upper' | 'lower' | 'push' | 'pull' | 'full_body' | 'rest'
  exercises: PlanExercise[]
}

// 分化训练模板
export interface SplitTemplate {
  id: string
  name: string
  description: string
  level: 'beginner' | 'intermediate' | 'advanced'
  daysPerWeek: number
  cycleDays: number  // 循环总天数（如5天：胸/背/休/腿/休）
  days: SplitDayConfig[]
}

// 分化日配置
export interface SplitDayConfig {
  dayIndex: number  // 在循环中的位置（0-based）
  label: string     // 如 '胸部日', '背部日', '休息'
  type: 'chest' | 'back' | 'legs' | 'upper' | 'lower' | 'push' | 'pull' | 'full_body' | 'rest'
  exercises: PlanExercise[]
  description?: string  // 如 '胸大肌、三角肌前束、肱三头肌'
}

// 训练计划
export interface TrainingPlan {
  _id?: string
  _openid?: string
  name: string
  type: PlanType
  description: string
  weeklySchedule: TrainingDayConfig[]
  cycleLength: number
  startDate: string
  status: 'active' | 'completed' | 'paused'
  createdAt: string
}

export type PlanType = 'full_body_beginner' | 'upper_lower' | 'push_pull_legs' | 'chest_back_legs' | 'custom'

// 每日生成的训练计划
export interface DailyPlan {
  date: string
  dayConfig: TrainingDayConfig
  cycleDay: number
  cyclePhase: CyclePhase
  intensityLabel: string  // '大重量日' | '中等日' | '轻量日' | '减负周'
  exercises: DailyExercise[]
  estimatedDuration: number
  splitTemplateId?: string
  splitDayLabel?: string
}

export interface DailyExercise {
  exerciseId: string
  name: string
  muscleGroup: MuscleGroup
  suggestedWeight: number
  targetRPE: number
  targetReps: [number, number]
  sets: number
  warmupSets: WarmupSet[]
}

export interface WarmupSet {
  weight: number
  reps: number
  type: 'warmup'
}
