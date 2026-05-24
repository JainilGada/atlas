import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays } from 'lucide-react'
import { useRequiredSession } from '@/features/auth/SessionContext'
import { listChallenges } from '@/lib/api/challenges'
import type { Challenge } from '@/lib/types'
import { Spinner } from '@/components/ui/spinner'
import { CheckinCard } from './components/CheckinCard'

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

export default function CheckinPage() {
  const session = useRequiredSession()
  const [date, setDate] = useState(todayStr)
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listChallenges(session.db, session.userId)
      .then(all => setChallenges(all.filter(c => c.status === 'active')))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
      {/* Date picker header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Check-in</h1>
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <input
            type="date"
            value={date}
            max={todayStr()}
            onChange={e => setDate(e.target.value)}
            className="text-sm border rounded-md px-2 py-1 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : challenges.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground space-y-3">
          <p>No active challenges.</p>
          <Link to="/challenges" className="text-sm underline">Create a challenge →</Link>
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
        </div>
      )}
    </div>
  )
}
