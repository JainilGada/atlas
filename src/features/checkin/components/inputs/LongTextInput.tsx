import { useState } from 'react'

interface LongTextInputProps {
  value: string | null
  onBlurSave: (v: string) => void
  disabled?: boolean
}

export function LongTextInput({ value, onBlurSave, disabled }: LongTextInputProps) {
  const [local, setLocal] = useState(value ?? '')

  return (
    <textarea
      value={local}
      onChange={e => setLocal(e.target.value)}
      onBlur={() => onBlurSave(local)}
      disabled={disabled}
      rows={3}
      placeholder="Write here…"
      className="w-full text-sm text-foreground bg-white border border-border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all placeholder:text-muted-foreground disabled:opacity-50 resize-none"
    />
  )
}
