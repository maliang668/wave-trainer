// RM估算结果
export interface RMEstimate {
  estimated1RM: number
  confidence: 'high' | 'medium' | 'low'
  method: string
}

// RPE调整建议
export interface RPEAdjustment {
  currentWeight: number
  suggestedWeight: number
  adjustmentPercent: number
  reason: string
}

// 减负周触发条件
export interface DeloadTrigger {
  type: 'scheduled' | 'fatigue' | 'performance' | 'self_report'
  priority: 'high' | 'medium' | 'low'
  message: string
}

// 减负周方案
export interface DeloadPlan {
  strategy: 'volume_reduction' | 'intensity_reduction' | 'combined' | 'full_rest'
  volumeReduction: number
  intensityReduction: number
  setsPerExercise: number
  rpeTarget: number
  duration: number
  message: string
}

// 平台期诊断结果
export interface PlateauDiagnosis {
  detected: boolean
  diagnosis: 'understimulated' | 'overreached' | 'recovery_deficit' | 'adapted'
  slope: number
  avgRPE: number
  weeklyVolume: number
  recommendation: BreakthroughStrategy
}

export interface BreakthroughStrategy {
  type: string
  title: string
  description: string
  parameters: Record<string, number>
}

// 停训回归方案
export interface ReturnPlan {
  phase: 'minimal_adjustment' | 'moderate_return' | 'extended_return' | 'restart'
  duration: string
  weeks: ReturnWeek[]
  note?: string
}

export interface ReturnWeek {
  volumePercent: number
  intensityPercent: number
  rpeTarget: number
  message: string
}

// 疲劳评估结果
export interface FatigueAssessment {
  fatigueScore: number
  level: 'low' | 'moderate' | 'high'
  advice: string
  metrics: {
    rpeTrend: 'increasing' | 'stable_high' | 'stable' | 'decreasing'
    volumeChange: number
    performanceChange: number
    restDays: number
    selfReport?: {
      sleep: number
      stress: number
      nutrition: number
    }
  }
}

// 智能建议
export interface CoachRecommendation {
  priority: number
  type: 'return_plan' | 'fatigue_warning' | 'plateau_break' | 'deload_reminder' | 'progress_note'
  title: string
  message: string
  action: unknown
}