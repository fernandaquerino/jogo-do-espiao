import { useMemo, useState } from 'react'
import type { GameConfig, Location } from '../../types/game'
import { getAvailableLocations, validateConfig } from '../../utils/game'

type SetupScreenProps = {
  config: GameConfig
  onConfigChange: (config: GameConfig) => void
  onStart: () => void
}

const TIME_OPTIONS = [3, 5, 8, 10, 15]

export function SetupScreen({
  config,
  onConfigChange,
  onStart,
}: SetupScreenProps) {
  const [customLocation, setCustomLocation] = useState<Location>({
    name: '',
    hint: '',
  })
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

  function addCustomLocation() {
    const name = customLocation.name.trim()
    const hint = customLocation.hint.trim()

    if (!name || !hint) {
      return
    }

    updateConfig({
      customLocations: [...config.customLocations, { name, hint }],
    })
    setCustomLocation({ name: '', hint: '' })
  }

  function removeCustomLocation(name: string) {
    updateConfig({
      customLocations: config.customLocations.filter(
        (location) => location.name !== name,
      ),
    })
  }

  return (
    <main className="screen setup-screen">
      <section className="hero-panel">
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

        <div className="form-grid">
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

          <label className="field">
            <span>Espiões</span>
            <input
              type="number"
              min="1"
              max={config.playersCount - 1}
              value={config.spiesCount}
              onChange={(event) =>
                updateConfig({ spiesCount: Number(event.target.value) })
              }
            />
          </label>

          <label className="field">
            <span>Tempo em minutos</span>
            <input
              type="number"
              min="1"
              value={config.durationInMinutes}
              onChange={(event) =>
                updateConfig({ durationInMinutes: Number(event.target.value) })
              }
            />
          </label>

          <label className="toggle-field">
            <input
              type="checkbox"
              checked={config.spyGetsHint}
              onChange={(event) =>
                updateConfig({ spyGetsHint: event.target.checked })
              }
            />
            <span>Espião recebe dica?</span>
          </label>
        </div>

        <div className="segmented-control" aria-label="Tempos sugeridos">
          {TIME_OPTIONS.map((minutes) => (
            <button
              type="button"
              className={minutes === config.durationInMinutes ? 'active' : ''}
              onClick={() => updateConfig({ durationInMinutes: minutes })}
              key={minutes}
            >
              {minutes} min
            </button>
          ))}
        </div>

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
        <div className="custom-location-form">
          <label className="field">
            <span>Lugar</span>
            <input
              type="text"
              value={customLocation.name}
              onChange={(event) =>
                setCustomLocation({
                  ...customLocation,
                  name: event.target.value,
                })
              }
              placeholder="Ex.: Cafeteria"
            />
          </label>
          <label className="field">
            <span>Dica</span>
            <input
              type="text"
              value={customLocation.hint}
              onChange={(event) =>
                setCustomLocation({
                  ...customLocation,
                  hint: event.target.value,
                })
              }
              placeholder="Ex.: lugar com balcão, xícaras e aroma de café"
            />
          </label>
          <button type="button" className="secondary-button" onClick={addCustomLocation}>
            Adicionar
          </button>
        </div>

        {config.customLocations.length > 0 ? (
          <div className="chips-list">
            {config.customLocations.map((location) => (
              <button
                type="button"
                className="chip"
                onClick={() => removeCustomLocation(location.name)}
                key={location.name}
              >
                {location.name} remover
              </button>
            ))}
          </div>
        ) : null}
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
