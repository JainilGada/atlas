import { useState } from 'react'
import { Textarea } from '@/components/ui/textarea'

interface LongTextInputProps {
  value: string | null
  onBlurSave: (v: string) => void
  disabled?: boolean
}

export function LongTextInput({ value, onBlurSave, disabled }: LongTextInputProps) {
  const [local, setLocal] = useState(value ?? '')

  return (
    <Textarea
      value={local}
      onChange={e => setLocal(e.target.value)}
      onBlur={() => onBlurSave(local)}
      disabled={disabled}
      rows={3}
      placeholder="Write here…"
      className="text-sm resize-none"
    />
  )
}
