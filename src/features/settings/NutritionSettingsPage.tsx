import { useEffect, useState, type FormEvent } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useRequiredSession } from '@/features/auth/SessionContext'
import { getProfile, upsertProfile, goalKcal } from '@/lib/api/profile'
import type { UserProfile } from '@/lib/types'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'

// ── Conversion helpers ────────────────────────────────────────────────────────
const kgToLbs = (kg: number) => +(kg * 2.20462).toFixed(1)
const lbsToKg = (lbs: number) => +(lbs / 2.20462).toFixed(2)
const cmToFt  = (cm: number) => Math.floor(cm / 30.48)
const cmToIn  = (cm: number) => Math.round((cm % 30.48) / 2.54)
const ftInToCm = (ft: number, inches: number) => +(ft * 30.48 + inches * 2.54).toFixed(1)

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
  { value: 'sedentary',   label: 'Sedentary' },
  { value: 'light',       label: 'Light (1–3×/week)' },
  { value: 'moderate',    label: 'Moderate (3–5×/week)' },
  { value: 'active',      label: 'Active (6–7×/week)' },
  { value: 'very_active', label: 'Very active' },
]

// ── Small reusable UI pieces ──────────────────────────────────────────────────
function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-xs font-medium text-muted-foreground block mb-1.5">{children}</label>
}

function TextInput({
  value, onChange, placeholder, type = 'text', min, max, step, className = '',
}: {
  value: string; onChange: (v: string) => void
  placeholder?: string; type?: string; min?: string; max?: string; step?: string; className?: string
}) {
  return (
    <input
      type={type} min={min} max={max} step={step} value={value}
      onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className={`w-full h-10 rounded-xl border border-border bg-white px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all ${className}`}
    />
  )
}

function UnitToggle({
  options, value, onChange,
}: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex bg-muted rounded-lg p-0.5 gap-0.5 shrink-0">
      {options.map(opt => (
        <button
          key={opt} type="button" onClick={() => onChange(opt)}
          className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
            value === opt ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl p-4 space-y-4" style={{ border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {children}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function NutritionSettingsPage() {
  const session = useRequiredSession()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [goal, setGoal]       = useState('')
  const [dietPref, setDietPref] = useState('')
  const [allergies, setAllergies] = useState('')
  const [dislikes, setDislikes]   = useState('')
  const [age, setAge]             = useState('')
  const [activity, setActivity]   = useState('')

  // Weight: always keep internal value in kg
  const [weightKg, setWeightKg] = useState('')   // raw kg string (what gets saved)
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg')
  const [weightDisplay, setWeightDisplay] = useState('') // what user sees/edits

  // Height: always keep internal value in cm
  const [heightCm, setHeightCm] = useState('')   // raw cm string (what gets saved)
  const [heightUnit, setHeightUnit] = useState<'cm' | 'ft'>('cm')
  const [heightDisplayCm, setHeightDisplayCm] = useState('')
  const [heightFt, setHeightFt] = useState('')
  const [heightIn, setHeightIn] = useState('')

  // ── Load profile ────────────────────────────────────────────────────────────
  useEffect(() => {
    getProfile(session.db, session.userId).then(p => {
      if (p) {
        setGoal(p.goal ?? '')
        setDietPref(p.dietary_preference ?? '')
        setAllergies(p.allergies?.join(', ') ?? '')
        setDislikes(p.disliked_foods?.join(', ') ?? '')
        setAge(p.age?.toString() ?? '')
        setActivity(p.activity_level ?? '')

        const kg = p.weight_kg
        const cm = p.height_cm
        if (kg != null) { setWeightKg(kg.toString()); setWeightDisplay(kg.toString()) }
        if (cm != null) {
          setHeightCm(cm.toString())
          setHeightDisplayCm(cm.toString())
          setHeightFt(cmToFt(cm).toString())
          setHeightIn(cmToIn(cm).toString())
        }
      }
    }).finally(() => setLoading(false))
  }, [])

  // ── Unit toggle handlers ─────────────────────────────────────────────────────
  function handleWeightUnitChange(unit: string) {
    const u = unit as 'kg' | 'lbs'
    const kg = parseFloat(weightKg)
    if (!isNaN(kg) && kg > 0) {
      setWeightDisplay(u === 'lbs' ? kgToLbs(kg).toString() : kg.toString())
    }
    setWeightUnit(u)
  }

  function handleWeightDisplayChange(val: string) {
    setWeightDisplay(val)
    const n = parseFloat(val)
    if (!isNaN(n) && n > 0) {
      setWeightKg(weightUnit === 'lbs' ? lbsToKg(n).toString() : val)
    }
  }

  function handleHeightUnitChange(unit: string) {
    const u = unit as 'cm' | 'ft'
    const cm = parseFloat(heightCm)
    if (!isNaN(cm) && cm > 0) {
      setHeightDisplayCm(cm.toString())
      setHeightFt(cmToFt(cm).toString())
      setHeightIn(cmToIn(cm).toString())
    }
    setHeightUnit(u)
  }

  function handleFtChange(ft: string) {
    setHeightFt(ft)
    const f = parseInt(ft) || 0
    const i = parseInt(heightIn) || 0
    const cm = ftInToCm(f, i)
    setHeightCm(cm.toString())
  }

  function handleInChange(inches: string) {
    setHeightIn(inches)
    const f = parseInt(heightFt) || 0
    const i = parseInt(inches) || 0
    const cm = ftInToCm(f, i)
    setHeightCm(cm.toString())
  }

  function handleHeightCmChange(val: string) {
    setHeightDisplayCm(val)
    setHeightCm(val)
    const cm = parseFloat(val)
    if (!isNaN(cm) && cm > 0) {
      setHeightFt(cmToFt(cm).toString())
      setHeightIn(cmToIn(cm).toString())
    }
  }

  // ── TDEE preview (always in metric) ─────────────────────────────────────────
  const tdeePreview = (() => {
    const a = parseInt(age)
    const w = parseFloat(weightKg)
    const h = parseFloat(heightCm)
    if (!a || !w || !h) return null
    const bmr = 10 * w + 6.25 * h - 5 * a - 78
    const mult: Record<string, number> = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 }
    const tdee = Math.round(bmr * (mult[activity] ?? 1.55))
    return { tdee, kcalGoal: goalKcal(tdee, goal || null) }
  })()

  // ── Save ─────────────────────────────────────────────────────────────────────
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
        weight_kg: weightKg ? parseFloat(weightKg) : null,
        height_cm: heightCm ? parseFloat(heightCm) : null,
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
        {/* ── Goals & Preferences ── */}
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

        {/* ── Body & Activity ── */}
        <Section title="Body & Activity">
          <div className="space-y-3">
            <div>
              <FieldLabel>Age</FieldLabel>
              <TextInput type="number" min="10" max="120" value={age} onChange={setAge} placeholder="years" />
            </div>

            {/* Weight with unit toggle */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <FieldLabel>Weight</FieldLabel>
                <UnitToggle options={['kg', 'lbs']} value={weightUnit} onChange={handleWeightUnitChange} />
              </div>
              <TextInput
                type="number" min="20" step="0.1"
                value={weightDisplay}
                onChange={handleWeightDisplayChange}
                placeholder={weightUnit === 'kg' ? '70' : '154'}
              />
              {weightUnit === 'lbs' && weightKg && (
                <p className="text-[11px] text-muted-foreground mt-1">{parseFloat(weightKg).toFixed(1)} kg stored</p>
              )}
            </div>

            {/* Height with unit toggle */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <FieldLabel>Height</FieldLabel>
                <UnitToggle options={['cm', 'ft']} value={heightUnit} onChange={handleHeightUnitChange} />
              </div>
              {heightUnit === 'cm' ? (
                <TextInput
                  type="number" min="100" max="250"
                  value={heightDisplayCm}
                  onChange={handleHeightCmChange}
                  placeholder="175"
                />
              ) : (
                <div className="flex gap-2">
                  <div className="flex-1">
                    <TextInput
                      type="number" min="3" max="8"
                      value={heightFt} onChange={handleFtChange}
                      placeholder="5"
                    />
                    <p className="text-[11px] text-muted-foreground mt-1 text-center">ft</p>
                  </div>
                  <div className="flex-1">
                    <TextInput
                      type="number" min="0" max="11"
                      value={heightIn} onChange={handleInChange}
                      placeholder="10"
                    />
                    <p className="text-[11px] text-muted-foreground mt-1 text-center">in</p>
                  </div>
                </div>
              )}
              {heightUnit === 'ft' && heightCm && (
                <p className="text-[11px] text-muted-foreground mt-1">{parseFloat(heightCm).toFixed(1)} cm stored</p>
              )}
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
          type="submit" disabled={saving}
          className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-sm hover:opacity-90 active:scale-[0.97] transition-all disabled:opacity-50 min-h-[44px]"
        >
          {saving && <Spinner className="h-4 w-4" />}
          {saved ? '✓ Saved!' : 'Save profile'}
        </button>
      </form>
    </div>
  )
}
