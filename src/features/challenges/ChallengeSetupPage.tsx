import { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Plus } from 'lucide-react'
import { useRequiredSession } from '@/features/auth/SessionContext'
import { listChallenges } from '@/lib/api/challenges'
import {
  listTasks, createTask, updateTask, softDeleteTask, swapTaskOrder, buildTree,
} from '@/lib/api/tasks'
import type { Challenge, Task, TaskNode as TN } from '@/lib/types'
import { Button } from '@/components/ui/button'
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
      // Soft-delete the node and all its descendants
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
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" asChild className="h-8 w-8 shrink-0">
          <Link to="/challenges"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-xl font-semibold">{challenge.name}</h1>
          <p className="text-sm text-muted-foreground">Set up tasks</p>
        </div>
      </div>

      {tree.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="mb-4">No tasks yet. Add your first task below.</p>
        </div>
      ) : (
        <div className="border rounded-lg bg-card mb-4 divide-y">
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

      <Button variant="outline" className="w-full" onClick={handleAddRoot}>
        <Plus className="h-4 w-4 mr-2" /> Add task
      </Button>
    </div>
  )
}

function getDescendants(taskId: string, allTasks: Task[]): string[] {
  const children = allTasks.filter(t => t.parent_id === taskId).map(t => t.id)
  return [...children, ...children.flatMap(id => getDescendants(id, allTasks))]
}
