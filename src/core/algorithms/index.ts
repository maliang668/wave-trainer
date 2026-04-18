export { estimate1RM, calculateWorkingWeight, epleyFormula, brzyckiFormula, rpeAdjusted1RM } from './rm-calculator'
export { isRPEInRange, getRPEDeviation, generateRPEAdjustment, beginnerRPEToStandard, standardRPEToBeginner, getRPEDescription } from './rpe-manager'
export {
  getDUPIntensityLevel, calculateIntensityMultiplier, generateDailyPlan,
  generateWarmupSets, getCycleInfo, getCyclePhaseName, getPhaseColor,
  getDayInCycle, shouldDeload, getSplitTemplate, getAllSplitTemplates
} from './dup-engine'
export { evaluateDeloadNeed } from './deload-detector'
export { detectPlateau } from './plateau-detector'
export { generateReturnPlan, calculateDaysOff } from './return-planner'
export { assessFatigue } from './fatigue-assessor'
export { calculateLBM, estimateInitial1RM, estimateAllInitial1RMs, getEstimationExplanation } from './body-estimator'