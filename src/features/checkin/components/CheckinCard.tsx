import { useEffect, useMemo, useRef, useState } from 'react'
import { Spinner } from '@/components/ui/spinner'

const CONFETTI_COLORS = ['#6C63FF', '#22C55E', '#F59E0B', '#EF4444', '#3B82F6', '#EC4899']

function Confetti({ active }: { active: boolean }) {
  const particles = useMemo(() =>
    Array.from({ length: 60 }, (_, i) => ({
      id: i,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      left: 10 + Math.random() * 80,
      delay: Math.random() * 0.5,
      duration: 1.6 + Math.random() * 0.8,
      width: 6 + Math.random() * 6,
      height: 4 + Math.random() * 5,
      rotate: Math.random() * 360,
    }))
  , [])

  if (!active) return null

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-50 rounded-xl">
      <style>{`
        @keyframes cfFall {
          0%   { transform: translateY(-8px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(600px) rotate(540deg); opacity: 0; }
        }
      `}</style>
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute rounded-sm"
          style={{
            left: `${p.left}%`,
            top: 0,
            width: p.width,
            height: p.height,
            backgroundColor: p.color,
            transform: `rotate(${p.rotate}deg)`,
            animation: `cfFall ${p.duration}s ${p.delay}s ease-in both`,
          }}
        />
      ))}
    </div>
  )
}

const MILESTONE_DAYS = [7, 30, 75]

interface Milestone {
  day: number
  emoji: string
  title: string
  message: string
}

function getMilestone(currentDay: number, totalDays: number): Milestone | null {
  const half = Math.floor(totalDays / 2)
  const milestones: Array<[number, string, string, string]> = [
    [7,    '🔥', 'One Week Strong!',    'Seven days down. You\'re building a real habit now.'],
    [half, '⚡', 'Halfway There!',      `${half} days complete. The momentum is on your side.`],
    [30,   '💪', '30-Day Warrior!',     'A full month of commitment. Most people quit before this.'],
    [75,   '🏆', 'Challenge Complete!', 'You went the distance. That\'s what separates the best.'],
  ]

  for (const [day, emoji, title, message] of milestones) {
    if (currentDay === day && day <= totalDays) {
      return { day, emoji, title, message }
    }
  }
  return null
}

function MilestoneModal({ milestone, onClose }: { milestone: Milestone; onClose: () => void }) {
  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const isFinal = milestone.title === 'Challenge Complete!'

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl p-8 max-w-xs w-full text-center shadow-2xl animate-in zoom-in-95 fade-in duration-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="text-6xl mb-4">{milestone.emoji}</div>
        <h2 className="text-xl font-bold text-foreground mb-2">{milestone.title}</h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-6">{milestone.message}</p>
        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 active:scale-[0.97] transition-all"
        >
          {isFinal ? '🎉 Celebrate!' : 'Keep going 🚀'}
        </button>
      </div>
    </div>
  )
}

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

// Track which milestone days have been shown per challenge (session only)
const shownMilestones = new Set<string>()

export function CheckinCard({ challenge, date, userId, db }: CheckinCardProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [checkinId, setCheckinId] = useState<string | null>(null)
  const [flatTasks, setFlatTasks] = useState<Task[]>([])
  const [entries, setEntries] = useState<Record<string, TaskEntry>>({})
  const [toastVisible, setToastVisible] = useState(false)
  const [confettiActive, setConfettiActive] = useState(false)
  const [milestone, setMilestone] = useState<Milestone | null>(null)
  const prevCompleted = useRef(0)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const confettiTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  // Show milestone modal when all tasks done on a milestone day
  useEffect(() => {
    if (!isAllDone || total === 0) return
    const key = `${challenge.id}-${currentDay}`
    if (shownMilestones.has(key)) return
    const m = getMilestone(currentDay, totalDays)
    if (m) {
      shownMilestones.add(key)
      setMilestone(m)
    }
  }, [isAllDone, currentDay, totalDays, challenge.id, total])

  // Trigger confetti + toast when all tasks become complete
  useEffect(() => {
    if (isAllDone && prevCompleted.current !== total && total > 0) {
      setToastVisible(true)
      setConfettiActive(true)
      if (toastTimer.current) clearTimeout(toastTimer.current)
      if (confettiTimer.current) clearTimeout(confettiTimer.current)
      toastTimer.current = setTimeout(() => setToastVisible(false), 3500)
      confettiTimer.current = setTimeout(() => setConfettiActive(false), 2800)
    }
    prevCompleted.current = completed
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current)
      if (confettiTimer.current) clearTimeout(confettiTimer.current)
    }
  }, [completed, total, isAllDone])

  return (
    <>
      {milestone && (
        <MilestoneModal milestone={milestone} onClose={() => setMilestone(null)} />
      )}

      <div
        className="relative bg-white rounded-xl overflow-hidden transition-all duration-300"
        style={{
          border: `${isAllDone ? 2 : 1}px solid ${isAllDone ? '#22C55E' : '#E5E7EB'}`,
          boxShadow: isAllDone
            ? '0 4px 12px rgba(34,197,94,0.15)'
            : '0 1px 3px rgba(0,0,0,0.08)',
        }}
      >
        <Confetti active={confettiActive} />

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
    </>
  )
}
