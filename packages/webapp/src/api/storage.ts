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

const playerSeeds: Array<{ name: string; level: number }> = [
  { name: 'Kristian Simoni', level: 245 },
  { name: 'Phillip Ørbæk', level: 320 },
  { name: 'Peter Thorberg', level: 458 },
  { name: 'Andreas Juhl', level: 505 },
  { name: 'Tommi Saksa EU', level: 582 },
  { name: 'Mikkel Brenøe-Jensen', level: 598 },
  { name: 'Oliver Trzepacz', level: 604 },
  { name: 'Tobias Hartwich', level: 609 },
  { name: 'Mathias Amdi Jensen', level: 645 },
  { name: 'Fillip Svejgaard', level: 735 },
  { name: 'Santtu Hyvärinen EU', level: 739 },
  { name: 'Jonathan Hedegaard', level: 787 },
  { name: 'Asger Feldbæk Nielsen', level: 793 },
  { name: 'Nicklas Laursen', level: 826 },
  { name: 'Bo Zølner', level: 964 },
  { name: 'Rasmus Thorsted Mortensen', level: 972 },
  { name: 'Johan la Cour Pind Schmidt', level: 978 },
  { name: 'Anders David Thellefsen', level: 987 },
  { name: 'Sebastian Cederlund', level: 1094 },
  { name: 'Jonas Bangsgaard', level: 1130 },
  { name: 'Peter Hjort Larsen', level: 1231 },
  { name: 'Carsten Brink Nielsen', level: 1254 },
  { name: 'Mark Hansen', level: 1290 },
  { name: 'Daniel Bjerre Hecht', level: 1371 },
  { name: 'Marc Halgreen', level: 1460 },
  { name: 'Jesper Skytte', level: 1470 },
  { name: 'Rasmus Thage', level: 1554 },
  { name: 'Flemming Klausen', level: 1610 },
  { name: 'Parag Naithani', level: 1724 },
  { name: 'Freja Helander', level: 1743 },
  { name: 'Mie Falkenberg', level: 1819 },
  { name: 'Katrine M Hansen', level: 1851 },
  { name: 'Julie Helander', level: 1867 },
  { name: 'Casper Holck Rosendal', level: 2000 },
  { name: 'Sofie Dahl', level: 2000 },
  { name: 'Martin Pallis', level: 2096 },
  { name: 'Mads Hartwich', level: 2114 },
  { name: 'Hjalte Pagh', level: 2195 },
  { name: 'Katrine Amdi Jensen', level: 2258 },
  { name: 'Tina Brix Nyhuus', level: 2364 },
  { name: 'Jesper Nielsen', level: 2450 },
  { name: 'Emilia Skøtt Borregaard', level: 2488 },
  { name: 'Nicolai Fogt', level: 2510 },
  { name: 'Kristian Hede', level: 2510 },
  { name: 'Frederikke Jespersgaard', level: 2575 },
  { name: 'Anders Kristensen', level: 2622 },
  { name: 'Bo Mortensen', level: 2688 },
  { name: 'Daniel Froberg', level: 2898 },
  { name: 'Rikke Højbjerg', level: 3013 },
  { name: 'Dorthe Brink', level: 3122 },
  { name: 'Kamila Cooper Lassen', level: 3130 },
  { name: 'Søren Knudsen', level: 3155 },
  { name: 'Jesper Fyhr Jensen', level: 3162 },
  { name: 'Karsten Viborg', level: 3270 },
  { name: 'Joachim Hedegaard', level: 3370 },
  { name: 'Nete Kjær Gabel', level: 3413 },
  { name: 'Katrine Schultz-Knudsen', level: 3770 },
  { name: 'Esther Feldbæk Nielsen', level: 3848 },
  { name: 'Simone Schefte', level: 4104 },
  { name: 'Thomas Hartwich', level: 4235 },
  { name: 'Julie Johansen', level: 4240 },
  { name: 'Simon Hemming Hansen', level: 4263 },
  { name: 'Marianne Strøm Madsen', level: 4367 },
  { name: 'Rie Søgaard Jensen', level: 4681 },
  { name: 'Frederik Lasse Enevoldsen', level: 4722 },
  { name: 'Siv Saabye', level: 4728 },
  { name: 'Ida Palm', level: 4756 },
  { name: 'Claes Ladefoged', level: 4762 },
  { name: 'Eva Zib', level: 5001 },
  { name: 'Kristine Nørgaard Pedersen', level: 5132 }
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
    players: playerSeeds.map((seed) => ({
      id: createId(),
      name: seed.name,
      alias: null,
      level: seed.level,
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
