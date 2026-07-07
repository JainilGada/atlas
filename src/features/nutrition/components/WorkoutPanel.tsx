import { useRef, useState, useEffect } from 'react'
import { Plus, Trash2, Dumbbell, Camera, Loader2 } from 'lucide-react'
import {
  listWorkoutExercises, createWorkoutExercise, softDeleteWorkoutExercise, exerciseToKcal,
} from '@/lib/api/nutrition'
import { WORKOUT_CATEGORY_LABELS, type WorkoutCategory, type WorkoutExercise } from '@/lib/types'
import type { SupabaseClient } from '@/lib/supabase'

interface WorkoutPanelProps {
  dayLogId: string
  userId: string
  db: SupabaseClient
  onKcalChange: (kcal: number) => void
  onWorkoutsChange?: (workouts: WorkoutExercise[]) => void
}

const CATEGORIES = Object.keys(WORKOUT_CATEGORY_LABELS) as WorkoutCategory[]
const EMPTY_FORM = { name: '', category: 'other' as WorkoutCategory, duration_min: '', sets: '', reps: '' }

interface ScannedExercise {
  name: string
  category: WorkoutCategory
  sets?: number
  reps?: number
  duration_min?: number
  selected: boolean
}

export function WorkoutPanel({ dayLogId, userId, db, onKcalChange, onWorkoutsChange }: WorkoutPanelProps) {
  const [exercises, setExercises] = useState<WorkoutExercise[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [scanned, setScanned] = useState<ScannedExercise[]>([])
  const [addingScanned, setAddingScanned] = useState(false)
  const photoRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    listWorkoutExercises(db, dayLogId).then(exs => {
      setExercises(exs)
      onWorkoutsChange?.(exs)
    }).catch(console.error)
  }, [dayLogId])

  const totalKcal = exercises.reduce((s, e) => s + (e.kcal_burned ?? 0), 0)

  useEffect(() => {
    onKcalChange(totalKcal)
    onWorkoutsChange?.(exercises)
  }, [exercises])

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

  async function handlePhotoScan(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setScanning(true)
    setScanned([])
    try {
      const arrayBuffer = await file.arrayBuffer()
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))
      const mediaType = file.type as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'
      const { data, error } = await db.functions.invoke('ai-workout-scan', {
        body: { imageBase64: base64, mediaType },
      })
      if (error) throw error
      const exs = (data as { exercises: ScannedExercise[] }).exercises ?? []
      setScanned(exs.map(ex => ({
        ...ex,
        category: (CATEGORIES.includes(ex.category as WorkoutCategory) ? ex.category : 'other') as WorkoutCategory,
        selected: true,
      })))
    } catch (err) {
      console.error('Scan failed', err)
    } finally {
      setScanning(false)
      if (photoRef.current) photoRef.current.value = ''
    }
  }

  async function handleAddScanned() {
    const toAdd = scanned.filter(s => s.selected)
    if (!toAdd.length) return
    setAddingScanned(true)
    try {
      const created = await Promise.all(toAdd.map((s, i) => {
        const kcal_burned = s.duration_min ? exerciseToKcal(s.category, s.duration_min) : null
        return createWorkoutExercise(db, {
          day_log_id: dayLogId,
          user_id: userId,
          name: s.name,
          category: s.category,
          sets: s.sets ?? null,
          reps: s.reps ?? null,
          duration_min: s.duration_min ?? null,
          kcal_burned,
          sort_order: exercises.length + i,
        })
      }))
      setExercises(prev => [...prev, ...created])
      setScanned([])
    } finally {
      setAddingScanned(false)
    }
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
        <div className="flex items-center gap-1.5">
          {totalKcal > 0 && (
            <span className="text-xs font-medium text-primary bg-secondary px-2.5 py-1 rounded-full">
              −{totalKcal} kcal
            </span>
          )}
          {/* Scan photo button */}
          <button
            onClick={() => photoRef.current?.click()}
            disabled={scanning}
            title="Scan whiteboard photo"
            className="w-7 h-7 flex items-center justify-center rounded-full bg-[#F3F4F6] text-muted-foreground hover:bg-secondary hover:text-primary transition-all disabled:opacity-50"
          >
            {scanning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
          </button>
          <input
            ref={photoRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic"
            className="sr-only"
            onChange={handlePhotoScan}
          />
          <button
            onClick={() => setShowForm(s => !s)}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-secondary text-primary hover:bg-primary hover:text-primary-foreground transition-all"
            aria-label="Add workout"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Scanned results */}
      {scanned.length > 0 && (
        <div className="mb-3 border border-primary/20 rounded-xl p-3 bg-secondary/30 space-y-2">
          <p className="text-xs font-semibold text-primary mb-2">
            Found {scanned.length} exercise{scanned.length > 1 ? 's' : ''} — select to add:
          </p>
          {scanned.map((s, i) => (
            <label key={i} className="flex items-start gap-2.5 cursor-pointer group">
              <input
                type="checkbox"
                checked={s.selected}
                onChange={e => setScanned(prev => prev.map((x, j) => j === i ? { ...x, selected: e.target.checked } : x))}
                className="mt-0.5 accent-primary h-4 w-4 rounded"
              />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-foreground">{s.name}</span>
                <span className="text-[11px] text-muted-foreground bg-[#F3F4F6] px-1.5 py-0.5 rounded-full ml-2">
                  {WORKOUT_CATEGORY_LABELS[s.category]}
                </span>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {s.duration_min ? `${s.duration_min} min` : ''}
                  {s.sets ? `${s.duration_min ? ' · ' : ''}${s.sets}×${s.reps ?? '?'}` : ''}
                </p>
              </div>
            </label>
          ))}
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleAddScanned}
              disabled={addingScanned || !scanned.some(s => s.selected)}
              className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition-all"
            >
              {addingScanned ? 'Adding…' : `Add ${scanned.filter(s => s.selected).length} exercise${scanned.filter(s => s.selected).length !== 1 ? 's' : ''}`}
            </button>
            <button
              onClick={() => setScanned([])}
              className="px-3 py-2 rounded-xl border border-border text-xs text-muted-foreground hover:text-foreground transition-all"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

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

      {/* Manual add form */}
      {showForm && (
        <div className="border-t border-[#F3F4F6] pt-3 space-y-2.5">
          <input
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Exercise name"
            className="w-full text-sm text-foreground bg-white border border-border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all placeholder:text-muted-foreground"
          />

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

          {form.duration_min && (
            <p className="text-[11px] text-muted-foreground">
              ≈ {exerciseToKcal(form.category, parseInt(form.duration_min) || 0)} kcal for {WORKOUT_CATEGORY_LABELS[form.category].toLowerCase()}
            </p>
          )}

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

      {exercises.length === 0 && !showForm && scanned.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Log workouts manually or tap <Camera className="inline h-3 w-3 mb-0.5" /> to scan a gym whiteboard.
        </p>
      )}
    </div>
  )
}
