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
  cycleWeek: number
  cyclePhase: CyclePhase
  exercises: ExerciseRecord[]
  duration: number
  contextData: ContextData
  reflection?: string
  fatigueScore?: number
  createdAt: string
}

export type CyclePhase = 'power' | 'hypertrophy' | 'deload' | 'rest'

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
  dayType: 'upper_power' | 'lower_power' | 'upper_hypertrophy' | 'lower_hypertrophy' | 'rest'
  exercises: PlanExercise[]
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

export type PlanType = 'upper_lower' | 'push_pull_legs' | 'full_body' | 'custom'

// 每日生成的训练计划
export interface DailyPlan {
  date: string
  dayConfig: TrainingDayConfig
  cycleWeek: number
  cyclePhase: CyclePhase
  exercises: DailyExercise[]
  estimatedDuration: number
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