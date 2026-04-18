<template>
  <view class="page">
    <!-- 搜索栏 -->
    <view class="search-bar">
      <input
        type="text"
        :value="searchQuery"
        placeholder="搜索动作..."
        class="search-input"
        @input="onSearch"
      />
    </view>

    <!-- 肌群筛选 -->
    <scroll-view scroll-x class="group-filter">
      <view
        v-for="group in muscleGroups"
        :key="group.value"
        class="group-tag"
        :class="{ active: activeGroup === group.value }"
        @tap="activeGroup = group.value"
      >
        <text>{{ group.label }}</text>
      </view>
    </scroll-view>

    <!-- 动作列表 -->
    <view class="exercise-list">
      <view
        v-for="ex in filteredExercises"
        :key="ex.id"
        class="exercise-item"
        :class="{ added: isAdded(ex.id) }"
        @tap="toggleExercise(ex)"
      >
        <view class="ex-info">
          <text class="ex-name">{{ ex.name }}</text>
          <view class="ex-meta">
            <text class="ex-muscle">{{ muscleGroupNames[ex.muscleGroup] }}</text>
            <text class="ex-equip">{{ equipmentNames[ex.equipment] }}</text>
            <text class="ex-category">{{ ex.category === 'compound' ? '复合' : '孤立' }}</text>
          </view>
        </view>
        <view class="ex-action">
          <text v-if="isAdded(ex.id)" class="added-text">✅ 已添加</text>
          <text v-else class="add-text">+ 添加</text>
        </view>
      </view>
    </view>

    <!-- 底部操作栏 -->
    <view class="bottom-bar">
      <text class="selected-count">已选 {{ selectedIds.length }} 个动作</text>
      <view class="btn-primary confirm-btn" @tap="confirmSelection">
        确认
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useExerciseStore } from '../../stores/exercise'
import type { Exercise, MuscleGroup } from '../../core/types/exercise'
import { MUSCLE_GROUP_NAMES, EQUIPMENT_NAMES } from '../../core/types/exercise'

const exerciseStore = useExerciseStore()

// 搜索
const searchQuery = ref('')
function onSearch(e: any) {
  searchQuery.value = e.detail.value
}

// 肌群筛选
const muscleGroups = [
  { label: '全部', value: 'all' },
  { label: '胸部', value: 'chest' },
  { label: '背部', value: 'back' },
  { label: '肩部', value: 'shoulders' },
  { label: '肱二头', value: 'biceps' },
  { label: '肱三头', value: 'triceps' },
  { label: '股四头', value: 'quads' },
  { label: '腘绳肌', value: 'hamstrings' },
  { label: '臀肌', value: 'glutes' },
  { label: '小腿', value: 'calves' },
  { label: '核心', value: 'abs' },
  { label: '斜方肌', value: 'traps' },
]
const activeGroup = ref<string>('all')
const muscleGroupNames = MUSCLE_GROUP_NAMES
const equipmentNames = EQUIPMENT_NAMES

// 已选动作ID列表
const selectedIds = ref<string[]>([])

// 从页面参数获取已选动作
const onLoad = () => {
  const pages = getCurrentPages()
  const prevPage = pages[pages.length - 2] as any
  if (prevPage && prevPage.$vm) {
    // 从上一页获取已选动作
    const existing = prevPage.$vm.exerciseIds
    if (existing) {
      selectedIds.value = [...existing]
    }
  }
}

// 过滤后的动作列表
const filteredExercises = computed(() => {
  let list = exerciseStore.exercises

  // 肌群筛选
  if (activeGroup.value !== 'all') {
    list = list.filter(ex => ex.muscleGroup === activeGroup.value)
  }

  // 搜索过滤
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim()
    list = list.filter(ex =>
      ex.name.includes(searchQuery.value.trim()) ||
      ex.nameEn.toLowerCase().includes(q)
    )
  }

  return list
})

// 是否已添加
function isAdded(id: string): boolean {
  return selectedIds.value.includes(id)
}

// 切换选择
function toggleExercise(ex: Exercise) {
  const idx = selectedIds.value.indexOf(ex.id)
  if (idx >= 0) {
    selectedIds.value.splice(idx, 1)
  } else {
    selectedIds.value.push(ex.id)
  }
}

// 确认选择
function confirmSelection() {
  // 通过 uni 事件总线将选择结果传回上一页
  uni.$emit('exercisesSelected', selectedIds.value)
  uni.navigateBack()
}
</script>

<style scoped>
.page { padding-bottom: 140rpx; }

.search-bar {
  padding: 16rpx 24rpx;
  background: #1a1a2e;
  position: sticky;
  top: 0;
  z-index: 10;
}
.search-input {
  background: #0f0f23;
  border: 1rpx solid #3a3a5a;
  border-radius: 12rpx;
  padding: 16rpx 24rpx;
  color: #e0e0e0;
  font-size: 28rpx;
}

.group-filter {
  display: flex;
  gap: 12rpx;
  padding: 12rpx 24rpx;
  white-space: nowrap;
  background: #1a1a2e;
}
.group-tag {
  display: inline-block;
  padding: 8rpx 20rpx;
  border-radius: 20rpx;
  background: #2a2a4a;
  font-size: 24rpx;
  color: #888;
  flex-shrink: 0;
}
.group-tag.active {
  background: rgba(79, 195, 247, 0.2);
  color: #4fc3f7;
}

.exercise-list { padding: 0 24rpx; }
.exercise-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx;
  background: #1a1a2e;
  border-radius: 12rpx;
  margin-bottom: 12rpx;
  border-left: 4rpx solid #3a3a5a;
}
.exercise-item.added {
  border-left-color: #66bb6a;
  opacity: 0.7;
}
.ex-info { flex: 1; }
.ex-name { display: block; font-size: 30rpx; font-weight: 600; color: #e0e0e0; }
.ex-meta { display: flex; gap: 12rpx; margin-top: 6rpx; }
.ex-muscle { font-size: 22rpx; color: #4fc3f7; background: rgba(79,195,247,0.1); padding: 2rpx 10rpx; border-radius: 4rpx; }
.ex-equip { font-size: 22rpx; color: #888; }
.ex-category { font-size: 22rpx; color: #ffa726; }
.ex-action { flex-shrink: 0; }
.added-text { font-size: 24rpx; color: #66bb6a; }
.add-text { font-size: 24rpx; color: #4fc3f7; font-weight: 600; }

.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 32rpx;
  background: #1a1a2e;
  border-top: 1rpx solid #2a2a4a;
  z-index: 100;
}
.selected-count { font-size: 28rpx; color: #888; }
.confirm-btn {
  padding: 16rpx 48rpx;
  font-size: 28rpx;
  border-radius: 12rpx;
}
</style>
