import { useState } from 'react'
import { validateSettings } from '@espiao/game-core'
import { CustomLocationsEditor, SettingsFields } from '../../components/SettingsFields/SettingsFields'
import type { ClientState, RoomClient } from '../RoomClient'

type LobbyScreenProps = {
  client: RoomClient
  state: ClientState
}

export function LobbyScreen({ client, state }: LobbyScreenProps) {
  const { room, you, roomCode, error } = state
  const [copied, setCopied] = useState(false)

  if (!room || !you || !roomCode) {
    return null
  }

  const isHost = room.hostId === you.id
  const inviteUrl = `${window.location.origin}/sala/${roomCode}`
  const issue = validateSettings(room.settings, room.players.length)

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      window.prompt('Copie o link da sala:', inviteUrl)
    }
  }

  async function shareInvite() {
    try {
      await navigator.share({ title: 'Jogo do Espião', text: 'Entre na minha sala!', url: inviteUrl })
    } catch {
      // Cancelled by the person: nothing to do.
    }
  }

  return (
    <main className="screen setup-screen">
      <section className="hero-panel">
        <p className="eyebrow">Sala</p>
        <h1 aria-label={`Código da sala ${roomCode.split('').join(' ')}`}>{roomCode}</h1>
        <p className="lede">Chame o pessoal pelo link ou digite o código em “Jogar online”.</p>
        <div className="actions">
          <button type="button" className="secondary-button" onClick={copyInvite}>
            {copied ? 'Link copiado!' : 'Copiar link'}
          </button>
          {typeof navigator.share === 'function' ? (
            <button type="button" className="secondary-button" onClick={shareInvite}>
              Compartilhar
            </button>
          ) : null}
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Na sala</p>
            <h2>Jogadores ({room.players.length})</h2>
          </div>
        </div>
        <ul className="player-list">
          {room.players.map((player) => (
            <li className="player-row" key={player.id}>
              <span
                className={`presence ${player.connected ? 'on' : 'off'}`}
                role="img"
                aria-label={player.connected ? 'Conectado' : 'Reconectando'}
              />
              <span className="player-name">
                {player.nickname}
                {player.id === you.id ? ' (você)' : ''}
              </span>
              {player.id === room.hostId ? <span className="pill">Anfitrião</span> : null}
              {isHost && player.id !== you.id ? (
                <button
                  type="button"
                  className="secondary-button small-button"
                  onClick={() => client.kick(player.id)}
                  aria-label={`Remover ${player.nickname}`}
                >
                  Remover
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Configuração</p>
            <h2>{isHost ? 'Ajuste a rodada' : 'Rodada definida pelo anfitrião'}</h2>
          </div>
        </div>
        <SettingsFields
          settings={room.settings}
          playersCount={room.players.length}
          disabled={!isHost}
          onChange={(changes) => client.updateSettings({ ...room.settings, ...changes })}
        />
        {isHost ? (
          <>
            <div className="panel-heading spaced">
              <h2>Lugares customizados</h2>
            </div>
            <CustomLocationsEditor
              locations={room.settings.customLocations}
              onChange={(customLocations) => client.updateSettings({ ...room.settings, customLocations })}
            />
          </>
        ) : null}
      </section>

      {error ? (
        <p className="error-message" role="alert">
          {error.message}
        </p>
      ) : null}

      <div className="actions sticky-action">
        {isHost ? (
          <>
            {issue ? <p className="error-message">{issue.message}</p> : null}
            <button
              type="button"
              className="primary-button"
              disabled={Boolean(issue)}
              onClick={() => client.startRound()}
            >
              Iniciar rodada
            </button>
          </>
        ) : (
          <p className="success-message">Aguardando o anfitrião iniciar a rodada…</p>
        )}
        <button type="button" className="secondary-button" onClick={() => client.leave()}>
          Sair da sala
        </button>
      </div>
    </main>
  )
}
