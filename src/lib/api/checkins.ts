import type { SupabaseClient } from '@/lib/supabase'
import type { DailyCheckin, TaskEntry, FileRef } from '@/lib/types'

export async function getOrCreateCheckin(
  db: SupabaseClient,
  userId: string,
  challengeId: string,
  date: string,
): Promise<DailyCheckin> {
  const { data, error } = await db
    .from('daily_checkins')
    .upsert(
      { user_id: userId, challenge_id: challengeId, date },
      { onConflict: 'user_id,challenge_id,date' },
    )
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getTaskEntries(
  db: SupabaseClient,
  checkinId: string,
): Promise<Record<string, TaskEntry>> {
  const { data, error } = await db
    .from('task_entries')
    .select('*')
    .eq('checkin_id', checkinId)
    .is('deleted_at', null)
  if (error) throw error
  return Object.fromEntries((data ?? []).map((e: TaskEntry) => [e.task_id, e]))
}

export async function upsertTaskEntry(
  db: SupabaseClient,
  entry: {
    checkin_id: string
    task_id: string
    user_id: string
    date: string
    value_bool?: boolean | null
    value_text?: string | null
    value_number?: number | null
    value_files?: FileRef[] | null
    comment?: string | null
  },
): Promise<TaskEntry> {
  const { data, error } = await db
    .from('task_entries')
    .upsert({ ...entry, updated_at: new Date().toISOString() }, { onConflict: 'checkin_id,task_id' })
    .select()
    .single()
  if (error) throw error
  return data
}
