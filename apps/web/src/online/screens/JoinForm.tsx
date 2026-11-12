import { useState } from 'react'
import { MAX_NICKNAME_LENGTH } from '@spy-game/game-core'
import { loadNickname, saveNickname } from '../nickname'

type JoinFormProps = {
  title: string
  submitLabel: string
  disabled: boolean
  error: string | null
  /** When set, the room code is fixed (opened from a link). */
  fixedCode?: string
  onSubmit: (nickname: string, roomCode: string) => void
}

export function JoinForm({ title, submitLabel, disabled, error, fixedCode, onSubmit }: JoinFormProps) {
  const [nickname, setNickname] = useState(loadNickname)
  const [code, setCode] = useState(fixedCode ?? '')
  const needsCode = fixedCode !== undefined
  const ready = nickname.trim().length > 0 && (!needsCode || code.trim().length > 0)

  return (
    <form
      className="panel"
      onSubmit={(event) => {
        event.preventDefault()
        if (ready) {
          saveNickname(nickname.trim())
          onSubmit(nickname.trim(), code.trim().toUpperCase())
        }
      }}
    >
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Online</p>
          <h2>{title}</h2>
        </div>
      </div>

      <div className="form-grid">
        <label className="field">
          <span>Your nickname</span>
          <input
            type="text"
            autoComplete="nickname"
            maxLength={MAX_NICKNAME_LENGTH}
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
          />
        </label>
        {!needsCode ? null : (
          <label className="field">
            <span>Room code</span>
            <input
              type="text"
              autoCapitalize="characters"
              autoComplete="off"
              maxLength={6}
              value={code}
              disabled={Boolean(fixedCode)}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
            />
          </label>
        )}
      </div>

      {error ? (
        <p className="error-message" role="alert">
          {error}
        </p>
      ) : null}

      <button type="submit" className="primary-button" disabled={disabled || !ready}>
        {submitLabel}
      </button>
    </form>
  )
}
