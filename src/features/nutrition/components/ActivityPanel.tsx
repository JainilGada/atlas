import { useState, useEffect } from 'react'
import { Footprints, Droplets, Dumbbell } from 'lucide-react'
import { updateDayLog, stepsToKcal, strengthToKcal } from '@/lib/api/nutrition'
import type { DayLog } from '@/lib/types'
import type { SupabaseClient } from '@/lib/supabase'

interface ActivityPanelProps {
  dayLog: DayLog
  db: SupabaseClient
  onBurnedChange: (burned: number) => void
}

function ActivityInput({
  value,
  onChange,
  onBlur,
  placeholder,
  step,
}: {
  value: string
  onChange: (v: string) => void
  onBlur: () => void
  placeholder: string
  step?: string
}) {
  return (
    <input
      type="number"
      min="0"
      step={step}
      value={value}
      onChange={e => onChange(e.target.value)}
      onBlur={onBlur}
      placeholder={placeholder}
      className="w-full h-10 rounded-lg border border-border bg-white px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
    />
  )
}

export function ActivityPanel({ dayLog, db, onBurnedChange }: ActivityPanelProps) {
  const [steps, setSteps] = useState(dayLog.steps?.toString() ?? '')
  const [water, setWater] = useState(dayLog.water_litres?.toString() ?? '')
  const [duration, setDuration] = useState(dayLog.strength_duration_min?.toString() ?? '')
  const [intensity, setIntensity] = useState(dayLog.strength_intensity ?? '')

  const stepsKcal = stepsToKcal(parseInt(steps) || 0)
  const strengthKcal = duration && intensity ? strengthToKcal(parseInt(duration) || 0, intensity) : 0
  const totalBurned = stepsKcal + strengthKcal

  useEffect(() => {
    onBurnedChange(totalBurned)
  }, [steps, duration, intensity])

  async function save(patch: Partial<DayLog>) {
    const s = parseInt(steps) || 0
    const d = parseInt(duration) || 0
    const burned = stepsToKcal(s) + (d && intensity ? strengthToKcal(d, intensity) : 0)
    await updateDayLog(db, dayLog.id, { ...patch, burned_kcal: burned })
  }

  return (
    <div
      className="bg-white rounded-xl p-4"
      style={{ border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold text-foreground">Activity</p>
        {totalBurned > 0 && (
          <span className="text-xs font-medium text-primary bg-secondary px-2.5 py-1 rounded-full">
            −{totalBurned} kcal burned
          </span>
        )}
      </div>

      <div className="space-y-3">
        {/* Steps + Water row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Footprints className="h-3.5 w-3.5" /> Steps
            </label>
            <ActivityInput
              value={steps}
              onChange={setSteps}
              onBlur={() => save({ steps: parseInt(steps) || null })}
              placeholder="0"
            />
            {stepsKcal > 0 && (
              <p className="text-[11px] text-muted-foreground">≈ {stepsKcal} kcal</p>
            )}
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Droplets className="h-3.5 w-3.5 text-blue-500" /> Water (L)
            </label>
            <ActivityInput
              value={water}
              onChange={setWater}
              onBlur={() => save({ water_litres: parseFloat(water) || null })}
              placeholder="0.0"
              step="0.1"
            />
          </div>
        </div>

        {/* Strength row */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Dumbbell className="h-3.5 w-3.5" /> Strength training
          </label>
          <div className="flex gap-2">
            <div className="w-24 shrink-0">
              <ActivityInput
                value={duration}
                onChange={setDuration}
                onBlur={() => save({ strength_duration_min: parseInt(duration) || null, strength_intensity: intensity || null })}
                placeholder="min"
              />
            </div>
            <select
              value={intensity}
              onChange={e => { setIntensity(e.target.value); save({ strength_intensity: e.target.value || null, strength_duration_min: parseInt(duration) || null }) }}
              className="flex-1 h-10 rounded-lg border border-border bg-white px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            >
              <option value="">Intensity…</option>
              <option value="light">Light</option>
              <option value="moderate">Moderate</option>
              <option value="heavy">Heavy</option>
            </select>
          </div>
          {strengthKcal > 0 && (
            <p className="text-[11px] text-muted-foreground">≈ {strengthKcal} kcal</p>
          )}
        </div>
      </div>
    </div>
  )
}
