import { useEffect, useState, type FormEvent } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useRequiredSession } from '@/features/auth/SessionContext'
import { getProfile, upsertProfile, goalKcal } from '@/lib/api/profile'
import type { UserProfile } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Separator } from '@/components/ui/separator'

const GOALS = [
  { value: 'lose_0.25', label: 'Lose 0.25 kg/week (mild deficit)' },
  { value: 'lose_0.5',  label: 'Lose 0.5 kg/week (moderate deficit)' },
  { value: 'lose_0.75', label: 'Lose 0.75 kg/week (aggressive deficit)' },
  { value: 'maintain',  label: 'Maintain weight' },
  { value: 'gain_0.25', label: 'Gain 0.25 kg/week (lean bulk)' },
  { value: 'gain_0.5',  label: 'Gain 0.5 kg/week (bulk)' },
]
const PREFS = ['Vegetarian', 'Non-Vegetarian', 'Eggetarian', 'Vegan', 'Jain']
const ACTIVITY_LEVELS = [
  { value: 'sedentary', label: 'Sedentary (desk job, little exercise)' },
  { value: 'light', label: 'Light (1–3 days/week exercise)' },
  { value: 'moderate', label: 'Moderate (3–5 days/week exercise)' },
  { value: 'active', label: 'Active (6–7 days/week exercise)' },
  { value: 'very_active', label: 'Very active (physical job + exercise)' },
]

export default function NutritionSettingsPage() {
  const session = useRequiredSession()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [goal, setGoal] = useState('')
  const [dietPref, setDietPref] = useState('')
  const [allergies, setAllergies] = useState('')
  const [dislikes, setDislikes] = useState('')
  const [age, setAge] = useState('')
  const [weight, setWeight] = useState('')
  const [height, setHeight] = useState('')
  const [activity, setActivity] = useState('')

  useEffect(() => {
    getProfile(session.db, session.userId).then(p => {
      if (p) {
        setGoal(p.goal ?? '')
        setDietPref(p.dietary_preference ?? '')
        setAllergies(p.allergies?.join(', ') ?? '')
        setDislikes(p.disliked_foods?.join(', ') ?? '')
        setAge(p.age?.toString() ?? '')
        setWeight(p.weight_kg?.toString() ?? '')
        setHeight(p.height_cm?.toString() ?? '')
        setActivity(p.activity_level ?? '')
      }
    }).finally(() => setLoading(false))
  }, [])

  // Compute TDEE preview
  const tdeePreview = (() => {
    const a = parseInt(age), w = parseFloat(weight), h = parseFloat(height)
    if (!a || !w || !h) return null
    const bmr = 10 * w + 6.25 * h - 5 * a - 78
    const m: Record<string, number> = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 }
    const tdee = Math.round(bmr * (m[activity] ?? 1.55))
    return { tdee, kcalGoal: goalKcal(tdee, goal || null) }
  })()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const payload: Partial<UserProfile> & { user_id: string } = {
        user_id: session.userId,
        goal: goal || null,
        dietary_preference: dietPref || null,
        allergies: allergies ? allergies.split(',').map(s => s.trim()).filter(Boolean) : null,
        disliked_foods: dislikes ? dislikes.split(',').map(s => s.trim()).filter(Boolean) : null,
        age: age ? parseInt(age) : null,
        weight_kg: weight ? parseFloat(weight) : null,
        height_cm: height ? parseFloat(height) : null,
        activity_level: activity || null,
      }
      await upsertProfile(session.db, payload)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="h-8 w-8 shrink-0">
          <Link to="/nutrition"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <h1 className="text-xl font-semibold">Nutrition Profile</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Goals & Preferences</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Goal</Label>
              <Select value={goal} onValueChange={setGoal}>
                <SelectTrigger><SelectValue placeholder="Select goal…" /></SelectTrigger>
                <SelectContent>{GOALS.map(g => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Dietary preference</Label>
              <Select value={dietPref} onValueChange={setDietPref}>
                <SelectTrigger><SelectValue placeholder="Select preference…" /></SelectTrigger>
                <SelectContent>{PREFS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="allergies">Food allergies <span className="text-muted-foreground text-xs">(comma-separated)</span></Label>
              <Input id="allergies" value={allergies} onChange={e => setAllergies(e.target.value)} placeholder="e.g. peanuts, gluten" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dislikes">Disliked foods <span className="text-muted-foreground text-xs">(comma-separated)</span></Label>
              <Input id="dislikes" value={dislikes} onChange={e => setDislikes(e.target.value)} placeholder="e.g. mushrooms, olives" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Body & Activity</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="age">Age</Label>
                <Input id="age" type="number" min="10" max="120" value={age} onChange={e => setAge(e.target.value)} placeholder="yrs" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weight">Weight (kg)</Label>
                <Input id="weight" type="number" min="20" step="0.1" value={weight} onChange={e => setWeight(e.target.value)} placeholder="kg" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="height">Height (cm)</Label>
                <Input id="height" type="number" min="100" max="250" value={height} onChange={e => setHeight(e.target.value)} placeholder="cm" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Activity level</Label>
              <Select value={activity} onValueChange={setActivity}>
                <SelectTrigger><SelectValue placeholder="Select level…" /></SelectTrigger>
                <SelectContent>{ACTIVITY_LEVELS.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {tdeePreview && (
              <>
                <Separator />
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Estimated TDEE</p>
                    <p className="text-xl font-semibold">{tdeePreview.tdee} kcal</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Daily goal ({GOALS.find(g => g.value === goal)?.label ?? 'Maintain weight'})</p>
                    <p className="text-xl font-semibold">{tdeePreview.kcalGoal} kcal</p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" className="w-full" disabled={saving}>
          {saving ? <Spinner className="mr-2 h-4 w-4" /> : null}
          {saved ? 'Saved!' : 'Save profile'}
        </Button>
      </form>
    </div>
  )
}
