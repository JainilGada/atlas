import { Link } from 'react-router-dom'
import type { DayLog } from '@/lib/types'

interface DailySummaryProps {
  dayLog: DayLog
  consumedKcal: number
}

export function DailySummary({ dayLog, consumedKcal }: DailySummaryProps) {
  const goal = dayLog.goal_kcal ?? 0
  const burned = dayLog.burned_kcal ?? 0
  const net = consumedKcal - burned
  const balance = goal ? net - goal : null

  const progressPct = goal ? Math.min(100, Math.round((consumedKcal / goal) * 100)) : 0

  const balanceColor =
    balance == null ? '#6B7280'
    : Math.abs(balance) <= 100 ? '#22C55E'
    : balance < 0 ? '#3B82F6'
    : '#EF4444'

  const progressColor =
    progressPct > 100 ? '#EF4444'
    : progressPct > 85 ? '#F59E0B'
    : '#6C63FF'

  return (
    <div
      className="bg-white rounded-xl p-4"
      style={{ border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
    >
      {/* Large calorie number */}
      <div className="flex items-end justify-between mb-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-0.5">Consumed</p>
          <p className="text-3xl font-bold text-foreground leading-none">
            {consumedKcal}
            <span className="text-sm font-normal text-muted-foreground ml-1">kcal</span>
          </p>
        </div>
        {balance != null && (
          <div className="text-right">
            <p className="text-xs text-muted-foreground mb-0.5">Balance</p>
            <p className="text-base font-bold" style={{ color: balanceColor }}>
              {balance > 0 ? '+' : ''}{balance} kcal
            </p>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {goal > 0 && (
        <div className="space-y-1 mb-4">
          <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#EDE9FF' }}>
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPct}%`, backgroundColor: progressColor }}
            />
          </div>
          <p className="text-[11px] text-muted-foreground text-right">{progressPct}% of {goal} kcal goal</p>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <Stat label="Burned" value={burned} unit="kcal" />
        <Stat label="Net" value={net} unit="kcal" />
        <Stat label="Goal" value={goal || '—'} unit={goal ? 'kcal' : ''} />
      </div>

      {/* No-goal nudge */}
      {!goal && (
        <p className="text-xs text-muted-foreground mt-3 text-center">
          No calorie goal set.{' '}
          <Link to="/settings/nutrition" className="text-primary font-medium hover:underline">
            Set up your profile →
          </Link>
        </p>
      )}
    </div>
  )
}

function Stat({ label, value, unit }: { label: string; value: number | string; unit: string }) {
  return (
    <div className="bg-[#F7F7FB] rounded-lg py-2.5 px-1">
      <p className="text-[10px] font-medium text-muted-foreground mb-0.5">{label}</p>
      <p className="text-base font-bold text-foreground leading-tight">
        {value}
        {unit && <span className="text-[10px] font-normal text-muted-foreground ml-0.5">{unit}</span>}
      </p>
    </div>
  )
}
