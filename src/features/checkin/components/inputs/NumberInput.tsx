import { useState } from 'react'

interface NumberInputProps {
  value: number | null
  onBlurSave: (v: number | null) => void
  disabled?: boolean
  placeholder?: string
}

export function NumberInput({ value, onBlurSave, disabled, placeholder = '0' }: NumberInputProps) {
  const [local, setLocal] = useState(value?.toString() ?? '')

  return (
    <input
      type="number"
      value={local}
      onChange={e => setLocal(e.target.value)}
      onBlur={() => {
        const n = local === '' ? null : parseFloat(local)
        onBlurSave(isNaN(n as number) ? null : n)
      }}
      disabled={disabled}
      placeholder={placeholder}
      className="w-32 text-sm text-foreground bg-white border border-border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all placeholder:text-muted-foreground disabled:opacity-50"
    />
  )
}
