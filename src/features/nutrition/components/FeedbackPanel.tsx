import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { updateDayLog } from '@/lib/api/nutrition'
import type { DayLog, UserProfile, FoodItem, MealSlot } from '@/lib/types'
import type { SupabaseClient } from '@/lib/supabase'

interface FeedbackPanelProps {
  dayLog: DayLog
  consumedKcal: number
  burnedKcal: number
  allItems: FoodItem[]
  profile: UserProfile | null
  db: SupabaseClient
}

const SLOT_LABELS: Record<MealSlot, string> = {
  breakfast: 'Breakfast', morning_snack: 'Morning Snack', lunch: 'Lunch',
  evening_snack: 'Evening Snack', dinner: 'Dinner', late_night: 'Late Night',
}

export function FeedbackPanel({ dayLog, consumedKcal, burnedKcal, allItems, profile, db }: FeedbackPanelProps) {
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState(dayLog.ai_feedback ?? '')
  const [error, setError] = useState<string | null>(null)

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

      const dayLogSummary = {
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
      }

      const { data, error: fnErr } = await db.functions.invoke('ai-feedback', {
        body: { dayLog: dayLogSummary, profile },
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
    <Card>
      <CardHeader className="pb-3 px-4 pt-4 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-amber-500" /> AI Feedback
        </CardTitle>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={getFeedback} disabled={loading}>
          {loading ? <Spinner className="h-3.5 w-3.5 mr-1" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}
          {feedback ? 'Refresh' : 'Get feedback'}
        </Button>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {error && <p className="text-sm text-destructive">{error}</p>}
        {loading && !feedback && (
          <div className="flex justify-center py-4"><Spinner /></div>
        )}
        {feedback && (
          <div className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
            {feedback}
          </div>
        )}
        {!feedback && !loading && !error && (
          <p className="text-sm text-muted-foreground">
            Log your meals for the day, then tap "Get feedback" for personalised nutrition insights.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
