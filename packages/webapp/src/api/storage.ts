import type {
  Player,
  TrainingSession,
  CheckIn,
  Court,
  Match,
  MatchPlayer
} from '@badminton/common'

const STORAGE_KEY = 'badminton-klub-db-v1'

export type DatabaseState = {
  players: Player[]
  sessions: TrainingSession[]
  checkIns: CheckIn[]
  courts: Court[]
  matches: Match[]
  matchPlayers: MatchPlayer[]
}

const playerSeeds = [
  'Anna Jensen',
  'Bo Andersen',
  'Camilla Sørensen',
  'Daniel Larsen',
  'Emma Thomsen',
  'Frederik Nielsen',
  'Gitte Holm',
  'Henrik Kristensen',
  'Ida Madsen',
  'Jonas Mortensen',
  'Katrine Lauritzen',
  'Lars Poulsen',
  'Maja Kristoffersen',
  'Nikolaj Ravn',
  'Olivia Iversen',
  'Peter Olesen',
  'Rasmus Bjerre',
  'Sara Wind',
  'Thomas Østergaard',
  'Ulla Kjær',
  'Victor Holst',
  'William Dam',
  'Xenia Bro',
  'Yvonne Aagaard',
  'Zander Holm',
  'Albert Hede',
  'Birgitte Damgaard',
  'Carsten Dal',
  'Ditte Vad',
  'Esben Duelund',
  'Filip Tran',
  'Gry Aagesen',
  'Hanna Riis',
  'Iben Rask',
  'Jeppe Bo',
  'Klara Mikkelsen',
  'Liva Ditlev',
  'Malthe Falk',
  'Noah Bach'
]

const createId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).slice(2)
}

const createSeedState = (): DatabaseState => {
  const now = new Date().toISOString()
  return {
    players: playerSeeds.map((name) => ({
      id: createId(),
      name,
      alias: null,
      level: null,
      active: true,
      createdAt: now
    })),
    sessions: [],
    checkIns: [],
    courts: Array.from({ length: 8 }, (_, i) => ({
      id: createId(),
      idx: i + 1
    })),
    matches: [],
    matchPlayers: []
  }
}

let cachedState: DatabaseState | null = null

const getStorage = () => {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export const loadState = (): DatabaseState => {
  if (cachedState) return cachedState
  const storage = getStorage()
  if (storage) {
    const raw = storage.getItem(STORAGE_KEY)
    if (raw) {
      try {
        cachedState = JSON.parse(raw) as DatabaseState
        return cachedState
      } catch {
        // fall back to seed state
      }
    }
  }
  cachedState = createSeedState()
  persistState()
  return cachedState
}

export const persistState = () => {
  const storage = getStorage()
  if (storage && cachedState) {
    storage.setItem(STORAGE_KEY, JSON.stringify(cachedState))
  }
}

export const updateState = (updater: (state: DatabaseState) => void) => {
  const state = loadState()
  updater(state)
  persistState()
}

export const resetState = () => {
  cachedState = createSeedState()
  persistState()
}

export const getStateCopy = (): DatabaseState => {
  const state = loadState()
  return {
    players: state.players.map((player) => ({ ...player })),
    sessions: state.sessions.map((session) => ({ ...session })),
    checkIns: state.checkIns.map((checkIn) => ({ ...checkIn })),
    courts: state.courts.map((court) => ({ ...court })),
    matches: state.matches.map((match) => ({ ...match })),
    matchPlayers: state.matchPlayers.map((matchPlayer) => ({ ...matchPlayer }))
  }
}

export { createId }
