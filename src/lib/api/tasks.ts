import type { SupabaseClient } from '@/lib/supabase'
import type { Task, TaskNode, OutputType } from '@/lib/types'

export function buildTree(flat: Task[]): TaskNode[] {
  const map = new Map<string, TaskNode>(flat.map(t => [t.id, { ...t, children: [] }]))
  const roots: TaskNode[] = []
  for (const node of map.values()) {
    if (node.parent_id) {
      const parent = map.get(node.parent_id)
      if (parent) parent.children.push(node)
      else roots.push(node) // parent was soft-deleted — promote to root display
    } else {
      roots.push(node)
    }
  }
  const sortNodes = (nodes: TaskNode[]) => {
    nodes.sort((a, b) => a.sort_order - b.sort_order)
    nodes.forEach(n => sortNodes(n.children))
  }
  sortNodes(roots)
  return roots
}

export async function listTasks(db: SupabaseClient, challengeId: string): Promise<Task[]> {
  const { data, error } = await db
    .from('tasks')
    .select('*')
    .eq('challenge_id', challengeId)
    .is('deleted_at', null)
    .order('sort_order')
  if (error) throw error
  return data ?? []
}

export async function createTask(
  db: SupabaseClient,
  payload: {
    challenge_id: string
    user_id: string
    title: string
    output_type: OutputType
    parent_id?: string | null
    depth?: number
    sort_order?: number
    required?: boolean
    description?: string
  },
): Promise<Task> {
  const { data, error } = await db
    .from('tasks')
    .insert({
      ...payload,
      depth: payload.depth ?? 0,
      sort_order: payload.sort_order ?? 0,
      required: payload.required ?? true,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateTask(
  db: SupabaseClient,
  id: string,
  payload: Partial<Pick<Task, 'title' | 'description' | 'output_type' | 'required' | 'sort_order'>>,
): Promise<void> {
  const { error } = await db.from('tasks').update(payload).eq('id', id)
  if (error) throw error
}

export async function softDeleteTask(
  db: SupabaseClient,
  id: string,
  userId: string,
): Promise<void> {
  const { error } = await db
    .from('tasks')
    .update({ deleted_at: new Date().toISOString(), deleted_by: userId })
    .eq('id', id)
  if (error) throw error
}

export async function swapTaskOrder(
  db: SupabaseClient,
  taskA: Pick<Task, 'id' | 'sort_order'>,
  taskB: Pick<Task, 'id' | 'sort_order'>,
): Promise<void> {
  await Promise.all([
    db.from('tasks').update({ sort_order: taskB.sort_order }).eq('id', taskA.id),
    db.from('tasks').update({ sort_order: taskA.sort_order }).eq('id', taskB.id),
  ])
}
