import { useEffect, useState, type FormEvent } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useRequiredSession } from '@/features/auth/SessionContext'
import { getProfile, upsertProfile, goalKcal } from '@/lib/api/profile'
import type { UserProfile } from '@/lib/types'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'

const GOALS = [
  { value: 'lose_0.25', label: 'Lose 0.25 kg/week' },
  { value: 'lose_0.5',  label: 'Lose 0.5 kg/week' },
  { value: 'lose_0.75', label: 'Lose 0.75 kg/week' },
  { value: 'maintain',  label: 'Maintain weight' },
  { value: 'gain_0.25', label: 'Gain 0.25 kg/week' },
  { value: 'gain_0.5',  label: 'Gain 0.5 kg/week' },
]
const PREFS = ['Vegetarian', 'Non-Vegetarian', 'Eggetarian', 'Vegan', 'Jain']
const ACTIVITY_LEVELS = [
  { value: 'sedentary', label: 'Sedentary' },
  { value: 'light', label: 'Light (1–3×/week)' },
  { value: 'moderate', label: 'Moderate (3–5×/week)' },
  { value: 'active', label: 'Active (6–7×/week)' },
  { value: 'very_active', label: 'Very active' },
]

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-xs font-medium text-muted-foreground block mb-1.5">{children}</label>
}

function TextInput({
  id, value, onChange, placeholder, type = 'text', min, max, step,
}: {
  id?: string; value: string; onChange: (v: string) => void
  placeholder?: string; type?: string; min?: string; max?: string; step?: string
}) {
  return (
    <input
      id={id}
      type={type}
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full h-10 rounded-xl border border-border bg-white px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
    />
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="bg-white rounded-xl p-4 space-y-4"
      style={{ border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
    >
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {children}
    </div>
  )
}

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
    <div className="max-w-lg mx-auto px-4 pt-5 pb-6 space-y-4">
      {/* Back header */}
      <div className="flex items-center gap-3">
        <Link
          to="/challenges"
          className="w-9 h-9 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <p className="text-sm font-semibold text-foreground">Profile & Goals</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Section title="Goals & Preferences">
          <div className="space-y-3">
            <div>
              <FieldLabel>Goal</FieldLabel>
              <Select value={goal} onValueChange={setGoal}>
                <SelectTrigger><SelectValue placeholder="Select goal…" /></SelectTrigger>
                <SelectContent>{GOALS.map(g => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <FieldLabel>Dietary preference</FieldLabel>
              <Select value={dietPref} onValueChange={setDietPref}>
                <SelectTrigger><SelectValue placeholder="Select preference…" /></SelectTrigger>
                <SelectContent>{PREFS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <FieldLabel>Food allergies <span className="font-normal">(comma-separated)</span></FieldLabel>
              <TextInput value={allergies} onChange={setAllergies} placeholder="e.g. peanuts, gluten" />
            </div>
            <div>
              <FieldLabel>Disliked foods <span className="font-normal">(comma-separated)</span></FieldLabel>
              <TextInput value={dislikes} onChange={setDislikes} placeholder="e.g. mushrooms, olives" />
            </div>
          </div>
        </Section>

        <Section title="Body & Activity">
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <FieldLabel>Age</FieldLabel>
                <TextInput type="number" min="10" max="120" value={age} onChange={setAge} placeholder="yrs" />
              </div>
              <div>
                <FieldLabel>Weight (kg)</FieldLabel>
                <TextInput type="number" min="20" step="0.1" value={weight} onChange={setWeight} placeholder="kg" />
              </div>
              <div>
                <FieldLabel>Height (cm)</FieldLabel>
                <TextInput type="number" min="100" max="250" value={height} onChange={setHeight} placeholder="cm" />
              </div>
            </div>
            <div>
              <FieldLabel>Activity level</FieldLabel>
              <Select value={activity} onValueChange={setActivity}>
                <SelectTrigger><SelectValue placeholder="Select level…" /></SelectTrigger>
                <SelectContent>
                  {ACTIVITY_LEVELS.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {tdeePreview && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="bg-[#F7F7FB] rounded-xl p-3 text-center">
                  <p className="text-[10px] font-medium text-muted-foreground mb-1">Est. TDEE</p>
                  <p className="text-xl font-bold text-foreground">{tdeePreview.tdee}</p>
                  <p className="text-[10px] text-muted-foreground">kcal/day</p>
                </div>
                <div className="bg-secondary rounded-xl p-3 text-center">
                  <p className="text-[10px] font-medium text-primary/70 mb-1">Daily Goal</p>
                  <p className="text-xl font-bold text-primary">{tdeePreview.kcalGoal}</p>
                  <p className="text-[10px] text-primary/60">kcal/day</p>
                </div>
              </div>
            )}
          </div>
        </Section>

        {error && <p className="text-sm text-destructive px-1">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-sm hover:opacity-90 active:scale-[0.97] transition-all disabled:opacity-50 min-h-[44px]"
        >
          {saving && <Spinner className="h-4 w-4" />}
          {saved ? '✓ Saved!' : 'Save profile'}
        </button>
      </form>
    </div>
  )
}
