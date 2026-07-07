interface YesNoInputProps {
  value: boolean | null
  onChange: (v: boolean) => void
  disabled?: boolean
}

export function YesNoInput({ value, onChange, disabled }: YesNoInputProps) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(true)}
        className={`px-4 py-1.5 rounded-lg text-sm font-semibold border transition-all duration-150 min-h-[36px] ${
          value === true
            ? 'bg-primary text-primary-foreground border-primary shadow-sm'
            : 'bg-transparent text-muted-foreground border-border hover:border-primary hover:text-primary'
        }`}
      >
        Yes
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(false)}
        className={`px-4 py-1.5 rounded-lg text-sm font-semibold border transition-all duration-150 min-h-[36px] ${
          value === false
            ? 'bg-destructive/10 text-destructive border-destructive'
            : 'bg-transparent text-muted-foreground border-border hover:border-destructive/50 hover:text-destructive'
        }`}
      >
        No
      </button>
    </div>
  )
}
