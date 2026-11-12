import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { GameConfig } from '../../types/game'
import { getAvailableLocations, validateConfig } from '../../utils/game'
import { CustomLocationsEditor, SettingsFields } from '../SettingsFields/SettingsFields'

type SetupScreenProps = {
  config: GameConfig
  onConfigChange: (config: GameConfig) => void
  onStart: () => void
}

export function SetupScreen({
  config,
  onConfigChange,
  onStart,
}: SetupScreenProps) {
  const [playersCountInput, setPlayersCountInput] = useState(
    String(config.playersCount),
  )
  const error = validateConfig(config)
  const locationsCount = useMemo(
    () => getAvailableLocations(config).length,
    [config],
  )

  function updateConfig(nextConfig: Partial<GameConfig>) {
    onConfigChange({ ...config, ...nextConfig })
  }

  function getSafePlayersCount(playersCount: number) {
    return Math.min(20, Math.max(3, playersCount))
  }

  function updatePlayersCount(playersCount: number) {
    const safePlayersCount = getSafePlayersCount(playersCount)
    const playerNames = Array.from({ length: safePlayersCount }, (_, index) => {
      return config.playerNames[index] || `Player ${index + 1}`
    })

    updateConfig({
      playersCount: safePlayersCount,
      spiesCount: Math.min(config.spiesCount, safePlayersCount - 1),
      playerNames,
    })
  }

  function handlePlayersCountChange(value: string) {
    setPlayersCountInput(value)

    if (!value) {
      return
    }

    const playersCount = Number(value)

    if (
      Number.isInteger(playersCount) &&
      playersCount >= 3 &&
      playersCount <= 20
    ) {
      updatePlayersCount(playersCount)
    }
  }

  function commitPlayersCountInput() {
    const playersCount = Number(playersCountInput)

    if (!Number.isInteger(playersCount)) {
      setPlayersCountInput(String(config.playersCount))
      return
    }

    const safePlayersCount = getSafePlayersCount(playersCount)
    setPlayersCountInput(String(safePlayersCount))
    updatePlayersCount(safePlayersCount)
  }

  function updatePlayerName(index: number, name: string) {
    const playerNames = [...config.playerNames]
    playerNames[index] = name
    updateConfig({ playerNames })
  }

  return (
    <main className="screen setup-screen">
      <section className="hero-panel">
        <Link to="/" className="back-link">
          ← Home
        </Link>
        <p className="eyebrow">Group game</p>
        <h1>Spy</h1>
        <p className="lede">
          Set up the round, pass the phone from player to player and let
          suspicion do the rest.
        </p>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Setup</p>
            <h2>Match settings</h2>
          </div>
          <span className="pill">{locationsCount} lugares</span>
        </div>

        <SettingsFields
          settings={config}
          playersCount={config.playersCount}
          onChange={updateConfig}
          leading={
            <label className="field">
              <span>Players</span>
              <input
                type="number"
                min="3"
                max="20"
                value={playersCountInput}
                onBlur={commitPlayersCountInput}
                onChange={(event) => handlePlayersCountChange(event.target.value)}
              />
            </label>
          }
        />

        {error ? <p className="error-message">{error}</p> : null}
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Opcional</p>
            <h2>Player names</h2>
          </div>
        </div>
        <div className="names-grid">
          {Array.from({ length: config.playersCount }, (_, index) => (
            <label className="field compact-field" key={index}>
              <span>Player {index + 1}</span>
              <input
                type="text"
                value={config.playerNames[index] ?? ''}
                onChange={(event) => updatePlayerName(index, event.target.value)}
              />
            </label>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Opcional</p>
            <h2>Custom locations</h2>
          </div>
        </div>
        <CustomLocationsEditor
          locations={config.customLocations}
          onChange={(customLocations) => updateConfig({ customLocations })}
        />
      </section>

      <button
        type="button"
        className="primary-button sticky-action"
        disabled={Boolean(error)}
        onClick={onStart}
      >
        Start game
      </button>
    </main>
  )
}
