import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit challenge' : 'New challenge'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ch-name">Name *</Label>
            <Input
              id="ch-name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. 75 Hard"
              required
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ch-desc">Description</Label>
            <Textarea
              id="ch-desc"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Optional notes…"
              rows={2}
              disabled={loading}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="ch-date">Start date</Label>
              <Input
                id="ch-date"
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ch-dur">Duration (days)</Label>
              <Input
                id="ch-dur"
                type="number"
                min="1"
                value={durationDays}
                onChange={e => setDurationDays(e.target.value)}
                placeholder="e.g. 75"
                disabled={loading}
              />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading && <Spinner className="mr-2 h-4 w-4" />}
              {initial ? 'Save changes' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
