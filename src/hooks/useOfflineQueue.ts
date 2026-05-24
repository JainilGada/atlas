/**
 * Generic offline mutation queue backed by IndexedDB (via idb).
 *
 * Serialisable operations are enqueued when the network is unavailable and
 * replayed in insertion order when the app comes back online.
 */
import { openDB, type IDBPDatabase } from 'idb'
import type { SupabaseClient } from '@/lib/supabase'

const DB_NAME = 'atlas-offline'
const DB_VERSION = 1
const STORE = 'queue'

export interface QueuedOp {
  id: string
  timestamp: number
  table: string
  operation: 'upsert' | 'update' | 'soft_delete'
  data: Record<string, unknown>
  /** Comma-separated column names for upsert conflict resolution */
  onConflict?: string
  /** Column + value for update / soft_delete WHERE clause */
  matchColumn?: string
  matchValue?: string
}

let _db: IDBPDatabase | null = null

async function getDB(): Promise<IDBPDatabase> {
  if (_db) return _db
  _db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      db.createObjectStore(STORE, { keyPath: 'id' })
    },
  })
  return _db
}

export async function enqueueOp(op: Omit<QueuedOp, 'id' | 'timestamp'>): Promise<void> {
  const db = await getDB()
  await db.put(STORE, { ...op, id: crypto.randomUUID(), timestamp: Date.now() })
}

export async function flushQueue(supabase: SupabaseClient): Promise<void> {
  const db = await getDB()
  const all: QueuedOp[] = await db.getAll(STORE)
  if (!all.length) return

  const sorted = all.sort((a, b) => a.timestamp - b.timestamp)

  for (const op of sorted) {
    try {
      await replayOp(op, supabase)
      await db.delete(STORE, op.id)
    } catch (err) {
      // Leave remaining ops in queue; they'll be retried on next online event.
      console.warn('[OfflineQueue] Replay failed, stopping flush:', err)
      break
    }
  }
}

export async function queueLength(): Promise<number> {
  const db = await getDB()
  return db.count(STORE)
}

async function replayOp(op: QueuedOp, supabase: SupabaseClient): Promise<void> {
  switch (op.operation) {
    case 'upsert': {
      const { error } = await supabase
        .from(op.table)
        .upsert(op.data, op.onConflict ? { onConflict: op.onConflict } : undefined)
      if (error) throw error
      break
    }
    case 'update': {
      if (!op.matchColumn || op.matchValue === undefined) throw new Error('update needs matchColumn/matchValue')
      const { error } = await supabase
        .from(op.table)
        .update(op.data)
        .eq(op.matchColumn, op.matchValue)
      if (error) throw error
      break
    }
    case 'soft_delete': {
      if (!op.matchColumn || op.matchValue === undefined) throw new Error('soft_delete needs matchColumn/matchValue')
      const { error } = await supabase
        .from(op.table)
        .update({ deleted_at: new Date().toISOString(), ...op.data })
        .eq(op.matchColumn, op.matchValue)
      if (error) throw error
      break
    }
  }
}
