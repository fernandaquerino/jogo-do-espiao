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
      return config.playerNames[index] || `Jogador ${index + 1}`
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
          ← Início
        </Link>
        <p className="eyebrow">Jogo em grupo</p>
        <h1>Espião</h1>
        <p className="lede">
          Configure a rodada, entregue o celular de jogador em jogador e deixe a
          suspeita fazer o resto.
        </p>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Preparação</p>
            <h2>Configuração da partida</h2>
          </div>
          <span className="pill">{locationsCount} lugares</span>
        </div>

        <SettingsFields
          settings={config}
          playersCount={config.playersCount}
          onChange={updateConfig}
          leading={
            <label className="field">
              <span>Jogadores</span>
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
            <h2>Nomes dos jogadores</h2>
          </div>
        </div>
        <div className="names-grid">
          {Array.from({ length: config.playersCount }, (_, index) => (
            <label className="field compact-field" key={index}>
              <span>Jogador {index + 1}</span>
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
            <h2>Lugares customizados</h2>
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
        Iniciar jogo
      </button>
    </main>
  )
}
