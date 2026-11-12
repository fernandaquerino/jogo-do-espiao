import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ConnectionBanner } from '../online/ConnectionBanner'
import { JoinForm } from '../online/screens/JoinForm'
import { useRoomClient, useRoomState } from '../online/useRoomClient'

export function OnlineEntry() {
  const client = useRoomClient()
  const state = useRoomState()
  const navigate = useNavigate()

  useEffect(() => {
    client.connect()
  }, [client])

  useEffect(() => {
    if (state.roomCode && state.you) {
      navigate(`/sala/${state.roomCode}`, { replace: true })
    }
  }, [state.roomCode, state.you, navigate])

  const error = state.error?.message ?? null

  return (
    <main className="screen setup-screen">
      <section className="hero-panel">
        <Link to="/" className="back-link">
          ← Início
        </Link>
        <p className="eyebrow">Jogo em grupo</p>
        <h1>Jogar online</h1>
        <p className="lede">Crie uma sala e compartilhe o link, ou entre com o código de um amigo.</p>
      </section>

      <ConnectionBanner status={state.connection} onReconnect={() => client.reconnect()} />

      <JoinForm
        title="Criar sala"
        submitLabel="Criar sala"
        disabled={state.pending}
        error={null}
        onSubmit={(nickname) => client.create(nickname)}
      />

      <JoinForm
        title="Entrar com código"
        submitLabel="Entrar na sala"
        disabled={state.pending}
        error={error}
        fixedCode=""
        onSubmit={(nickname, code) => client.join(code, nickname)}
      />
    </main>
  )
}
