# Spy Game

A party game in the style of Spyfall. Everyone except the spy (or spies) learns a secret location;
players take turns asking each other questions, the spy tries to work out the location, and
everyone else tries to find the spy before the timer runs out.

Two modes:

- **Play on this phone:** one device passed from hand to hand, no internet needed.
- **Play online:** everyone uses their own phone, joins a room with a code (or link) and sees only their own role.

## Who it is for

Groups of friends and family playing in the same room or on a video call. No accounts: nicknames only.

## How to play

1. One person creates a room (online) or sets up the match (local) and invites the others with the link `/room/CODE`.
2. With at least 3 players, the host picks the number of spies, the time, whether the spy gets a hint and any extra locations, then starts the round.
3. Everyone taps **Reveal role**. Players who are not the spy see the location; the spy sees "You are the spy" (plus a hint, if enabled).
4. The round starts with the indicated player asking a question; players take turns asking and answering without giving the location away too obviously.
5. The spy tries to figure out the location; the others try to find the spy before time runs out.
6. When the time is up (or the host ends the round) the location and the spies are revealed to everyone.

## Stack

- Node.js 24 LTS (the project also runs on 22), pnpm workspaces, strict TypeScript.
- `apps/web`: React 19 + Vite + React Router.
- `apps/server`: NestJS + Socket.IO, validation with zod.
- `packages/game-core`: game rules and the list of locations, used by local mode and by the server (plus the protocol types).
- Tests: Vitest (unit and integration) and Playwright (E2E).

```
apps/web         web app (local and online mode)
apps/server      real-time room server
apps/e2e         end-to-end tests (Playwright)
packages/game-core
docs/SPEC.md     project specification
```

The server is authoritative: it draws the location, the spies and who asks first, owns the round end
time, and sends each player only their own role. Other players' roles arrive only in `round:ended`.

## Running locally

```bash
pnpm install
pnpm build:core        # builds packages/game-core/dist (needed once and after every change to the core)
```

In two terminals:

```bash
pnpm dev:server        # http://localhost:3000
```

```bash
pnpm dev:web           # http://localhost:5173
```

To play online on two devices on the same network, open the Vite address through the computer's IP
and set `VITE_SERVER_URL` and `CORS_ORIGIN` (see below).

### Environment variables

| Where | Variable | Default | Purpose |
|---|---|---|---|
| server | `PORT` | `3000` | HTTP/WebSocket port |
| server | `CORS_ORIGIN` | `http://localhost:5173` | Allowed web origins, comma-separated |
| web (build) | `VITE_SERVER_URL` | `http://localhost:3000` | Public URL of the server |

Templates are in `apps/server/.env.example` and `apps/web/.env.example`. Never commit real `.env` files.

## Testing

```bash
pnpm lint
pnpm typecheck
pnpm test          # game-core, server (service + gateway with socket.io-client) and web
pnpm build
pnpm test:e2e      # Playwright with three browsers: create a room, join, play one round
```

The E2E suite starts the server and the web app by itself. If Playwright's Chromium is not
installed, run `pnpm --filter @spy-game/e2e exec playwright install chromium` or point
`PLAYWRIGHT_CHROMIUM_PATH` at an existing Chromium.

## Deploy

The server keeps rooms **in memory**: run **a single, always-on instance**. Restarting the server
deletes the rooms (players see "your seat expired"). Free instances that go to sleep also lose
rooms. Redis is on the [roadmap](ROADMAP.md).

### 1. Server (Render or Fly.io)

The `Dockerfile` at the repository root works for both. It is not built in CI; its steps were
checked by hand outside Docker, so watch the log on the first deploy.

**Render:** create a Blueprint from the repository (it uses `render.yaml`) and set `CORS_ORIGIN`
to the web app URL (for example `https://spy-game.vercel.app`). Health is checked at `/health`.

**Fly.io:**

```bash
fly launch --no-deploy --copy-config
fly secrets set CORS_ORIGIN=https://your-app.vercel.app
fly deploy
```

### 2. Web (Vercel)

Import the repository, set **Root Directory** to `apps/web` (keep the option to include files
outside the root directory enabled) and set `VITE_SERVER_URL` to the server's public URL
(`https://...`). `apps/web/vercel.json` already contains the install and build commands and the
rewrite that sends routes such as `/room/CODE` to `index.html`.

After deploying the web app, go back to the server and make sure `CORS_ORIGIN` is exactly the web app URL.

## Protocol (summary)

Details and types are in `packages/game-core/src/protocol.ts`; the specification is in [docs/SPEC.md](docs/SPEC.md).
In addition to the events in the specification, these were added:

- `room:backToLobby` (host): go from the result back to the lobby.
- `room:left { reason }`: tells a player they left or were removed.
- Error codes `INVALID_PAYLOAD`, `NOT_IN_ROOM` and `SESSION_INVALID`.
- `serverNow` in `round:started`, so the countdown can correct for devices with a wrong clock.

Room rules: at most 20 players; a player who loses the connection keeps their seat for 60 s (if at
least one other player is connected; when everyone is offline seats are kept until the room
expires); a room with no connected players for 10 minutes is deleted; joining during a round is
refused (`ROUND_IN_PROGRESS`); at most 20 events per second per connection, and messages over
32 KB drop the connection.

## Privacy

No accounts. Players are nicknames, kept only in server memory while the room exists. The browser
stores the nickname and the seat token locally (`localStorage`) so it can reconnect.

## Status

Phase 1 (online mode) is done: rooms, lobby, private reveal, synchronized countdown, reconnection,
and unit, integration and E2E tests. What comes next is in [ROADMAP.md](ROADMAP.md) (and as issues
in [docs/ISSUES.md](docs/ISSUES.md)); none of it is implemented.

## License

[MIT](LICENSE)
