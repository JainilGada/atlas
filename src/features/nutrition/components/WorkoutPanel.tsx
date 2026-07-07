import { useState, useEffect } from 'react'
import { Plus, Trash2, Dumbbell } from 'lucide-react'
import {
  listWorkoutExercises, createWorkoutExercise, softDeleteWorkoutExercise, exerciseToKcal,
} from '@/lib/api/nutrition'
import { WORKOUT_CATEGORY_LABELS, WORKOUT_KCAL_PER_MIN, type WorkoutCategory, type WorkoutExercise } from '@/lib/types'
import type { SupabaseClient } from '@/lib/supabase'

interface WorkoutPanelProps {
  dayLogId: string
  userId: string
  db: SupabaseClient
  onKcalChange: (kcal: number) => void
}

const CATEGORIES = Object.keys(WORKOUT_CATEGORY_LABELS) as WorkoutCategory[]

const EMPTY_FORM = { name: '', category: 'other' as WorkoutCategory, duration_min: '', sets: '', reps: '' }

export function WorkoutPanel({ dayLogId, userId, db, onKcalChange }: WorkoutPanelProps) {
  const [exercises, setExercises] = useState<WorkoutExercise[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    listWorkoutExercises(db, dayLogId).then(setExercises).catch(console.error)
  }, [dayLogId])

  const totalKcal = exercises.reduce((s, e) => s + (e.kcal_burned ?? 0), 0)

  useEffect(() => {
    onKcalChange(totalKcal)
  }, [totalKcal])

  async function handleAdd() {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const durationMin = parseInt(form.duration_min) || null
      const sets = parseInt(form.sets) || null
      const reps = parseInt(form.reps) || null
      const kcal_burned = durationMin ? exerciseToKcal(form.category, durationMin) : null
      const ex = await createWorkoutExercise(db, {
        day_log_id: dayLogId,
        user_id: userId,
        name: form.name.trim(),
        category: form.category,
        sets,
        reps,
        duration_min: durationMin,
        kcal_burned,
        sort_order: exercises.length,
      })
      setExercises(prev => [...prev, ex])
      setForm(EMPTY_FORM)
      setShowForm(false)
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    await softDeleteWorkoutExercise(db, id, userId)
    setExercises(prev => prev.filter(e => e.id !== id))
  }

  return (
    <div
      className="bg-white rounded-xl p-4"
      style={{ border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Dumbbell className="h-4 w-4 text-primary" /> Workouts
        </p>
        <div className="flex items-center gap-2">
          {totalKcal > 0 && (
            <span className="text-xs font-medium text-primary bg-secondary px-2.5 py-1 rounded-full">
              −{totalKcal} kcal
            </span>
          )}
          <button
            onClick={() => setShowForm(s => !s)}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-secondary text-primary hover:bg-primary hover:text-primary-foreground transition-all"
            aria-label="Add workout"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Exercise list */}
      {exercises.length > 0 && (
        <div className="space-y-2 mb-3">
          {exercises.map(ex => (
            <div key={ex.id} className="flex items-center gap-3 group">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-foreground truncate">{ex.name}</span>
                  <span className="text-[11px] text-muted-foreground bg-[#F3F4F6] px-1.5 py-0.5 rounded-full">
                    {WORKOUT_CATEGORY_LABELS[ex.category]}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {ex.duration_min ? `${ex.duration_min} min` : ''}
                  {ex.sets ? `${ex.duration_min ? ' · ' : ''}${ex.sets}×${ex.reps ?? '?'} sets` : ''}
                  {ex.kcal_burned ? ` · ≈${ex.kcal_burned} kcal` : ''}
                </p>
              </div>
              <button
                onClick={() => handleDelete(ex.id)}
                className="shrink-0 w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all"
                aria-label="Remove"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div className="border-t border-[#F3F4F6] pt-3 space-y-2.5">
          {/* Name */}
          <input
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Exercise name"
            className="w-full text-sm text-foreground bg-white border border-border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all placeholder:text-muted-foreground"
          />

          {/* Category + Duration row */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[11px] text-muted-foreground font-medium">Type</label>
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value as WorkoutCategory }))}
                className="w-full h-9 rounded-lg border border-border bg-white px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{WORKOUT_CATEGORY_LABELS[c]}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-muted-foreground font-medium">Duration (min)</label>
              <input
                type="number"
                min="1"
                value={form.duration_min}
                onChange={e => setForm(f => ({ ...f, duration_min: e.target.value }))}
                placeholder="e.g. 30"
                className="w-full h-9 rounded-lg border border-border bg-white px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              />
            </div>
          </div>

          {/* Sets / Reps row */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[11px] text-muted-foreground font-medium">Sets (optional)</label>
              <input
                type="number"
                min="1"
                value={form.sets}
                onChange={e => setForm(f => ({ ...f, sets: e.target.value }))}
                placeholder="3"
                className="w-full h-9 rounded-lg border border-border bg-white px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-muted-foreground font-medium">Reps (optional)</label>
              <input
                type="number"
                min="1"
                value={form.reps}
                onChange={e => setForm(f => ({ ...f, reps: e.target.value }))}
                placeholder="10"
                className="w-full h-9 rounded-lg border border-border bg-white px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              />
            </div>
          </div>

          {/* Kcal preview */}
          {form.duration_min && (
            <p className="text-[11px] text-muted-foreground">
              ≈ {exerciseToKcal(form.category, parseInt(form.duration_min) || 0)} kcal estimated for {WORKOUT_CATEGORY_LABELS[form.category].toLowerCase()}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-0.5">
            <button
              onClick={handleAdd}
              disabled={!form.name.trim() || saving}
              className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-all"
            >
              {saving ? 'Saving…' : 'Add workout'}
            </button>
            <button
              onClick={() => { setShowForm(false); setForm(EMPTY_FORM) }}
              className="px-4 py-2 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {exercises.length === 0 && !showForm && (
        <p className="text-xs text-muted-foreground">
          Log your workouts to track calories burned.
        </p>
      )}
    </div>
  )
}
