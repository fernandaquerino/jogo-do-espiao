export type Location = {
  name: string
  hint: string
}

export type PlayerRole = 'player' | 'spy'

/** Settings that shape a round, shared by local and online modes. */
export type RoundSettings = {
  spiesCount: number
  durationInMinutes: number
  spyGetsHint: boolean
  customLocations: Location[]
}

/** Outcome of drawing a round. Generic over the id type (numbers locally, strings online). */
export type Round<Id extends string | number> = {
  location: Location
  spyIds: Id[]
  firstAskerId: Id
}

export type SettingsIssueCode = 'NOT_ENOUGH_PLAYERS' | 'INVALID_SETTINGS'

export type SettingsIssue = {
  code: SettingsIssueCode
  message: string
}

/** Source of randomness in [0, 1); injectable so tests are deterministic. */
export type Random = () => number
