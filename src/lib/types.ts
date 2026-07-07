// ── Shared DB types ──────────────────────────────────────────────────────────

export type OutputType =
  | 'yes_no'
  | 'short_text'
  | 'long_text'
  | 'number'
  | 'single_photo'
  | 'multiple_photos'
  | 'single_file'
  | 'multiple_files'

export const OUTPUT_TYPE_LABELS: Record<OutputType, string> = {
  yes_no: 'Yes / No',
  short_text: 'Short text',
  long_text: 'Long text',
  number: 'Number',
  single_photo: 'Single photo',
  multiple_photos: 'Multiple photos',
  single_file: 'Single file',
  multiple_files: 'Multiple files',
}

export interface Challenge {
  id: string
  user_id: string
  name: string
  description: string | null
  start_date: string | null
  duration_days: number | null
  status: 'active' | 'paused' | 'archived'
  created_at: string
  deleted_at: string | null
  deleted_by: string | null
}

export interface Task {
  id: string
  challenge_id: string
  user_id: string
  parent_id: string | null
  title: string
  description: string | null
  output_type: OutputType
  required: boolean
  sort_order: number
  depth: number
  created_at: string
  deleted_at: string | null
  deleted_by: string | null
}

export interface TaskNode extends Task {
  children: TaskNode[]
}

export interface DailyCheckin {
  id: string
  user_id: string
  challenge_id: string
  date: string
  created_at: string
  updated_at: string
  deleted_at: string | null
  deleted_by: string | null
}

export interface FileRef {
  url: string
  name: string
  size: number
  type: string
}

export interface TaskEntry {
  id: string
  checkin_id: string
  task_id: string
  user_id: string
  date: string
  value_bool: boolean | null
  value_text: string | null
  value_number: number | null
  value_files: FileRef[] | null
  comment: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  deleted_by: string | null
}

// ── Nutrition types (used in Phase 3) ────────────────────────────────────────

export type MealSlot = 'breakfast' | 'morning_snack' | 'lunch' | 'evening_snack' | 'dinner' | 'late_night'
export type KcalSource = 'ai_estimated' | 'user_override' | 'computed_from_children'

export interface DayLog {
  id: string
  user_id: string
  date: string
  goal_kcal: number | null
  consumed_kcal: number | null
  burned_kcal: number | null
  net_kcal: number | null
  balance: number | null
  steps: number | null
  water_litres: number | null
  strength_duration_min: number | null
  strength_intensity: string | null
  ai_feedback: string | null
  feedback_generated_at: string | null
  created_at: string
  deleted_at: string | null
  deleted_by: string | null
}

export interface FoodItem {
  id: string
  day_log_id: string
  user_id: string
  parent_id: string | null
  slot: MealSlot
  name: string
  quantity_hint: string | null
  kcal: number | null
  kcal_source: KcalSource | null
  sort_order: number
  created_at: string
  updated_at: string
  deleted_at: string | null
  deleted_by: string | null
}

export interface FoodNode extends FoodItem {
  children: FoodNode[]
}

export type WorkoutCategory =
  | 'running' | 'cycling' | 'swimming' | 'walking'
  | 'hiit' | 'strength' | 'yoga' | 'other'

export const WORKOUT_CATEGORY_LABELS: Record<WorkoutCategory, string> = {
  running: 'Running',
  cycling: 'Cycling',
  swimming: 'Swimming',
  walking: 'Walking',
  hiit: 'HIIT',
  strength: 'Strength',
  yoga: 'Yoga',
  other: 'Other',
}

// kcal per minute by category (approximate MET × 3.5 × 70kg / 200)
export const WORKOUT_KCAL_PER_MIN: Record<WorkoutCategory, number> = {
  running: 10,
  cycling: 7,
  swimming: 8,
  walking: 4,
  hiit: 12,
  strength: 5,
  yoga: 3,
  other: 6,
}

export interface WorkoutExercise {
  id: string
  day_log_id: string
  user_id: string
  name: string
  category: WorkoutCategory
  sets: number | null
  reps: number | null
  duration_min: number | null
  kcal_burned: number | null
  sort_order: number
  created_at: string
  deleted_at: string | null
  deleted_by: string | null
}

export interface UserProfile {
  user_id: string
  goal: string | null
  dietary_preference: string | null
  allergies: string[] | null
  disliked_foods: string[] | null
  age: number | null
  weight_kg: number | null
  height_cm: number | null
  activity_level: string | null
  tdee: number | null
  updated_at: string
}
