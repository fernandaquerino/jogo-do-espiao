# Roadmap

Planned items after Phase 1 (online mode). **None of them is implemented.** Each one is also written as a ready-to-file issue in [docs/ISSUES.md](docs/ISSUES.md).

| # | Item | Area |
|---|---|---|
| 1 | [Voting phase](#1-voting-phase) | game |
| 2 | [Spy guess](#2-spy-guess) | game |
| 3 | [Scoring across rounds](#3-scoring-across-rounds) | game |
| 4 | [Location packs](#4-location-packs) | content |
| 5 | [Roles per location](#5-roles-per-location) | game |
| 6 | [Redis RoomStore](#6-redis-roomstore) | infra |
| 7 | [TV spectator mode](#7-tv-spectator-mode) | feature |
| 8 | [Sounds and haptics](#8-sounds-and-haptics) | polish |
| 9 | [Installable PWA](#9-installable-pwa) | platform |
| 10 | [Accessibility pass](#10-accessibility-pass) | a11y |
| 11 | [Multiple languages (i18n)](#11-multiple-languages-i18n) | platform |
| 12 | [Anonymous usage metrics](#12-anonymous-usage-metrics) | infra |
| 13 | [Load test with 200 rooms](#13-load-test-with-200-rooms) | infra |

## 1. Voting phase

**Problem.** Today a round only ends when the timer runs out or the host ends it. The group has no way to formally decide who the spy is.

**Scope.** A `voting` phase started by the host or by majority. Each player votes for a suspect (and may change the vote until the end). When an absolute majority points at the same player the round ends; if there is no majority before the voting time runs out, the round ends with no accused. The server validates and counts votes; nobody sees individual votes until the end.

**Acceptance criteria.**

- Only players in the room vote, one active vote per player, voting for yourself is not possible.
- An absolute majority ends the round and `round:ended` reports the accused and whether they were a spy.
- Individual votes are not sent before voting ends.
- Service tests (majority, tie, vote change, a player leaving during the vote) and gateway tests.
- A mobile voting screen with large tap targets.

## 2. Spy guess

**Problem.** In the original rules the spy can stop the clock and try to guess the location; here the spy can only wait.

**Scope.** A `round:guess { location }` event sent only by the spy. The server pauses the clock, compares the guess with the location (ignoring case and accents) and ends the round with a spy win or a group win. The list of possible locations is sent to the spy during the round.

**Acceptance criteria.**

- Only spies can guess; everyone else gets `NOT_SPY`.
- A correct guess ends the round with a spy win; a wrong one, with a group win.
- Everyone's clock stops at the moment of the guess.
- The list of locations reaches the spy only.
- Service and gateway tests covering both outcomes.

## 3. Scoring across rounds

**Problem.** Every round is isolated; there is no scoreboard for playing several in a row.

**Scope.** A per-room scoreboard kept in memory, with Spyfall-style points (a spy who escapes or guesses the location, a group that accuses correctly, a bonus for the accuser). The scoreboard is shown on the result screen and in the lobby, with a reset button. It depends on voting and guessing to have well-defined winners.

**Acceptance criteria.**

- Points are computed on the server and documented in the README.
- The scoreboard survives reconnections and disappears when the room expires.
- A player who leaves loses their row; a newcomer starts at zero.
- Point calculation tests for every possible outcome.

## 4. Location packs

**Problem.** There is a single list of 41 locations; different groups (kids, work, travel) want different themes.

**Scope.** Split the locations into packs (travel, work, kids, plus the basics) in `game-core`, each location with a `packId`. The host chooses packs in the lobby; custom locations still apply. A minimum number of locations is required to start.

**Acceptance criteria.**

- At least 3 new packs with 15 locations each, all with hints.
- The host turns packs on and off; at least one pack or custom location must stay active.
- The draw only considers locations from active packs.
- Local mode can also choose packs.
- `game-core` tests for pack filtering and validation.

## 5. Roles per location

**Problem.** All non-spies are identical, which makes it easy for the spy to hide behind generic answers.

**Scope.** Each location gets an optional list of roles (for example, Movie theater: popcorn seller, projectionist, ticket clerk). The server draws one role per player and sends it in the private `round:role`, without repeats while free roles remain.

**Acceptance criteria.**

- At least 10 locations with 5 or more roles.
- `round:role` includes `characterRole` for its owner only.
- Locations without roles keep working as today.
- A test ensuring roles leak neither in `room:state` nor in `round:ended` before the end.

## 6. Redis RoomStore

**Problem.** State lives in the memory of a single process: a restart wipes every room and two instances cannot run side by side.

**Scope.** A `RedisRoomStore` adapter behind the `RoomStore` interface, which is synchronous today and will need to become asynchronous. Timers (round, reconnection grace, expiry) move to TTLs or a shared scheduler, and events go through the Socket.IO Redis adapter's pub/sub.

**Acceptance criteria.**

- `RoomStore` becomes asynchronous, with the in-memory implementation still available.
- Two server instances serve the same room without losing events.
- Restarting one instance does not end active rooms or rounds in progress.
- A documented `REDIS_URL` variable; without it, memory is used.
- Integration tests running against a test Redis.

## 7. TV spectator mode

**Problem.** In a room with a TV, nobody wants to open their phone just to see the timer and who is in the room.

**Scope.** A `/tv/:code` route that joins as a spectator (no seat, no nickname) and shows the code, the player list, the timer and the result, and never receives roles. Spectators do not count as players.

**Acceptance criteria.**

- A spectator does not appear in the player list nor count toward the limit.
- The server never sends `round:role` to spectators; an automated test proves it.
- A screen readable from 3 meters (large font, high contrast).
- The spectator reconnects by itself.

## 8. Sounds and haptics

**Problem.** There is only an alarm at the end of the time; revealing the role is silent.

**Scope.** A short sound and vibration (where supported) when revealing the role and when time ends, with a mute toggle remembered in the browser. Respect `prefers-reduced-motion` and never play sound automatically before a user interaction.

**Acceptance criteria.**

- A visible mute button on the online and local screens, state saved in `localStorage`.
- With mute on there is no sound and no vibration.
- Vibration is ignored on devices without support, with no console errors.
- Works on iOS Safari and Chrome for Android.

## 9. Installable PWA

**Problem.** Local mode needs no internet, but today the site must be opened with a connection.

**Scope.** A manifest, icons and a service worker that cache the app for offline use. Local mode works without a network; online mode shows a clear notice when there is no connection.

**Acceptance criteria.**

- Lighthouse recognizes the app as installable.
- With the device offline, `/` and `/local` open and a full local game is possible.
- New versions update the cache without trapping the user on an old version.
- Larger and maskable icons.

## 10. Accessibility pass

**Problem.** The flows were built with basic labels and focus handling, but were never tested with a screen reader.

**Scope.** Audit the reveal flow, the lobby and the result with VoiceOver (iOS) and TalkBack (Android). Fix focus order, state-change announcements (`aria-live`), contrast and target sizes; add an automated check (axe) to the E2E suite.

**Acceptance criteria.**

- A blind player can create a room, join, see their role and finish a round using only a screen reader.
- The revealed role is announced once and disappears from the reader when hidden.
- No critical axe violations on the main screens.
- A short report of what was tested and on which devices.

## 11. Multiple languages (i18n)

**Problem.** All text is hardcoded in a single language, including the server's error messages.

**Scope.** An i18n library in the web app, starting with `en` and adding `pt-BR`. The server sends only error codes and the web app translates them. Locations and hints get translated versions. The language is picked from the browser, with a selector.

**Acceptance criteria.**

- No hardcoded text in components.
- Server error messages are translated on the client from `code`.
- The room language decides which list of locations is drawn.
- Tests covering a language switch.

## 12. Anonymous usage metrics

**Problem.** There is no way to know whether the game is being used or whether rooms finish their rounds.

**Scope.** Aggregate counters on the server (rooms created, rounds started and finished, players per room) exposed at a token-protected `/metrics`. No nicknames, no room codes, no IPs and no session identifiers.

**Acceptance criteria.**

- No player or room data appears in the metrics, verified by a test.
- Counters only live as long as the process, or sit in Redis if item 6 exists.
- `/metrics` requires a token set through an environment variable.
- A short privacy note in the README.

## 13. Load test with 200 rooms

**Problem.** It is unknown how many simultaneous rooms one instance can handle or how much memory and CPU the server uses.

**Scope.** A load script (for example with `socket.io-client` or k6) that opens 200 rooms of 6 players, plays full rounds and drops/reconnects some players. Measure event latency, memory and CPU, and record the result.

**Acceptance criteria.**

- A versioned script with usage instructions.
- 200 simultaneous rooms running for 10 minutes with no errors and no visible memory leak.
- p95 delivery of `round:started` below 500 ms.
- Results and recommended limits documented in the README.
