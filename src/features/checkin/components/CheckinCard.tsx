import { useEffect, useRef, useState } from 'react'
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

function getDayNumber(startDate: string | null, targetDate: string): number {
  if (!startDate) return 1
  const start = new Date(startDate + 'T00:00:00')
  const target = new Date(targetDate + 'T00:00:00')
  const diff = Math.floor((target.getTime() - start.getTime()) / 86400000)
  return Math.max(1, diff + 1)
}

function isTaskComplete(entry: TaskEntry | undefined, outputType: Task['output_type']): boolean {
  if (!entry) return false
  if (outputType === 'yes_no') return entry.value_bool === true
  if (outputType === 'number') return entry.value_number != null
  if (['single_photo', 'multiple_photos', 'single_file', 'multiple_files'].includes(outputType))
    return Array.isArray(entry.value_files) && entry.value_files.length > 0
  return (entry.value_text ?? '').length > 0
}

export function CheckinCard({ challenge, date, userId, db }: CheckinCardProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [checkinId, setCheckinId] = useState<string | null>(null)
  const [flatTasks, setFlatTasks] = useState<Task[]>([])
  const [entries, setEntries] = useState<Record<string, TaskEntry>>({})
  const [toastVisible, setToastVisible] = useState(false)
  const prevCompleted = useRef(0)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

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
  const completed = flatTasks.filter(t => isTaskComplete(entries[t.id], t.output_type)).length
  const total = flatTasks.length
  const isAllDone = completed === total && total > 0
  const taskPct = total > 0 ? Math.round((completed / total) * 100) : 0

  const currentDay = getDayNumber(challenge.start_date, date)
  const totalDays = challenge.duration_days ?? 75
  const challengePct = Math.min(100, Math.round((currentDay / totalDays) * 100))

  // Trigger toast when all tasks become complete
  useEffect(() => {
    if (isAllDone && prevCompleted.current !== total && total > 0) {
      setToastVisible(true)
      if (toastTimer.current) clearTimeout(toastTimer.current)
      toastTimer.current = setTimeout(() => setToastVisible(false), 3500)
    }
    prevCompleted.current = completed
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current)
    }
  }, [completed, total, isAllDone])

  return (
    <div
      className="bg-white rounded-xl overflow-hidden transition-all duration-300"
      style={{
        border: `${isAllDone ? 2 : 1}px solid ${isAllDone ? '#22C55E' : '#E5E7EB'}`,
        boxShadow: isAllDone
          ? '0 4px 12px rgba(34,197,94,0.15)'
          : '0 1px 3px rgba(0,0,0,0.08)',
      }}
    >
      {/* Card header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start justify-between gap-2 mb-3">
          <h3 className="font-bold text-[15px] text-foreground leading-tight">{challenge.name}</h3>
          <span className="shrink-0 text-xs font-semibold text-primary bg-secondary px-2.5 py-1 rounded-full whitespace-nowrap">
            Day {currentDay}/{totalDays}
          </span>
        </div>

        {/* Challenge progress (days) */}
        <div className="space-y-1 mb-1">
          <div
            className="h-1.5 rounded-full overflow-hidden"
            style={{ backgroundColor: isAllDone ? '#DCFCE7' : '#EDE9FF' }}
          >
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${challengePct}%`,
                backgroundColor: isAllDone ? '#22C55E' : '#6C63FF',
              }}
            />
          </div>
          <p className="text-[11px] text-muted-foreground">{challengePct}% through challenge</p>
        </div>
      </div>

      {/* Task list */}
      {loading ? (
        <div className="flex justify-center py-8 border-t">
          <Spinner />
        </div>
      ) : error ? (
        <p className="text-sm text-destructive px-4 pb-4 border-t pt-3">{error}</p>
      ) : tree.length === 0 ? (
        <p className="text-sm text-muted-foreground px-4 pb-4 border-t pt-3">
          No tasks yet.{' '}
          <a href={`/challenges/${challenge.id}/setup`} className="text-primary underline">
            Set them up →
          </a>
        </p>
      ) : (
        <div className="border-t divide-y divide-[#F3F4F6]">
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

      {/* Footer */}
      {!loading && !error && total > 0 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-[#F3F4F6]">
          <span
            className={`text-xs font-semibold ${isAllDone ? 'text-[#22C55E]' : 'text-muted-foreground'}`}
          >
            {isAllDone ? '✓ All done!' : `${completed} of ${total} complete`}
          </span>
          {/* Task day progress pill */}
          <div
            className="h-1.5 rounded-full overflow-hidden"
            style={{ width: 80, backgroundColor: '#F3F4F6' }}
          >
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${taskPct}%`,
                backgroundColor: isAllDone ? '#22C55E' : '#6C63FF',
              }}
            />
          </div>
        </div>
      )}

      {/* Completion toast */}
      {toastVisible && (
        <div className="mx-4 mb-4 bg-[#111827] text-white text-sm font-medium px-4 py-3 rounded-xl shadow-xl animate-in slide-in-from-bottom-2 fade-in">
          🎉 {challenge.name} — Day {currentDay} done! Keep going!
        </div>
      )}
    </div>
  )
}
