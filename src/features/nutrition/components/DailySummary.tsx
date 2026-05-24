import type { DayLog } from '@/lib/types'
import { cn } from '@/lib/utils'

interface DailySummaryProps {
  dayLog: DayLog
  consumedKcal: number
}

export function DailySummary({ dayLog, consumedKcal }: DailySummaryProps) {
  const goal = dayLog.goal_kcal ?? 0
  const burned = dayLog.burned_kcal ?? 0
  const net = consumedKcal - burned
  const balance = goal ? net - goal : null

  const balanceColor = balance == null
    ? 'text-muted-foreground'
    : balance > 200
      ? 'text-red-600 dark:text-red-400'
      : balance < -500
        ? 'text-blue-600 dark:text-blue-400'
        : 'text-green-600 dark:text-green-400'

  const progressPct = goal ? Math.min(100, Math.round((consumedKcal / goal) * 100)) : 0

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Daily Summary</span>
        {balance != null && (
          <span className={cn('text-sm font-semibold', balanceColor)}>
            {balance > 0 ? '+' : ''}{balance} kcal
          </span>
        )}
      </div>

      {/* Progress bar */}
      {goal > 0 && (
        <div className="space-y-1">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                progressPct > 100 ? 'bg-red-500' : progressPct > 85 ? 'bg-yellow-500' : 'bg-green-500',
              )}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-right">{progressPct}% of goal</p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 text-center">
        <Stat label="Consumed" value={consumedKcal} unit="kcal" />
        <Stat label="Burned" value={burned} unit="kcal" />
        <Stat label="Goal" value={goal || '—'} unit={goal ? 'kcal' : ''} />
      </div>

      {net !== consumedKcal && (
        <p className="text-xs text-center text-muted-foreground">
          Net: <strong>{net} kcal</strong>
        </p>
      )}
    </div>
  )
}

function Stat({ label, value, unit }: { label: string; value: number | string; unit: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold leading-tight">
        {value}
        {unit && <span className="text-xs font-normal text-muted-foreground ml-0.5">{unit}</span>}
      </p>
    </div>
  )
}
