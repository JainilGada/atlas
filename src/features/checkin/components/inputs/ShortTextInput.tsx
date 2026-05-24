import { useState } from 'react'
import { Input } from '@/components/ui/input'

interface ShortTextInputProps {
  value: string | null
  onBlurSave: (v: string) => void
  disabled?: boolean
}

export function ShortTextInput({ value, onBlurSave, disabled }: ShortTextInputProps) {
  const [local, setLocal] = useState(value ?? '')

  return (
    <Input
      value={local}
      onChange={e => setLocal(e.target.value)}
      onBlur={() => onBlurSave(local)}
      disabled={disabled}
      className="h-8 text-sm"
      placeholder="Type here…"
    />
  )
}
