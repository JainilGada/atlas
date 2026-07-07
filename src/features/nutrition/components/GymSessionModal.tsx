import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, ChevronRight, Timer, X } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import { WORKOUT_CATEGORY_LABELS, type WorkoutCategory } from '@/lib/types'
import type { SupabaseClient } from '@/lib/supabase'
import { createWorkoutExercise, exerciseToKcal } from '@/lib/api/nutrition'

interface GymExercise {
  name: string
  category: WorkoutCategory
  sets: number
  reps?: number
  duration_sec?: number
  rest_sec: number
  cue: string
  muscles: string
}

interface GymSessionModalProps {
  dayLogId: string
  userId: string
  db: SupabaseClient
  sortOrderStart: number
  onClose: () => void
  onWorkoutsAdded: () => void
}

type Phase = 'setup' | 'generating' | 'session' | 'done'

const GOALS = ['Strength', 'Muscle growth', 'Fat loss / HIIT', 'Cardio endurance', 'Full body', 'Upper body', 'Lower body', 'Core']
const DURATIONS = [20, 30, 45, 60]
const EQUIPMENT = ['Bodyweight only', 'Dumbbells', 'Resistance bands', 'Full gym']
const LEVELS = ['Beginner', 'Intermediate', 'Advanced']

const CATEGORY_ICONS: Record<WorkoutCategory, string> = {
  running: '🏃', cycling: '🚴', swimming: '🏊', walking: '🚶',
  hiit: '⚡', strength: '🏋️', yoga: '🧘', other: '💪',
}

export function GymSessionModal({ dayLogId, userId, db, sortOrderStart, onClose, onWorkoutsAdded }: GymSessionModalProps) {
  const [phase, setPhase] = useState<Phase>('setup')
  const [goal, setGoal] = useState(GOALS[0])
  const [duration, setDuration] = useState(30)
  const [equipment, setEquipment] = useState(EQUIPMENT[2])
  const [level, setLevel] = useState(LEVELS[1])
  const [genError, setGenError] = useState<string | null>(null)

  const [exercises, setExercises] = useState<GymExercise[]>([])
  const [exIdx, setExIdx] = useState(0)
  const [setIdx, setSetIdx] = useState(0) // current set (0-based)
  const [resting, setResting] = useState(false)
  const [restLeft, setRestLeft] = useState(0)
  const restRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [saving, setSaving] = useState(false)

  // Body scroll lock
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  async function handleGenerate() {
    setGenError(null)
    setPhase('generating')
    try {
      const { data, error } = await db.functions.invoke('ai-gym-session', {
        body: { goal, duration_min: duration, equipment, fitnessLevel: level },
      })
      if (error) throw error
      const exs = (data as { exercises: GymExercise[] }).exercises ?? []
      if (!exs.length) throw new Error('No exercises generated. Try again.')
      setExercises(exs.map(e => ({
        ...e,
        category: (Object.keys(WORKOUT_CATEGORY_LABELS).includes(e.category) ? e.category : 'other') as WorkoutCategory,
      })))
      setExIdx(0)
      setSetIdx(0)
      setPhase('session')
    } catch (err: unknown) {
      setGenError(err instanceof Error ? err.message : 'Failed to generate workout')
      setPhase('setup')
    }
  }

  function startRest(sec: number) {
    setResting(true)
    setRestLeft(sec)
    restRef.current = setInterval(() => {
      setRestLeft(prev => {
        if (prev <= 1) {
          clearInterval(restRef.current!)
          setResting(false)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  function skipRest() {
    if (restRef.current) clearInterval(restRef.current)
    setResting(false)
    setRestLeft(0)
  }

  function handleSetDone() {
    const ex = exercises[exIdx]
    const nextSet = setIdx + 1

    if (nextSet < ex.sets) {
      // More sets in this exercise — start rest
      setSetIdx(nextSet)
      startRest(ex.rest_sec)
    } else {
      // Exercise done — move to next
      const nextEx = exIdx + 1
      if (nextEx < exercises.length) {
        setExIdx(nextEx)
        setSetIdx(0)
        startRest(30) // brief rest between exercises
      } else {
        // All done
        setPhase('done')
      }
    }
  }

  async function handleSaveAll() {
    setSaving(true)
    try {
      await Promise.all(exercises.map((ex, i) => {
        const durationMin = ex.duration_sec ? Math.ceil((ex.duration_sec * ex.sets) / 60) : null
        const kcal_burned = durationMin ? exerciseToKcal(ex.category, durationMin) : null
        return createWorkoutExercise(db, {
          day_log_id: dayLogId,
          user_id: userId,
          name: ex.name,
          category: ex.category,
          sets: ex.sets,
          reps: ex.reps ?? null,
          duration_min: durationMin,
          kcal_burned,
          sort_order: sortOrderStart + i,
        })
      }))
      onWorkoutsAdded()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const currentEx = exercises[exIdx]
  const totalSets = exercises.reduce((s, e) => s + e.sets, 0)
  const doneSets = exercises.slice(0, exIdx).reduce((s, e) => s + e.sets, 0) + setIdx
  const overallPct = totalSets > 0 ? Math.round((doneSets / totalSets) * 100) : 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
      onClick={onClose}
    >
      <div
        className="relative bg-white w-full max-w-sm rounded-t-2xl sm:rounded-2xl overflow-hidden animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 fade-in duration-200"
        style={{ maxHeight: '90vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-[#F3F4F6] text-muted-foreground hover:bg-muted transition-all"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {/* ── Setup ── */}
        {phase === 'setup' && (
          <div className="p-5 space-y-4">
            <h2 className="text-base font-bold text-foreground pr-8">Generate workout</h2>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Goal</label>
                <div className="flex flex-wrap gap-2">
                  {GOALS.map(g => (
                    <button key={g} type="button" onClick={() => setGoal(g)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${goal === g ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary hover:text-primary'}`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Duration</label>
                <div className="flex gap-2">
                  {DURATIONS.map(d => (
                    <button key={d} type="button" onClick={() => setDuration(d)}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all ${duration === d ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary hover:text-primary'}`}
                    >
                      {d}m
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Equipment</label>
                <div className="flex flex-wrap gap-2">
                  {EQUIPMENT.map(eq => (
                    <button key={eq} type="button" onClick={() => setEquipment(eq)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${equipment === eq ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary hover:text-primary'}`}
                    >
                      {eq}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Fitness level</label>
                <div className="flex gap-2">
                  {LEVELS.map(l => (
                    <button key={l} type="button" onClick={() => setLevel(l)}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all ${level === l ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary hover:text-primary'}`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {genError && <p className="text-sm text-destructive">{genError}</p>}

            <button
              onClick={handleGenerate}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 active:scale-[0.97] transition-all"
            >
              Generate workout ✨
            </button>
          </div>
        )}

        {/* ── Generating ── */}
        {phase === 'generating' && (
          <div className="flex flex-col items-center justify-center py-16 px-5 gap-4">
            <Spinner className="h-8 w-8 text-primary" />
            <p className="text-sm font-semibold text-foreground">Building your {duration}-min {goal.toLowerCase()} workout…</p>
          </div>
        )}

        {/* ── Session ── */}
        {phase === 'session' && currentEx && (
          <div className="p-5 space-y-4">
            {/* Overall progress */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Exercise {exIdx + 1} of {exercises.length}</span>
                <span>{overallPct}% complete</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden bg-secondary">
                <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${overallPct}%` }} />
              </div>
            </div>

            {/* Exercise card */}
            <div className="bg-secondary rounded-2xl p-4 text-center space-y-2">
              <div className="text-4xl">{CATEGORY_ICONS[currentEx.category]}</div>
              <h3 className="text-lg font-bold text-foreground">{currentEx.name}</h3>
              <p className="text-xs text-muted-foreground">{currentEx.muscles}</p>
              <div className="text-2xl font-bold text-primary">
                {currentEx.reps
                  ? `${currentEx.reps} reps`
                  : `${currentEx.duration_sec}s`}
              </div>
              <p className="text-xs font-medium text-foreground/70 bg-white rounded-xl px-3 py-2 text-left">
                💡 {currentEx.cue}
              </p>
            </div>

            {/* Set tracker */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 text-center">
                Set {setIdx + 1} of {currentEx.sets}
              </p>
              <div className="flex justify-center gap-2">
                {Array.from({ length: currentEx.sets }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-2 rounded-full flex-1 transition-all ${i < setIdx ? 'bg-primary' : i === setIdx ? 'bg-primary/40' : 'bg-[#E5E7EB]'}`}
                  />
                ))}
              </div>
            </div>

            {/* Rest timer */}
            {resting ? (
              <div className="text-center space-y-3">
                <div className="flex items-center justify-center gap-2 text-primary">
                  <Timer className="h-5 w-5" />
                  <span className="text-3xl font-bold tabular-nums">{restLeft}s</span>
                </div>
                <p className="text-xs text-muted-foreground">Rest time</p>
                <button
                  onClick={skipRest}
                  className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:text-foreground transition-all"
                >
                  Skip rest
                </button>
              </div>
            ) : (
              <button
                onClick={handleSetDone}
                className="w-full py-4 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 active:scale-[0.97] transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="h-5 w-5" />
                {setIdx + 1 < currentEx.sets
                  ? `Done set ${setIdx + 1} → Rest`
                  : exIdx + 1 < exercises.length
                    ? `Exercise done → Next`
                    : 'Finish workout!'}
              </button>
            )}

            {/* Exercise list preview */}
            <div className="space-y-1">
              {exercises.map((ex, i) => (
                <div key={i} className={`flex items-center gap-2 py-1.5 px-2 rounded-lg text-xs transition-all ${i === exIdx ? 'bg-secondary font-semibold text-foreground' : i < exIdx ? 'text-muted-foreground line-through' : 'text-muted-foreground'}`}>
                  {i < exIdx
                    ? <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                    : i === exIdx
                      ? <ChevronRight className="h-3.5 w-3.5 text-primary shrink-0" />
                      : <div className="h-3.5 w-3.5 shrink-0" />}
                  <span className="truncate">{ex.name}</span>
                  <span className="ml-auto shrink-0">{ex.sets}×{ex.reps ?? `${ex.duration_sec}s`}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Done ── */}
        {phase === 'done' && (
          <div className="p-5 space-y-4 text-center">
            <div className="text-6xl">🏆</div>
            <h2 className="text-xl font-bold text-foreground">Workout complete!</h2>
            <p className="text-sm text-muted-foreground">
              {exercises.length} exercises · {exercises.reduce((s, e) => s + e.sets, 0)} total sets
            </p>

            <div className="space-y-1.5 text-left py-1">
              {exercises.map((ex, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  <span className="font-medium">{ex.name}</span>
                  <span className="text-muted-foreground ml-auto">{ex.sets}×{ex.reps ?? `${ex.duration_sec}s`}</span>
                </div>
              ))}
            </div>

            <button
              onClick={handleSaveAll}
              disabled={saving}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 active:scale-[0.97] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <Spinner className="h-4 w-4" /> : null}
              {saving ? 'Saving…' : 'Save to workout log'}
            </button>
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground transition-all"
            >
              Discard
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
