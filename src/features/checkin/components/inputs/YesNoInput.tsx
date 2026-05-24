import { Switch } from '@/components/ui/switch'

interface YesNoInputProps {
  value: boolean | null
  onChange: (v: boolean) => void
  disabled?: boolean
}

export function YesNoInput({ value, onChange, disabled }: YesNoInputProps) {
  return (
    <Switch
      checked={value === true}
      onCheckedChange={onChange}
      disabled={disabled}
      aria-label="Yes / No"
    />
  )
}
