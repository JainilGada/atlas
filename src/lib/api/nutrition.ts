import type { SupabaseClient } from '@/lib/supabase'
import type { DayLog, FoodItem, FoodNode, MealSlot } from '@/lib/types'

// ── Day logs ─────────────────────────────────────────────────────────────────

export async function getOrCreateDayLog(
  db: SupabaseClient,
  userId: string,
  date: string,
): Promise<DayLog> {
  const { data, error } = await db
    .from('day_logs')
    .upsert({ user_id: userId, date }, { onConflict: 'user_id,date' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateDayLog(
  db: SupabaseClient,
  id: string,
  payload: Partial<
    Pick<
      DayLog,
      | 'goal_kcal' | 'consumed_kcal' | 'burned_kcal' | 'net_kcal' | 'balance'
      | 'steps' | 'water_litres' | 'strength_duration_min' | 'strength_intensity'
      | 'ai_feedback' | 'feedback_generated_at'
    >
  >,
): Promise<void> {
  const { error } = await db.from('day_logs').update(payload).eq('id', id)
  if (error) throw error
}

// ── Food items ────────────────────────────────────────────────────────────────

export function buildFoodTree(flat: FoodItem[]): FoodNode[] {
  const map = new Map<string, FoodNode>(flat.map(f => [f.id, { ...f, children: [] }]))
  const roots: FoodNode[] = []
  for (const node of map.values()) {
    if (node.parent_id) {
      const parent = map.get(node.parent_id)
      if (parent) parent.children.push(node)
      else roots.push(node)
    } else {
      roots.push(node)
    }
  }
  const sort = (nodes: FoodNode[]) => {
    nodes.sort((a, b) => a.sort_order - b.sort_order)
    nodes.forEach(n => sort(n.children))
  }
  sort(roots)
  return roots
}

export function computeKcal(node: FoodNode): number {
  if (node.children.length === 0) return node.kcal ?? 0
  return node.children.reduce((sum, child) => sum + computeKcal(child), 0)
}

export function totalSlotKcal(nodes: FoodNode[]): number {
  return nodes.reduce((sum, n) => sum + computeKcal(n), 0)
}

export async function listFoodItems(db: SupabaseClient, dayLogId: string): Promise<FoodItem[]> {
  const { data, error } = await db
    .from('food_items')
    .select('*')
    .eq('day_log_id', dayLogId)
    .is('deleted_at', null)
    .order('sort_order')
  if (error) throw error
  return data ?? []
}

export async function createFoodItem(
  db: SupabaseClient,
  payload: {
    day_log_id: string
    user_id: string
    slot: MealSlot
    name: string
    quantity_hint?: string
    parent_id?: string | null
    sort_order?: number
  },
): Promise<FoodItem> {
  const { data, error } = await db
    .from('food_items')
    .insert({ ...payload, sort_order: payload.sort_order ?? 0 })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateFoodItem(
  db: SupabaseClient,
  id: string,
  payload: Partial<Pick<FoodItem, 'name' | 'quantity_hint' | 'kcal' | 'kcal_source' | 'sort_order'>>,
): Promise<void> {
  const { error } = await db
    .from('food_items')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function softDeleteFoodItem(
  db: SupabaseClient,
  id: string,
  userId: string,
): Promise<void> {
  const { error } = await db
    .from('food_items')
    .update({ deleted_at: new Date().toISOString(), deleted_by: userId })
    .eq('id', id)
  if (error) throw error
}

// ── Calorie calculations ──────────────────────────────────────────────────────

/** Steps → kcal burned (rough: ~0.04 kcal/step) */
export function stepsToKcal(steps: number): number {
  return Math.round(steps * 0.04)
}

/** Strength training → kcal burned */
export function strengthToKcal(durationMin: number, intensity: string): number {
  const rate: Record<string, number> = { light: 4, moderate: 7, heavy: 10 }
  return Math.round(durationMin * (rate[intensity] ?? 6))
}
