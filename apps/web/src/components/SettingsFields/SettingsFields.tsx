import { useState } from 'react'
import type { ReactNode } from 'react'
import type { Location, RoundSettings } from '@spy-game/game-core'
import { NumberField } from '../NumberField/NumberField'

const TIME_OPTIONS = [3, 5, 8, 10, 15]

type SettingsFieldsProps = {
  settings: RoundSettings
  /** Players in the match; spies must be fewer than this. */
  playersCount: number
  onChange: (changes: Partial<RoundSettings>) => void
  /** Extra fields rendered first inside the form grid (the local mode puts the player count here). */
  leading?: ReactNode
  disabled?: boolean
}

export function SettingsFields({
  settings,
  playersCount,
  onChange,
  leading,
  disabled,
}: SettingsFieldsProps) {
  return (
    <>
      <div className="form-grid">
        {leading}
        <NumberField
          label="Spies"
          value={settings.spiesCount}
          min={1}
          max={Math.max(1, playersCount - 1)}
          disabled={disabled}
          onCommit={(spiesCount) => onChange({ spiesCount })}
        />
        <NumberField
          label="Time in minutes"
          value={settings.durationInMinutes}
          min={1}
          max={60}
          disabled={disabled}
          onCommit={(durationInMinutes) => onChange({ durationInMinutes })}
        />
        <label className="toggle-field">
          <input
            type="checkbox"
            checked={settings.spyGetsHint}
            disabled={disabled}
            onChange={(event) => onChange({ spyGetsHint: event.target.checked })}
          />
          <span>Does the spy get a hint?</span>
        </label>
      </div>

      <div className="segmented-control" aria-label="Suggested times">
        {TIME_OPTIONS.map((minutes) => (
          <button
            type="button"
            className={minutes === settings.durationInMinutes ? 'active' : ''}
            disabled={disabled}
            onClick={() => onChange({ durationInMinutes: minutes })}
            key={minutes}
          >
            {minutes} min
          </button>
        ))}
      </div>
    </>
  )
}

type CustomLocationsProps = {
  locations: Location[]
  onChange: (locations: Location[]) => void
  disabled?: boolean
}

export function CustomLocationsEditor({ locations, onChange, disabled }: CustomLocationsProps) {
  const [draft, setDraft] = useState<Location>({ name: '', hint: '' })

  function add() {
    const name = draft.name.trim()
    const hint = draft.hint.trim()

    if (!name || !hint) {
      return
    }

    onChange([...locations, { name, hint }])
    setDraft({ name: '', hint: '' })
  }

  return (
    <>
      <div className="custom-location-form">
        <label className="field">
          <span>Location</span>
          <input
            type="text"
            maxLength={40}
            disabled={disabled}
            value={draft.name}
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
            placeholder="E.g. Coffee shop"
          />
        </label>
        <label className="field">
          <span>Hint</span>
          <input
            type="text"
            maxLength={120}
            disabled={disabled}
            value={draft.hint}
            onChange={(event) => setDraft({ ...draft, hint: event.target.value })}
            placeholder="E.g. a place with a counter, cups and the smell of coffee"
          />
        </label>
        <button type="button" className="secondary-button" disabled={disabled} onClick={add}>
          Add
        </button>
      </div>

      {locations.length > 0 ? (
        <div className="chips-list">
          {locations.map((location) => (
            <button
              type="button"
              className="chip"
              disabled={disabled}
              onClick={() => onChange(locations.filter((item) => item.name !== location.name))}
              key={location.name}
            >
              {location.name} remove
            </button>
          ))}
        </div>
      ) : null}
    </>
  )
}
