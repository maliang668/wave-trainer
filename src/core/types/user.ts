// 用户资料
export interface UserProfile {
  _openid?: string
  nickName: string
  avatarUrl: string
  profile: BodyProfile
  preferences: UserPreferences
  createdAt: string
  updatedAt: string
}

export interface BodyProfile {
  weight: number
  height: number
  birthday: string
  gender: 'male' | 'female' | 'other'
  barWeight: number // 空杆重量，默认20kg
  age?: number // 年龄（可选，也可从birthday推算）
  bodyFat?: number // 体脂率
  isMenstruating?: boolean // 是否在经期（仅女性）
}

export interface UserPreferences {
  rpeMode: 'beginner' | 'advanced' // 新手3档 / 进阶10级
  weightUnit: 'kg' | 'lb'
  restTimerDefault: number // 默认组间休息秒数
  enableWarmupCalc: boolean
  notificationsEnabled: boolean
}

// 身体数据记录
export interface BodyMetric {
  _id?: string
  _openid?: string
  date: string
  weight: number
  bodyFat?: number
  measurements?: {
    chest?: number
    waist?: number
    hips?: number
    arms?: number
    thighs?: number
  }
  createdAt: string
}

// 动作最大值记录
export interface ExerciseMax {
  _openid?: string
  exerciseId: string
  exerciseName: string
  estimated1RM: number
  confidence: 'high' | 'medium' | 'low'
  history: MaxHistoryEntry[]
  updatedAt: string
}

export interface MaxHistoryEntry {
  date: string
  e1RM: number
  method: 'rpe_adjusted' | 'direct_test' | 'formula'
  confidence: 'high' | 'medium' | 'low'
}