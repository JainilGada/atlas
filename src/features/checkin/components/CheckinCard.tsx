import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { TaskNode } from './TaskNode'
import { getOrCreateCheckin, getTaskEntries } from '@/lib/api/checkins'
import { listTasks, buildTree } from '@/lib/api/tasks'
import type { Challenge, Task, TaskEntry } from '@/lib/types'
import type { SupabaseClient } from '@/lib/supabase'

interface CheckinCardProps {
  challenge: Challenge
  date: string
  userId: string
  db: SupabaseClient
}

export function CheckinCard({ challenge, date, userId, db }: CheckinCardProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [checkinId, setCheckinId] = useState<string | null>(null)
  const [flatTasks, setFlatTasks] = useState<Task[]>([])
  const [entries, setEntries] = useState<Record<string, TaskEntry>>({})

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [checkin, tasks] = await Promise.all([
          getOrCreateCheckin(db, userId, challenge.id, date),
          listTasks(db, challenge.id),
        ])
        if (cancelled) return
        setCheckinId(checkin.id)
        setFlatTasks(tasks)
        const taskEntries = await getTaskEntries(db, checkin.id)
        if (!cancelled) setEntries(taskEntries)
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [challenge.id, date, userId])

  function handleEntryChange(taskId: string, entry: TaskEntry) {
    setEntries(prev => ({ ...prev, [taskId]: entry }))
  }

  const tree = buildTree(flatTasks)
  const completed = flatTasks.filter(t => {
    const e = entries[t.id]
    if (!e) return false
    if (t.output_type === 'yes_no') return e.value_bool === true
    if (t.output_type === 'number') return e.value_number != null
    if (['single_photo', 'multiple_photos', 'single_file', 'multiple_files'].includes(t.output_type))
      return Array.isArray(e.value_files) && e.value_files.length > 0
    return (e.value_text ?? '').length > 0
  }).length
  const total = flatTasks.length

  return (
    <Card>
      <CardHeader className="pb-2 px-4 pt-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{challenge.name}</CardTitle>
          <Badge variant={completed === total && total > 0 ? 'default' : 'secondary'} className="text-xs shrink-0">
            {completed} / {total}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : error ? (
          <p className="text-sm text-destructive px-4 pb-4">{error}</p>
        ) : tree.length === 0 ? (
          <p className="text-sm text-muted-foreground px-4 pb-4">
            No tasks yet.{' '}
            <a href={`/challenges/${challenge.id}/setup`} className="underline">Set them up →</a>
          </p>
        ) : (
          <div className="border-t divide-y">
            {tree.map(node => (
              <TaskNode
                key={node.id}
                node={node}
                allFlat={flatTasks}
                checkinId={checkinId!}
                userId={userId}
                date={date}
                db={db}
                entries={entries}
                onEntryChange={handleEntryChange}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
