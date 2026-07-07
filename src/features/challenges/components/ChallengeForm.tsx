import { useState, useEffect, type FormEvent } from 'react'
import { X } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import type { Challenge } from '@/lib/types'

interface ChallengeFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial?: Challenge
  onSubmit: (data: {
    name: string
    description?: string
    start_date?: string
    duration_days?: number
  }) => Promise<void>
}

export function ChallengeForm({ open, onOpenChange, initial, onSubmit }: ChallengeFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [startDate, setStartDate] = useState(initial?.start_date ?? '')
  const [durationDays, setDurationDays] = useState(initial?.duration_days?.toString() ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Sync fields when initial changes (edit mode)
  useEffect(() => {
    setName(initial?.name ?? '')
    setDescription(initial?.description ?? '')
    setStartDate(initial?.start_date ?? '')
    setDurationDays(initial?.duration_days?.toString() ?? '')
    setError(null)
  }, [initial, open])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || undefined,
        start_date: startDate || undefined,
        duration_days: durationDays ? parseInt(durationDays) : undefined,
      })
      onOpenChange(false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-6"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
      onClick={() => onOpenChange(false)}
    >
      <div
        className="bg-white w-full max-w-md rounded-2xl shadow-2xl animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 fade-in duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#F3F4F6]">
          <h2 className="text-base font-bold text-foreground">
            {initial ? 'Edit challenge' : 'New challenge'}
          </h2>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="w-8 h-8 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="ch-name">
              Name *
            </label>
            <input
              id="ch-name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. 75 Hard"
              required
              disabled={loading}
              className="w-full h-10 rounded-xl border border-border bg-white px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all disabled:opacity-50"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="ch-desc">
              Description
            </label>
            <textarea
              id="ch-desc"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Optional notes…"
              rows={2}
              disabled={loading}
              className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all disabled:opacity-50 resize-none"
            />
          </div>

          {/* Start date + Duration */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="ch-date">
                Start date
              </label>
              <input
                id="ch-date"
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                disabled={loading}
                className="w-full h-10 rounded-xl border border-border bg-white px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all disabled:opacity-50"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="ch-dur">
                Duration (days)
              </label>
              <input
                id="ch-dur"
                type="number"
                min="1"
                value={durationDays}
                onChange={e => setDurationDays(e.target.value)}
                placeholder="e.g. 75"
                disabled={loading}
                className="w-full h-10 rounded-xl border border-border bg-white px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all disabled:opacity-50"
              />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          {/* Footer */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-foreground transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 active:scale-[0.97] transition-all disabled:opacity-50"
            >
              {loading && <Spinner className="h-4 w-4" />}
              {initial ? 'Save changes' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
