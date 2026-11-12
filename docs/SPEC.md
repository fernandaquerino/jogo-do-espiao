# Spy Game Online: Specification

Project brief for the online mode (Phase 1). Summary of the original brief; the build order in
section 6 is the source of truth for the work.

## 1. Product

A Spyfall-style party game in English. Everyone except the spy (or spies) learns a
secret location; players take turns asking questions, the spy tries to guess the location, and the
others try to find the spy before the timer runs out.

Before Phase 1: a local, pass-the-phone app (React 19 + Vite + TypeScript) with setup, role reveal,
timer and result. **Phase 1 goal:** an online mode where each player uses their own phone, joins a
room with a code and sees only their own role. The local mode stays.

Audience: groups of friends and family in the same room or on a video call.
Privacy: no accounts, nicknames only, room data in server memory and expiring.

## 2. Architecture

```
apps/web          Vite app (local + online mode)
apps/server       NestJS + Socket.IO gateway
packages/game-core  pure game rules + locations data, shared by web and server
```

Node.js 24 LTS, pnpm workspaces, strict TypeScript. The server is authoritative: it assigns roles,
owns round state and the timer end time, and never sends a role to anyone but its owner before the
round result. Room state lives in memory behind a `RoomStore` interface.

## 3. Online flow

1. Create room: nickname in, 6-char code (no `0/O/1/I`) and link `/room/CODE` out.
2. Join: link or code plus a nickname (unique in the room, 1-20 chars).
3. Lobby: live player list; host edits settings (spies, duration, spy hint, custom locations) and can remove players.
4. Start: at least 3 players and fewer spies than players. Server draws location, spies and first asker with `game-core`.
5. Private reveal: each player taps to see their own role card.
6. Playing: countdown from the server's `endsAt`; shows who asks first; host can end early.
7. Result: location and spies revealed to all; host starts a new round or returns to the lobby.

Reconnection: `sessionToken` issued on join, kept in the browser. A dropped player keeps their seat
for 60 s and gets the current state back (including their own role). If the host leaves for good,
host passes to the next player. Rooms with no connected players for 10 minutes are deleted; max 20 players.

## 4. Socket events

Payloads validated with zod. Errors are `{ code, message }` with codes `ROOM_NOT_FOUND`,
`ROOM_FULL`, `NICKNAME_TAKEN`, `NOT_HOST`, `NOT_ENOUGH_PLAYERS`, `INVALID_SETTINGS`, `ROUND_IN_PROGRESS`.

| Client -> server | Server -> client |
|---|---|
| `room:create { nickname }` | `room:joined { roomCode, sessionToken, you }` |
| `room:join { roomCode, nickname }` | `room:state { players, hostId, settings, phase }` (broadcast) |
| `room:resume { roomCode, sessionToken }` | `round:started { firstAskerId, endsAt }` (broadcast) |
| `room:updateSettings { settings }` (host) | `round:role { role, location?, hint? }` (only to that player) |
| `room:kick { playerId }` (host) | `round:ended { location, spyIds }` (broadcast) |
| `round:start` (host) | `error { code, message }` |
| `round:end` (host) | |
| `room:leave` | |

Events are rate-limited per socket and oversized payloads are ignored.

## 5. Web changes

Home with "Play on this phone" and "Play online"; routes `/`, `/local`, `/online`, `/room/:code` (React Router);
online screens reuse existing components; connection status banner and English error messages;
mobile-first, large tap targets, `prefers-reduced-motion` respected; real README.

## 6. Build order (commit after each step)

1. Repo hygiene: LICENSE, README skeleton, `.gitignore`, CI, pnpm workspace via `git mv`.
2. Extract `packages/game-core` with unit tests; local mode uses it.
3. `apps/server`: NestJS + Socket.IO, in-memory `RoomStore`, create/join/leave/state, room service tests.
4. Rounds: start, private role delivery, server timer, end; tests that no one gets another player's role early.
5. Reconnection, host handover, room expiry; tests with fake timers.
6. Web: home, create/join, lobby, reveal, playing, result connected to the server.
7. Gateway integration tests with `socket.io-client`.
8. Playwright E2E with three browser contexts.
9. Deploy configuration (web on Vercel, server on Render or Fly.io) documented with env vars.
10. Complete README, `ROADMAP.md`, `docs/ISSUES.md`.

**Stop after step 10.** Roadmap items are documented, not implemented.

## 7. Roadmap (documented only)

Voting phase; spy guess; scoring; location packs; roles per location; Redis `RoomStore`; spectator
mode; sounds and haptics; PWA; accessibility pass; English version; anonymous usage metrics; load test
of 200 concurrent rooms. Each item gets title, problem, scope and acceptance criteria.

## 8. Repository rules

- MIT license, `Copyright (c) 2026 fernandaquerino`.
- README: what it is, audience, how to play, stack, run, test, deploy, status, link to ROADMAP.md.
- Never commit secrets; only `.env.example`.
- No real personal data; nicknames in memory only.
- Keep history; Conventional Commits; no squash, rewrite, backdating or force-push.
- Lint, typecheck, tests and build pass before each commit; report only commands actually run.
- Small focused files; game rules only in `game-core`; no `any` / `@ts-ignore` without a written reason.
