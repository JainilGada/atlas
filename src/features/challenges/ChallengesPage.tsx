import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Settings, MoreVertical, Archive, Trash2, Play, Pause } from 'lucide-react'
import { useRequiredSession } from '@/features/auth/SessionContext'
import { listChallenges, createChallenge, updateChallenge, softDeleteChallenge } from '@/lib/api/challenges'
import type { Challenge } from '@/lib/types'
import { Spinner } from '@/components/ui/spinner'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ChallengeForm } from './components/ChallengeForm'

function getDayNumber(startDate: string | null): number {
  if (!startDate) return 1
  const start = new Date(startDate + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.max(1, Math.floor((today.getTime() - start.getTime()) / 86400000) + 1)
}

export default function ChallengesPage() {
  const session = useRequiredSession()
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState<Challenge | null>(null)

  async function load() {
    setLoading(true)
    try {
      setChallenges(await listChallenges(session.db, session.userId))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleCreate(data: Omit<Parameters<typeof createChallenge>[1], 'user_id'>) {
    await createChallenge(session.db, { ...data, user_id: session.userId })
    await load()
  }

  async function handleEdit(data: Omit<Parameters<typeof createChallenge>[1], 'user_id'>) {
    if (!editTarget) return
    await updateChallenge(session.db, editTarget.id, data)
    await load()
  }

  async function handleStatus(id: string, status: Challenge['status']) {
    await updateChallenge(session.db, id, { status })
    setChallenges(cs => cs.map(c => (c.id === id ? { ...c, status } : c)))
  }

  async function handleDelete(id: string) {
    await softDeleteChallenge(session.db, id, session.userId)
    setChallenges(cs => cs.filter(c => c.id !== id))
  }

  const active = challenges.filter(c => c.status !== 'archived')
  const archived = challenges.filter(c => c.status === 'archived')

  return (
    <div className="max-w-lg mx-auto px-4 pt-5 pb-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">Challenges</p>
        <button
          onClick={() => { setEditTarget(null); setShowForm(true) }}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-sm hover:opacity-90 active:scale-[0.97] transition-all"
        >
          <Plus className="h-4 w-4" /> New
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : active.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="text-6xl mb-5">🎯</div>
          <h2 className="text-base font-bold text-foreground mb-2">No challenges yet</h2>
          <p className="text-sm text-muted-foreground mb-7 leading-relaxed max-w-[220px]">
            Create a challenge to start building better habits.
          </p>
          <button
            onClick={() => { setEditTarget(null); setShowForm(true) }}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-sm hover:opacity-90 active:scale-[0.97] transition-all"
          >
            <Plus className="h-4 w-4" /> Create your first challenge
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {active.map(c => (
            <ChallengeCard
              key={c.id}
              challenge={c}
              onEdit={() => { setEditTarget(c); setShowForm(true) }}
              onStatus={handleStatus}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {archived.length > 0 && (
        <div className="space-y-3 pt-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Archived</p>
          {archived.map(c => (
            <ChallengeCard
              key={c.id}
              challenge={c}
              onEdit={() => { setEditTarget(c); setShowForm(true) }}
              onStatus={handleStatus}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Profile & Goals link */}
      <div
        className="bg-white rounded-xl p-4 flex items-center justify-between"
        style={{ border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
      >
        <div>
          <p className="text-sm font-semibold text-foreground">Profile & Goals</p>
          <p className="text-xs text-muted-foreground mt-0.5">Body stats, diet preferences, calorie goal</p>
        </div>
        <Link
          to="/settings/nutrition"
          className="flex items-center justify-center w-9 h-9 rounded-full bg-secondary text-primary hover:bg-primary hover:text-primary-foreground transition-all"
          aria-label="Open profile settings"
        >
          <Settings className="h-4 w-4" />
        </Link>
      </div>

      <ChallengeForm
        open={showForm}
        onOpenChange={open => { setShowForm(open); if (!open) setEditTarget(null) }}
        initial={editTarget ?? undefined}
        onSubmit={editTarget ? handleEdit : handleCreate}
      />
    </div>
  )
}

function ChallengeCard({
  challenge: c,
  onEdit,
  onStatus,
  onDelete,
}: {
  challenge: Challenge
  onEdit: () => void
  onStatus: (id: string, status: Challenge['status']) => void
  onDelete: (id: string) => void
}) {
  const currentDay = getDayNumber(c.start_date)
  const totalDays = c.duration_days ?? 0
  const challengePct = totalDays > 0 ? Math.min(100, Math.round((currentDay / totalDays) * 100)) : 0
  const isArchived = c.status === 'archived'
  const isPaused = c.status === 'paused'
  const isCompleted = totalDays > 0 && currentDay > totalDays && !isArchived

  const barColor = isPaused ? '#F59E0B' : isCompleted ? '#22C55E' : '#6C63FF'
  const trackColor = isCompleted ? '#DCFCE7' : '#EDE9FF'

  return (
    <div
      className={`bg-white rounded-xl p-4 transition-all ${isArchived ? 'opacity-60' : ''}`}
      style={{
        border: `1px solid ${isCompleted ? '#22C55E' : '#E5E7EB'}`,
        boxShadow: isCompleted ? '0 2px 8px rgba(34,197,94,0.12)' : '0 1px 3px rgba(0,0,0,0.08)',
      }}
    >
      <div className="flex items-start gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span className="font-bold text-[15px] text-foreground truncate">{c.name}</span>
            {isCompleted && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                ✓ Completed
              </span>
            )}
            {isPaused && !isCompleted && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                Paused
              </span>
            )}
          </div>
          {c.description && (
            <p className="text-xs text-muted-foreground line-clamp-1">{c.description}</p>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {totalDays > 0 && !isArchived && (
            <span
              className="text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
              style={{
                color: isCompleted ? '#16A34A' : 'hsl(var(--primary))',
                backgroundColor: isCompleted ? '#DCFCE7' : 'hsl(var(--secondary))',
              }}
            >
              {isCompleted ? `${totalDays}/${totalDays} days` : `Day ${currentDay}/${totalDays}`}
            </span>
          )}
          {!isArchived && (
            <Link
              to={`/challenges/${c.id}/setup`}
              className="w-8 h-8 flex items-center justify-center rounded-full text-muted-foreground hover:text-primary hover:bg-secondary transition-all"
              aria-label="Set up tasks"
            >
              <Settings className="h-3.5 w-3.5" />
            </Link>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-8 h-8 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
                <MoreVertical className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>Edit</DropdownMenuItem>
              <DropdownMenuSeparator />
              {c.status === 'active' && (
                <DropdownMenuItem onClick={() => onStatus(c.id, 'paused')}>
                  <Pause className="h-4 w-4 mr-2" /> Pause
                </DropdownMenuItem>
              )}
              {c.status === 'paused' && (
                <DropdownMenuItem onClick={() => onStatus(c.id, 'active')}>
                  <Play className="h-4 w-4 mr-2" /> Resume
                </DropdownMenuItem>
              )}
              {c.status !== 'archived' && (
                <DropdownMenuItem onClick={() => onStatus(c.id, 'archived')}>
                  <Archive className="h-4 w-4 mr-2" /> Archive
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => { if (confirm('Delete this challenge?')) onDelete(c.id) }}
              >
                <Trash2 className="h-4 w-4 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Progress bar */}
      {totalDays > 0 && (
        <div className="space-y-1">
          <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: trackColor }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${challengePct}%`, backgroundColor: barColor }}
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            {isCompleted ? '🏆 Challenge complete!' : `${challengePct}% through challenge`}
          </p>
        </div>
      )}
    </div>
  )
}
