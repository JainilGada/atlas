import { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Plus } from 'lucide-react'
import { useRequiredSession } from '@/features/auth/SessionContext'
import { listChallenges } from '@/lib/api/challenges'
import {
  listTasks, createTask, updateTask, softDeleteTask, swapTaskOrder, buildTree,
} from '@/lib/api/tasks'
import type { Challenge, Task, TaskNode as TN } from '@/lib/types'
import { Spinner } from '@/components/ui/spinner'
import { TaskBuilderNode } from './components/TaskBuilderNode'

export default function ChallengeSetupPage() {
  const { id } = useParams<{ id: string }>()
  const session = useRequiredSession()

  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [flatTasks, setFlatTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const tree = buildTree(flatTasks)

  async function load() {
    if (!id) return
    setLoading(true)
    try {
      const [challenges, tasks] = await Promise.all([
        listChallenges(session.db, session.userId),
        listTasks(session.db, id),
      ])
      setChallenge(challenges.find(c => c.id === id) ?? null)
      setFlatTasks(tasks)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  const handleUpdate = useCallback(
    async (taskId: string, field: 'title' | 'output_type' | 'required', value: string | boolean) => {
      await updateTask(session.db, taskId, { [field]: value } as Parameters<typeof updateTask>[2])
      setFlatTasks(ts => ts.map(t => t.id === taskId ? { ...t, [field]: value } : t))
    },
    [session.db],
  )

  const handleDelete = useCallback(
    async (taskId: string) => {
      const allDescendants = getDescendants(taskId, flatTasks)
      await Promise.all(
        [taskId, ...allDescendants].map(tid => softDeleteTask(session.db, tid, session.userId)),
      )
      setFlatTasks(ts => ts.filter(t => t.id !== taskId && !allDescendants.includes(t.id)))
    },
    [session.db, session.userId, flatTasks],
  )

  const handleAddChild = useCallback(
    async (parentId: string, parentDepth: number, siblingCount: number) => {
      if (!id) return
      const task = await createTask(session.db, {
        challenge_id: id,
        user_id: session.userId,
        title: 'New subtask',
        output_type: 'yes_no',
        parent_id: parentId,
        depth: parentDepth + 1,
        sort_order: siblingCount,
      })
      setFlatTasks(ts => [...ts, task])
    },
    [session.db, session.userId, id],
  )

  const handleAddRoot = useCallback(async () => {
    if (!id) return
    const rootCount = flatTasks.filter(t => t.parent_id === null).length
    const task = await createTask(session.db, {
      challenge_id: id,
      user_id: session.userId,
      title: 'New task',
      output_type: 'yes_no',
      parent_id: null,
      depth: 0,
      sort_order: rootCount,
    })
    setFlatTasks(ts => [...ts, task])
  }, [session.db, session.userId, id, flatTasks])

  const handleMoveUp = useCallback(
    async (node: TN, siblings: TN[]) => {
      const idx = siblings.findIndex(s => s.id === node.id)
      if (idx <= 0) return
      const prev = siblings[idx - 1]
      await swapTaskOrder(session.db, node, prev)
      setFlatTasks(ts =>
        ts.map(t => {
          if (t.id === node.id) return { ...t, sort_order: prev.sort_order }
          if (t.id === prev.id) return { ...t, sort_order: node.sort_order }
          return t
        }),
      )
    },
    [session.db],
  )

  const handleMoveDown = useCallback(
    async (node: TN, siblings: TN[]) => {
      const idx = siblings.findIndex(s => s.id === node.id)
      if (idx >= siblings.length - 1) return
      const next = siblings[idx + 1]
      await swapTaskOrder(session.db, node, next)
      setFlatTasks(ts =>
        ts.map(t => {
          if (t.id === node.id) return { ...t, sort_order: next.sort_order }
          if (t.id === next.id) return { ...t, sort_order: node.sort_order }
          return t
        }),
      )
    },
    [session.db],
  )

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>
  if (error) return <div className="text-center py-20 text-destructive">{error}</div>
  if (!challenge) return <div className="text-center py-20 text-muted-foreground">Challenge not found.</div>

  return (
    <div className="max-w-lg mx-auto px-4 pt-5 pb-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <Link
          to="/challenges"
          className="w-9 h-9 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-all shrink-0"
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{challenge.name}</p>
          <p className="text-xs text-muted-foreground">Set up daily tasks</p>
        </div>
      </div>

      {/* Task list */}
      {tree.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="text-5xl mb-4">📝</div>
          <p className="text-sm font-semibold text-foreground mb-1">No tasks yet</p>
          <p className="text-xs text-muted-foreground mb-6">Add tasks your users need to complete each day.</p>
        </div>
      ) : (
        <div
          className="bg-white rounded-xl overflow-hidden mb-4 divide-y divide-[#F3F4F6]"
          style={{ border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
        >
          {tree.map((node, i) => (
            <TaskBuilderNode
              key={node.id}
              node={node}
              siblings={tree}
              isFirst={i === 0}
              isLast={i === tree.length - 1}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              onAddChild={handleAddChild}
              onMoveUp={handleMoveUp}
              onMoveDown={handleMoveDown}
            />
          ))}
        </div>
      )}

      <button
        onClick={handleAddRoot}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-border text-sm font-semibold text-primary hover:border-primary hover:bg-secondary/50 transition-all"
      >
        <Plus className="h-4 w-4" /> Add task
      </button>
    </div>
  )
}

function getDescendants(taskId: string, allTasks: Task[]): string[] {
  const children = allTasks.filter(t => t.parent_id === taskId).map(t => t.id)
  return [...children, ...children.flatMap(id => getDescendants(id, allTasks))]
}
