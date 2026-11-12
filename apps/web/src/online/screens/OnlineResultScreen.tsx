import { ResultScreen } from '../../components/ResultScreen/ResultScreen'
import type { GameRound, Player } from '../../types/game'
import type { ClientState, RoomClient } from '../RoomClient'

type OnlineResultScreenProps = {
  client: RoomClient
  state: ClientState
}

export function OnlineResultScreen({ client, state }: OnlineResultScreenProps) {
  const { room, you, result } = state

  if (!room || !you || !result) {
    return null
  }

  const isHost = room.hostId === you.id
  const players: Player[] = room.players.map((player) => ({
    id: player.id,
    name: player.nickname,
    role: result.spyIds.includes(player.id) ? 'spy' : 'player',
  }))

  // A spy who left the room for good is no longer in the player list.
  for (const spyId of result.spyIds) {
    if (!players.some((player) => player.id === spyId)) {
      players.push({ id: spyId, name: 'Jogador que saiu', role: 'spy' })
    }
  }

  const round: GameRound = { location: result.location, players, firstAskerId: '' }

  return (
    <ResultScreen
      round={round}
      onPlayAgain={isHost ? () => client.startRound() : undefined}
      onNewConfig={isHost ? () => client.backToLobby() : undefined}
      playAgainLabel="Nova rodada"
      newConfigLabel="Voltar ao lobby"
      footer={
        isHost ? null : <p className="success-message">Aguardando o anfitrião escolher o próximo passo…</p>
      }
    />
  )
}
