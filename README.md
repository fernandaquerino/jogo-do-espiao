# Jogo do Espião

Jogo de festa no estilo Spyfall, em português do Brasil. Todos menos o(s) espião(ões) descobrem um
lugar secreto; os jogadores se fazem perguntas, o espião tenta adivinhar o lugar e os demais tentam
descobrir quem é o espião antes do tempo acabar.

Dois modos:

- **Jogar neste celular:** um aparelho passado de mão em mão, sem internet.
- **Jogar online:** cada pessoa usa o próprio celular, entra numa sala com um código (ou link) e vê apenas o próprio papel.

## Para quem é

Grupos de amigos e família jogando na mesma sala ou em videochamada. Sem contas: só apelidos.

## Como jogar

1. Uma pessoa cria a sala (online) ou configura a partida (local) e chama os outros pelo link `/sala/CÓDIGO`.
2. Com pelo menos 3 jogadores, o anfitrião escolhe número de espiões, tempo, se o espião recebe dica e lugares extras, e inicia a rodada.
3. Cada pessoa toca em **Revelar papel**. Quem não é espião vê o lugar; o espião vê "Você é o espião" (e uma dica, se ligada).
4. A rodada começa com a pessoa indicada fazendo uma pergunta; os jogadores se revezam perguntando e respondendo, sem entregar o lugar de forma óbvia.
5. O espião tenta descobrir o lugar; os outros tentam descobrir o espião antes de o tempo acabar.
6. Ao fim (tempo esgotado ou anfitrião encerrando), o lugar e os espiões são revelados para todos.

## Stack

- Node.js 24 LTS (o projeto também roda no 22), pnpm workspaces, TypeScript estrito.
- `apps/web`: React 19 + Vite + React Router.
- `apps/server`: NestJS + Socket.IO, validação com zod.
- `packages/game-core`: regras do jogo e lista de lugares, usadas pelo modo local e pelo servidor (além dos tipos do protocolo).
- Testes: Vitest (unidade e integração) e Playwright (E2E).

```
apps/web         app web (modo local e online)
apps/server      servidor de salas em tempo real
apps/e2e         testes ponta a ponta (Playwright)
packages/game-core
docs/SPEC.md     especificação do projeto
```

O servidor é a autoridade: sorteia lugar, espiões e quem pergunta primeiro, é dono do horário de
fim da rodada e só envia a cada jogador o próprio papel. Os papéis dos outros só chegam em `round:ended`.

## Rodando localmente

```bash
pnpm install
pnpm build:core        # gera packages/game-core/dist (necessário uma vez e a cada mudança no core)
```

Em dois terminais:

```bash
pnpm dev:server        # http://localhost:3000
```

```bash
pnpm dev:web           # http://localhost:5173
```

Para jogar online em dois aparelhos na mesma rede, abra o endereço do Vite pelo IP do computador e
defina `VITE_SERVER_URL` e `CORS_ORIGIN` (veja abaixo).

### Variáveis de ambiente

| Onde | Variável | Padrão | Para quê |
|---|---|---|---|
| servidor | `PORT` | `3000` | Porta HTTP/WebSocket |
| servidor | `CORS_ORIGIN` | `http://localhost:5173` | Origens do web permitidas, separadas por vírgula |
| web (build) | `VITE_SERVER_URL` | `http://localhost:3000` | URL pública do servidor |

Modelos em `apps/server/.env.example` e `apps/web/.env.example`. Nunca versione arquivos `.env` reais.

## Testes

```bash
pnpm lint
pnpm typecheck
pnpm test          # game-core, servidor (serviço + gateway com socket.io-client) e web
pnpm build
pnpm test:e2e      # Playwright com três navegadores: cria sala, entra, joga uma rodada
```

O E2E sobe servidor e web sozinho. Se o Chromium do Playwright não estiver instalado, use
`pnpm --filter @espiao/e2e exec playwright install chromium` ou aponte `PLAYWRIGHT_CHROMIUM_PATH`
para um Chromium existente.

## Deploy

O servidor guarda as salas **na memória**: rode **uma única instância sempre ligada**. Reiniciar o
servidor apaga as salas (os jogadores veem "sua vaga expirou"). Instâncias gratuitas que dormem
também perdem as salas. Redis está no [roadmap](ROADMAP.md).

### 1. Servidor (Render ou Fly.io)

O `Dockerfile` da raiz serve para os dois. Ele não foi construído em CI; os passos foram
conferidos à mão fora do Docker, então faça o primeiro deploy acompanhando o log.

**Render:** crie um Blueprint a partir do repositório (usa `render.yaml`) e defina
`CORS_ORIGIN` com a URL do web (por exemplo `https://espiao.vercel.app`). A saúde é checada em `/health`.

**Fly.io:**

```bash
fly launch --no-deploy --copy-config
fly secrets set CORS_ORIGIN=https://seu-app.vercel.app
fly deploy
```

### 2. Web (Vercel)

Importe o repositório, defina **Root Directory** como `apps/web` (deixe ligada a opção de incluir
arquivos fora do diretório raiz) e a variável `VITE_SERVER_URL` com a URL pública do servidor
(`https://...`). `apps/web/vercel.json` já traz os comandos de instalação e build e o
redirecionamento das rotas (`/sala/CÓDIGO`) para o `index.html`.

Depois do deploy do web, volte ao servidor e confirme que `CORS_ORIGIN` é exatamente a URL do web.

## Protocolo (resumo)

Detalhes e tipos em `packages/game-core/src/protocol.ts`; a especificação está em [docs/SPEC.md](docs/SPEC.md).
Além dos eventos da especificação, foram adicionados:

- `room:backToLobby` (anfitrião): volta do resultado para o lobby.
- `room:left { reason }`: avisa quem saiu ou foi removido.
- Códigos de erro `INVALID_PAYLOAD`, `NOT_IN_ROOM` e `SESSION_INVALID`.
- `serverNow` em `round:started`, para o cronômetro acertar o relógio de aparelhos desregulados.

Regras de sala: máximo de 20 jogadores; quem perde a conexão mantém a vaga por 60 s (se ainda houver
alguém conectado; com todos offline as vagas ficam até a sala expirar); sem jogadores conectados por
10 minutos a sala é apagada; entrar com uma rodada em andamento é recusado (`ROUND_IN_PROGRESS`);
no máximo 20 eventos por segundo por conexão e mensagens acima de 32 KB derrubam a conexão.

## Privacidade

Sem contas. Jogadores são apelidos, mantidos só na memória do servidor enquanto a sala existe.
O navegador guarda localmente (`localStorage`) o apelido e o token da vaga para reconectar.

## Status

Fase 1 (modo online) concluída: salas, lobby, revelação privada, cronômetro sincronizado,
reconexão, testes de unidade, integração e E2E. O que vem depois está em [ROADMAP.md](ROADMAP.md)
(e como issues em [docs/ISSUES.md](docs/ISSUES.md)); nada daquilo foi implementado.

## Licença

[MIT](LICENSE)
