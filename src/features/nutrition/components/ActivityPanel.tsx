import { useState, useEffect } from 'react'
import { Footprints, Droplets, Dumbbell } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { updateDayLog, stepsToKcal, strengthToKcal } from '@/lib/api/nutrition'
import type { DayLog } from '@/lib/types'
import type { SupabaseClient } from '@/lib/supabase'

interface ActivityPanelProps {
  dayLog: DayLog
  db: SupabaseClient
  onBurnedChange: (burned: number) => void
}

export function ActivityPanel({ dayLog, db, onBurnedChange }: ActivityPanelProps) {
  const [steps, setSteps] = useState(dayLog.steps?.toString() ?? '')
  const [water, setWater] = useState(dayLog.water_litres?.toString() ?? '')
  const [duration, setDuration] = useState(dayLog.strength_duration_min?.toString() ?? '')
  const [intensity, setIntensity] = useState(dayLog.strength_intensity ?? '')

  // Recompute burned when activity changes
  useEffect(() => {
    const s = parseInt(steps) || 0
    const d = parseInt(duration) || 0
    const burned = stepsToKcal(s) + (d && intensity ? strengthToKcal(d, intensity) : 0)
    onBurnedChange(burned)
  }, [steps, duration, intensity])

  async function save(patch: Partial<DayLog>) {
    const s = parseInt(steps) || 0
    const d = parseInt(duration) || 0
    const burned = stepsToKcal(s) + (d && intensity ? strengthToKcal(d, intensity) : 0)
    await updateDayLog(db, dayLog.id, { ...patch, burned_kcal: burned })
  }

  return (
    <Card>
      <CardHeader className="pb-3 px-4 pt-4">
        <CardTitle className="text-sm font-medium">Activity</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="steps" className="text-xs flex items-center gap-1.5">
              <Footprints className="h-3.5 w-3.5" /> Steps
            </Label>
            <Input
              id="steps"
              type="number"
              min="0"
              value={steps}
              onChange={e => setSteps(e.target.value)}
              onBlur={() => save({ steps: parseInt(steps) || null })}
              className="h-8 text-sm"
              placeholder="0"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="water" className="text-xs flex items-center gap-1.5">
              <Droplets className="h-3.5 w-3.5" /> Water (L)
            </Label>
            <Input
              id="water"
              type="number"
              min="0"
              step="0.1"
              value={water}
              onChange={e => setWater(e.target.value)}
              onBlur={() => save({ water_litres: parseFloat(water) || null })}
              className="h-8 text-sm"
              placeholder="0.0"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs flex items-center gap-1.5">
            <Dumbbell className="h-3.5 w-3.5" /> Strength training
          </Label>
          <div className="flex gap-2">
            <Input
              type="number"
              min="0"
              value={duration}
              onChange={e => setDuration(e.target.value)}
              onBlur={() => save({ strength_duration_min: parseInt(duration) || null, strength_intensity: intensity || null })}
              className="h-8 text-sm w-20"
              placeholder="min"
            />
            <Select value={intensity} onValueChange={v => { setIntensity(v); save({ strength_intensity: v }) }}>
              <SelectTrigger className="h-8 text-sm flex-1">
                <SelectValue placeholder="Intensity…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="moderate">Moderate</SelectItem>
                <SelectItem value="heavy">Heavy</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
