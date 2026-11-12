import { useState } from 'react'

type NumberFieldProps = {
  label: string
  value: number
  min: number
  max: number
  onCommit: (value: number) => void
  disabled?: boolean
}

/**
 * Number input that keeps what the person is typing and only reports whole numbers inside
 * [min, max]. On blur it snaps back to the real value.
 */
export function NumberField({ label, value, min, max, onCommit, disabled }: NumberFieldProps) {
  const [draft, setDraft] = useState<string | null>(null)

  function handleChange(text: string) {
    setDraft(text)
    const next = Number(text)

    if (text.trim() !== '' && Number.isInteger(next) && next >= min && next <= max) {
      onCommit(next)
    }
  }

  return (
    <label className="field">
      <span>{label}</span>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        disabled={disabled}
        value={draft ?? String(value)}
        onChange={(event) => handleChange(event.target.value)}
        onBlur={() => setDraft(null)}
      />
    </label>
  )
}
