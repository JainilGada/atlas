import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, Plus } from 'lucide-react'
import { useRequiredSession } from '@/features/auth/SessionContext'
import { listChallenges } from '@/lib/api/challenges'
import type { Challenge } from '@/lib/types'
import { Spinner } from '@/components/ui/spinner'
import { CheckinCard } from './components/CheckinCard'

const MOTIVATIONAL_LINES = [
  'Small steps every day.',
  'Show up again.',
  "You've got this.",
  'Progress over perfection.',
  'One day at a time.',
  'Consistency beats intensity.',
  'Trust the process.',
]

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

function formatDateHeader(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })
}

export default function CheckinPage() {
  const session = useRequiredSession()
  const [date, setDate] = useState(todayStr)
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [loading, setLoading] = useState(true)

  const motiveLine = MOTIVATIONAL_LINES[new Date().getDate() % MOTIVATIONAL_LINES.length]

  useEffect(() => {
    listChallenges(session.db, session.userId)
      .then(all => setChallenges(all.filter(c => c.status === 'active')))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-lg mx-auto px-4 pt-5 pb-6 space-y-4">
      {/* Date header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-0.5">{formatDateHeader(date)}</p>
          <p className="text-sm font-medium text-foreground">{motiveLine}</p>
        </div>
        <label className="flex items-center gap-1.5 text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
          <CalendarDays className="h-4 w-4 shrink-0" />
          <input
            type="date"
            value={date}
            max={todayStr()}
            onChange={e => setDate(e.target.value)}
            className="text-xs border border-border rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all cursor-pointer"
          />
        </label>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : challenges.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="text-6xl mb-5">📋</div>
          <h2 className="text-base font-bold text-foreground mb-2">No active challenges</h2>
          <p className="text-sm text-muted-foreground mb-7 leading-relaxed max-w-[220px]">
            Set a challenge to start tracking your daily habits.
          </p>
          <Link
            to="/challenges"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-sm hover:opacity-90 active:scale-[0.97] transition-all"
          >
            <Plus className="h-4 w-4" /> Add your first challenge
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {challenges.map(c => (
            <CheckinCard
              key={`${c.id}-${date}`}
              challenge={c}
              date={date}
              userId={session.userId}
              db={session.db}
            />
          ))}
          <Link
            to="/challenges"
            className="flex items-center gap-2 text-sm font-semibold text-primary py-2 hover:opacity-80 transition-opacity"
          >
            <Plus className="h-4 w-4" /> Add challenge
          </Link>
        </div>
      )}
    </div>
  )
}
