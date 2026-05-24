import type { SupabaseClient } from '@/lib/supabase'
import type { Challenge } from '@/lib/types'

export async function listChallenges(db: SupabaseClient, userId: string): Promise<Challenge[]> {
  const { data, error } = await db
    .from('challenges')
    .select('*')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function createChallenge(
  db: SupabaseClient,
  payload: {
    user_id: string
    name: string
    description?: string
    start_date?: string
    duration_days?: number
  },
): Promise<Challenge> {
  const { data, error } = await db
    .from('challenges')
    .insert({ ...payload, status: 'active' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateChallenge(
  db: SupabaseClient,
  id: string,
  payload: Partial<Pick<Challenge, 'name' | 'description' | 'start_date' | 'duration_days' | 'status'>>,
): Promise<void> {
  const { error } = await db.from('challenges').update(payload).eq('id', id)
  if (error) throw error
}

export async function softDeleteChallenge(
  db: SupabaseClient,
  id: string,
  userId: string,
): Promise<void> {
  const { error } = await db
    .from('challenges')
    .update({ deleted_at: new Date().toISOString(), deleted_by: userId })
    .eq('id', id)
  if (error) throw error
}
