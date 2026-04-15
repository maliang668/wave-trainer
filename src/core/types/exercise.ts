// 动作类型
export interface Exercise {
  id: string
  name: string
  nameEn: string
  muscleGroup: MuscleGroup
  equipment: Equipment
  category: ExerciseCategory
  description?: string
}

export type MuscleGroup =
  | 'chest' | 'back' | 'shoulders' | 'biceps' | 'triceps'
  | 'quads' | 'hamstrings' | 'glutes' | 'calves' | 'abs'
  | 'forearms' | 'traps' | 'full_body'

export type Equipment = 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bodyweight' | 'other'

export type ExerciseCategory = 'compound' | 'isolation' | 'accessory'

export const MUSCLE_GROUP_NAMES: Record<MuscleGroup, string> = {
  chest: '胸部', back: '背部', shoulders: '肩部', biceps: '肱二头肌',
  triceps: '肱三头肌', quads: '股四头肌', hamstrings: '腘绳肌',
  glutes: '臀肌', calves: '小腿', abs: '腹肌',
  forearms: '前臂', traps: '斜方肌', full_body: '全身'
}

export const EQUIPMENT_NAMES: Record<Equipment, string> = {
  barbell: '杠铃', dumbbell: '哑铃', machine: '器械',
  cable: '绳索', bodyweight: '自重', other: '其他'
}