import type { SupabaseClient } from '@/lib/supabase'
import type { UserProfile } from '@/lib/types'

export async function getProfile(
  db: SupabaseClient,
  userId: string,
): Promise<UserProfile | null> {
  const { data } = await db.from('user_profiles').select('*').eq('user_id', userId).maybeSingle()
  return data ?? null
}

export async function upsertProfile(
  db: SupabaseClient,
  payload: Partial<UserProfile> & { user_id: string },
): Promise<UserProfile> {
  const tdee = payload.age && payload.weight_kg && payload.height_cm
    ? calcTDEE(payload as Required<Pick<UserProfile, 'age' | 'weight_kg' | 'height_cm' | 'activity_level'>>)
    : payload.tdee

  const { data, error } = await db
    .from('user_profiles')
    .upsert(
      { ...payload, tdee, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    )
    .select()
    .single()
  if (error) throw error
  return data
}

/** Mifflin-St Jeor (gender-neutral midpoint) */
function calcTDEE(p: Pick<UserProfile, 'age' | 'weight_kg' | 'height_cm' | 'activity_level'>): number {
  if (!p.age || !p.weight_kg || !p.height_cm) return 2000
  // Average of male (+5) and female (−161) formulas
  const bmr = 10 * p.weight_kg + 6.25 * p.height_cm - 5 * p.age - 78
  const multipliers: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  }
  return Math.round(bmr * (multipliers[p.activity_level ?? ''] ?? 1.55))
}

export function goalKcal(tdee: number, goal: string | null): number {
  if (goal === 'Weight loss') return Math.max(1200, tdee - 500)
  if (goal === 'Muscle gain') return tdee + 300
  return tdee // Maintenance
}
