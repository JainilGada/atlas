import { useState } from 'react'
import { Input } from '@/components/ui/input'

interface NumberInputProps {
  value: number | null
  onBlurSave: (v: number | null) => void
  disabled?: boolean
  placeholder?: string
}

export function NumberInput({ value, onBlurSave, disabled, placeholder = '0' }: NumberInputProps) {
  const [local, setLocal] = useState(value?.toString() ?? '')

  return (
    <Input
      type="number"
      value={local}
      onChange={e => setLocal(e.target.value)}
      onBlur={() => {
        const n = local === '' ? null : parseFloat(local)
        onBlurSave(isNaN(n as number) ? null : n)
      }}
      disabled={disabled}
      className="h-8 text-sm w-32"
      placeholder={placeholder}
    />
  )
}
