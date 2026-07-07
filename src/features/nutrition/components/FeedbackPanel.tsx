import { useState, useEffect } from 'react'
import { Sparkles } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import { updateDayLog } from '@/lib/api/nutrition'
import type { DayLog, UserProfile, FoodItem, MealSlot, WorkoutExercise } from '@/lib/types'
import type { SupabaseClient } from '@/lib/supabase'

interface FeedbackPanelProps {
  dayLog: DayLog
  consumedKcal: number
  burnedKcal: number
  allItems: FoodItem[]
  workouts?: WorkoutExercise[]
  profile: UserProfile | null
  db: SupabaseClient
}

const SLOT_LABELS: Record<MealSlot, string> = {
  breakfast: 'Breakfast', morning_snack: 'Morning Snack', lunch: 'Lunch',
  evening_snack: 'Evening Snack', dinner: 'Dinner', late_night: 'Late Night',
}

export function FeedbackPanel({ dayLog, consumedKcal, burnedKcal, allItems, workouts, profile, db }: FeedbackPanelProps) {
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState(dayLog.ai_feedback ?? '')
  const [error, setError] = useState<string | null>(null)

  // Reset feedback when day changes
  useEffect(() => {
    setFeedback(dayLog.ai_feedback ?? '')
    setError(null)
  }, [dayLog.id])

  async function getFeedback() {
    setLoading(true)
    setError(null)
    try {
      const slots = (['breakfast', 'morning_snack', 'lunch', 'evening_snack', 'dinner', 'late_night'] as MealSlot[])
      const meals = slots.map(slot => {
        const slotItems = allItems.filter(f => f.slot === slot && !f.parent_id)
        if (!slotItems.length) return null
        return {
          slot: SLOT_LABELS[slot],
          items: slotItems.map(f => ({ name: f.name, kcal: f.kcal ?? 0 })),
          total_kcal: slotItems.reduce((s, f) => s + (f.kcal ?? 0), 0),
        }
      }).filter(Boolean)

      const workoutSummary = workouts?.map(w => ({
        name: w.name,
        category: w.category,
        sets: w.sets,
        reps: w.reps,
        duration_min: w.duration_min,
        kcal_burned: w.kcal_burned,
      })) ?? []

      const { data, error: fnErr } = await db.functions.invoke('ai-feedback', {
        body: {
          dayLog: {
            date: dayLog.date,
            goal_kcal: dayLog.goal_kcal,
            consumed_kcal: consumedKcal,
            burned_kcal: burnedKcal,
            net_kcal: consumedKcal - burnedKcal,
            balance: dayLog.goal_kcal ? (consumedKcal - burnedKcal) - dayLog.goal_kcal : null,
            steps: dayLog.steps,
            water_litres: dayLog.water_litres,
            strength_duration_min: dayLog.strength_duration_min,
            strength_intensity: dayLog.strength_intensity,
            meals,
            workouts: workoutSummary,
          },
          profile,
        },
      })
      if (fnErr) throw fnErr

      const text = (data as { feedback: string }).feedback
      setFeedback(text)
      await updateDayLog(db, dayLog.id, {
        ai_feedback: text,
        feedback_generated_at: new Date().toISOString(),
      })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to get feedback')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="bg-white rounded-xl p-4"
      style={{ border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-amber-500" /> AI Feedback
        </p>
        <button
          onClick={getFeedback}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-primary text-xs font-semibold hover:bg-primary hover:text-primary-foreground transition-all duration-150 disabled:opacity-50"
        >
          {loading
            ? <Spinner className="h-3.5 w-3.5" />
            : <Sparkles className="h-3.5 w-3.5" />}
          {feedback ? 'Refresh' : 'Get feedback'}
        </button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {loading && !feedback && (
        <div className="flex justify-center py-6"><Spinner /></div>
      )}

      {feedback ? (
        <div className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/80">
          {feedback}
        </div>
      ) : !loading && !error ? (
        <p className="text-sm text-muted-foreground leading-relaxed">
          Log your meals for the day, then tap "Get feedback" for personalised nutrition insights.
        </p>
      ) : null}
    </div>
  )
}
