import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Settings, CalendarDays } from 'lucide-react'
import { useRequiredSession } from '@/features/auth/SessionContext'
import { getOrCreateDayLog, listFoodItems, updateDayLog, stepsToKcal, strengthToKcal, buildFoodTree, totalSlotKcal } from '@/lib/api/nutrition'
import { getProfile, goalKcal } from '@/lib/api/profile'
import type { DayLog, FoodItem, MealSlot, UserProfile } from '@/lib/types'
import { Spinner } from '@/components/ui/spinner'
import { Button } from '@/components/ui/button'
import { SlotCard } from './components/SlotCard'
import { DailySummary } from './components/DailySummary'
import { ActivityPanel } from './components/ActivityPanel'
import { FeedbackPanel } from './components/FeedbackPanel'

const SLOTS: MealSlot[] = ['breakfast', 'morning_snack', 'lunch', 'evening_snack', 'dinner']

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

export default function NutritionPage() {
  const session = useRequiredSession()
  const [date, setDate] = useState(todayStr)
  const [loading, setLoading] = useState(true)
  const [dayLog, setDayLog] = useState<DayLog | null>(null)
  const [items, setItems] = useState<FoodItem[]>([])
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [burnedKcal, setBurnedKcal] = useState(0)
  const [showLateNight, setShowLateNight] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const [log, prof] = await Promise.all([
          getOrCreateDayLog(session.db, session.userId, date),
          getProfile(session.db, session.userId),
        ])
        if (cancelled) return

        const fi = await listFoodItems(session.db, log.id)
        if (cancelled) return

        // Sync goal_kcal from profile if not set
        if (!log.goal_kcal && prof?.tdee) {
          const gk = goalKcal(prof.tdee, prof.goal)
          await updateDayLog(session.db, log.id, { goal_kcal: gk })
          log.goal_kcal = gk
        }

        setDayLog(log)
        setItems(fi)
        setProfile(prof)

        // Recompute burned
        const s = log.steps ?? 0
        const d = log.strength_duration_min ?? 0
        const intensity = log.strength_intensity ?? ''
        setBurnedKcal(stepsToKcal(s) + (d && intensity ? strengthToKcal(d, intensity) : 0))

        // Show late night if already has items there
        if (fi.some(f => f.slot === 'late_night')) setShowLateNight(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [date])

  // Recompute consumed_kcal and sync to DB when items change
  useEffect(() => {
    if (!dayLog) return
    const tree = buildFoodTree(items)
    const consumed = tree.reduce((sum, node) => sum + totalSlotKcal([node]), 0)
    const net = consumed - burnedKcal
    const balance = dayLog.goal_kcal ? net - dayLog.goal_kcal : null
    updateDayLog(session.db, dayLog.id, {
      consumed_kcal: consumed,
      burned_kcal: burnedKcal,
      net_kcal: net,
      ...(balance != null ? { balance } : {}),
    }).catch(console.error)
  }, [items, burnedKcal])

  function handleItemsChange(_slot: MealSlot, updated: FoodItem[]) {
    // updated already contains all items (slot replaced in parent)
    setItems(updated)
  }

  // Compute consumed for summary
  const consumedKcal = buildFoodTree(items).reduce((sum, n) => sum + totalSlotKcal([n]), 0)

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>
  if (!dayLog) return null

  const activeSlots = showLateNight ? [...SLOTS, 'late_night' as MealSlot] : SLOTS

  return (
    <div className="max-w-lg mx-auto px-4 pt-5 pb-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">Nutrition</p>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
            <Link to="/settings/nutrition" aria-label="Nutrition settings">
              <Settings className="h-4 w-4" />
            </Link>
          </Button>
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
      </div>

      {/* Daily summary */}
      <DailySummary dayLog={{ ...dayLog, burned_kcal: burnedKcal }} consumedKcal={consumedKcal} />

      {/* Meal slots */}
      {activeSlots.map(slot => (
        <SlotCard
          key={`${slot}-${date}`}
          slot={slot}
          items={items}
          dayLogId={dayLog.id}
          userId={session.userId}
          date={date}
          db={session.db}
          profile={profile}
          onItemsChange={handleItemsChange}
        />
      ))}

      {!showLateNight && (
        <button
          onClick={() => setShowLateNight(true)}
          className="text-xs text-muted-foreground hover:text-foreground w-full text-center py-1"
        >
          + Add Late Night snack
        </button>
      )}

      {/* Activity */}
      <ActivityPanel
        dayLog={dayLog}
        db={session.db}
        onBurnedChange={burned => {
          setBurnedKcal(burned)
          setDayLog(prev => prev ? { ...prev, burned_kcal: burned } : prev)
        }}
      />

      {/* AI Feedback */}
      <FeedbackPanel
        dayLog={dayLog}
        consumedKcal={consumedKcal}
        burnedKcal={burnedKcal}
        allItems={items}
        profile={profile}
        db={session.db}
      />
    </div>
  )
}
