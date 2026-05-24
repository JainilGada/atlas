import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Settings, MoreVertical, Archive, Trash2, Play, Pause } from 'lucide-react'
import { useRequiredSession } from '@/features/auth/SessionContext'
import { listChallenges, createChallenge, updateChallenge, softDeleteChallenge } from '@/lib/api/challenges'
import type { Challenge } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ChallengeForm } from './components/ChallengeForm'

const STATUS_COLORS: Record<Challenge['status'], string> = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  paused: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  archived: 'bg-muted text-muted-foreground',
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
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Challenges</h1>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-1" /> New
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : active.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <ListTodo className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p>No challenges yet.</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => setShowForm(true)}>
            Create your first challenge
          </Button>
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
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Archived</p>
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

      <ChallengeForm
        open={showForm}
        onOpenChange={open => { setShowForm(open); if (!open) setEditTarget(null) }}
        initial={editTarget ?? undefined}
        onSubmit={editTarget ? handleEdit : handleCreate}
      />
    </div>
  )
}

function ListTodo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
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
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium truncate">{c.name}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[c.status]}`}>
                {c.status}
              </span>
            </div>
            {c.description && (
              <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">{c.description}</p>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {c.status !== 'archived' && (
              <Button variant="ghost" size="icon" asChild className="h-8 w-8">
                <Link to={`/challenges/${c.id}/setup`} aria-label="Set up tasks">
                  <Settings className="h-4 w-4" />
                </Link>
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
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
      </CardContent>
    </Card>
  )
}
