import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Exercise, MuscleGroup } from '../core/types/exercise'
import { EXERCISE_LIBRARY } from '../core/constants/exercises'

export const useExerciseStore = defineStore('exercise', () => {
  const exercises = ref<Exercise[]>(EXERCISE_LIBRARY)
  const searchQuery = ref('')

  // 按肌群筛选
  function getByMuscleGroup(group: MuscleGroup): Exercise[] {
    return exercises.value.filter(ex => ex.muscleGroup === group)
  }

  // 搜索动作
  function searchExercises(query: string): Exercise[] {
    if (!query) return exercises.value
    const q = query.toLowerCase()
    return exercises.value.filter(ex =>
      ex.name.includes(query) || ex.nameEn.toLowerCase().includes(q)
    )
  }

  // 获取动作名称
  function getExerciseName(id: string): string {
    return exercises.value.find(ex => ex.id === id)?.name || id
  }

  // 获取动作
  function getExercise(id: string): Exercise | undefined {
    return exercises.value.find(ex => ex.id === id)
  }

  return {
    exercises,
    searchQuery,
    getByMuscleGroup,
    searchExercises,
    getExerciseName,
    getExercise,
  }
})
