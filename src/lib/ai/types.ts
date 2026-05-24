export interface UserProfile {
  goal: string
  dietary_preference: string
  allergies: string[]
  disliked_foods: string[]
  age: number
  weight_kg: number
  height_cm: number
  activity_level: string
  tdee: number
}

export interface DayLogSummary {
  date: string
  goal_kcal: number
  consumed_kcal: number
  burned_kcal: number
  net_kcal: number
  balance: number
  steps?: number
  water_litres?: number
  strength_duration_min?: number
  strength_intensity?: string
  meals: Array<{
    slot: string
    items: Array<{ name: string; kcal: number }>
    total_kcal: number
  }>
}

export interface AIProvider {
  estimateCalories(
    item: { name: string; quantityHint?: string },
    profile: UserProfile,
  ): Promise<number>
  generateFeedback(dayLog: DayLogSummary, profile: UserProfile): Promise<string>
}
