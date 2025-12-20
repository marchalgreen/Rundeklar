export type PlayerGender = 'Herre' | 'Dame'
export type PlayerCategory = 'Single' | 'Double' | 'Begge'

export type Player = {
  id: string
  name: string
  alias?: string | null
  level?: number | null // Deprecated: kept for backward compatibility, use levelSingle/levelDouble/levelMix instead
  levelSingle?: number | null
  levelDouble?: number | null
  levelMix?: number | null
  gender?: PlayerGender | null
  primaryCategory?: PlayerCategory | null
  trainingGroups?: string[] | null
  active: boolean
  preferredDoublesPartners?: string[] | null
  preferredMixedPartners?: string[] | null
  createdAt: string
}

export type TrainingSessionStatus = 'scheduled' | 'active' | 'ended'

export type TrainingSession = {
  id: string
  date: string
  status: TrainingSessionStatus
  createdAt: string
}

export type CheckIn = {
  id: string
  sessionId: string
  playerId: string
  createdAt: string
  maxRounds?: number | null
  notes?: string | null
}

export type Court = {
  id: string
  idx: number
}

export type Match = {
  id: string
  sessionId: string
  courtId: string
  startedAt: string
  endedAt?: string | null
  round?: number | null
}

export type MatchPlayer = {
  id: string
  matchId: string
  playerId: string
  slot: number
}

export type BadmintonScoreData = {
  sets: Array<{ team1: number; team2: number }>
  winner: 'team1' | 'team2'
}

// Placeholder for future sports
export type TennisScoreData = Record<string, any>
export type PadelScoreData = Record<string, any>

export type MatchResult = {
  id: string
  matchId: string
  sport: 'badminton' | 'tennis' | 'padel'
  scoreData: BadmintonScoreData | TennisScoreData | PadelScoreData
  winnerTeam: 'team1' | 'team2'
  createdAt: string
  updatedAt: string
}

export type CourtWithPlayers = {
  courtIdx: number
  slots: Array<{ slot: number; player: Player }>
}

export type CheckedInPlayer = Player & { checkInAt: string; maxRounds?: number | null; notes?: string | null }

export type PlayerListFilters = {
  q?: string
  active?: boolean
}

export type PlayerCreateInput = {
  name: string
  alias?: string
  level?: number // Deprecated: kept for backward compatibility
  levelSingle?: number
  levelDouble?: number
  levelMix?: number
  gender?: PlayerGender
  primaryCategory?: PlayerCategory
  trainingGroups?: string[]
  active?: boolean
  preferredDoublesPartners?: string[]
  preferredMixedPartners?: string[]
}

export type PlayerUpdateInput = {
  id: string
  patch: Partial<Pick<Player, 'name' | 'alias' | 'level' | 'levelSingle' | 'levelDouble' | 'levelMix' | 'gender' | 'primaryCategory' | 'trainingGroups' | 'active' | 'preferredDoublesPartners' | 'preferredMixedPartners'>>
}

export type MatchMovePayload = {
  playerId: string
  toCourtIdx?: number
  toSlot?: number
  round?: number
  swapWithPlayerId?: string
}

export type AutoArrangeResult = {
  filledCourts: number
  benched: number
}

export type StatisticsSnapshot = {
  id: string
  sessionId: string
  sessionDate: string
  season: string
  matches: Match[]
  matchPlayers: MatchPlayer[]
  checkIns: CheckIn[]
  matchResults?: MatchResult[] // Optional for backward compatibility
  createdAt: string
}

export type PlayerMatchResult = {
  matchId: string
  date: string
  sessionId: string
  opponentNames: string[] // Modstandere eller makkere (deprecated: use partnerNames and opponentNames separately)
  wasPartner: boolean // True hvis makkere (samme team), false hvis modstandere (deprecated: use partnerNames.length > 0)
  partnerNames?: string[] // Makkere (spillere på samme hold)
  opponentNamesSeparate?: string[] // Modstandere (spillere på modstanderens hold)
  won?: boolean // Optional - only present if match has result
  scoreData?: BadmintonScoreData | TennisScoreData | PadelScoreData // Optional - only present if match has result
  sport?: 'badminton' | 'tennis' | 'padel' // Optional - only present if match has result
}

export type HeadToHeadResult = {
  matchId: string
  date: string
  sessionId: string
  player1Won: boolean // True hvis playerId1 vandt
  player1Team: 'team1' | 'team2'
  player2Team: 'team1' | 'team2'
  scoreData: BadmintonScoreData | TennisScoreData | PadelScoreData
  sport: 'badminton' | 'tennis' | 'padel'
  wasPartner: boolean // True hvis de spillede sammen, false hvis mod hinanden
}

export type PlayerComparison = {
  partnerCount: number
  opponentCount: number
  headToHeadMatches: HeadToHeadResult[] // Alle kampresultater mellem de to spillere
  player1Wins: number // Antal gange playerId1 vandt mod playerId2
  player2Wins: number // Antal gange playerId2 vandt mod playerId1
}

export type PlayerStatistics = {
  playerId: string
  totalCheckIns: number
  checkInsBySeason: Record<string, number>
  totalMatches: number
  matchesBySeason: Record<string, number>
  partners: Array<{ playerId: string; count: number; names: string }>
  opponents: Array<{ playerId: string; count: number; names: string }>
  preferredCategory: 'Single' | 'Double' | 'Mixed' | null
  averageLevelDifference: number | null
  mostPlayedCourt: number | null
  lastPlayedDate: string | null
  // Match result statistics
  totalWins: number
  totalLosses: number
  winRate: number // percentage (0-100)
  matchesWithResults: number
  averageScoreDifference: number | null
  winsBySeason: Record<string, number>
  lossesBySeason: Record<string, number>
  recentMatches: PlayerMatchResult[] // Seneste 5 resultater med detaljer
}

export type StatisticsFilters = {
  playerId?: string
  season?: string
  dateFrom?: string
  dateTo?: string
}

export type TrainingGroupAttendance = {
  groupName: string
  checkInCount: number
  uniquePlayers: number
  sessions: number
  averageAttendance: number
}

export type WeekdayAttendance = {
  weekday: number // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  weekdayName: string // e.g., "Mandag", "Tirsdag"
  checkInCount: number
  uniquePlayers: number
  sessions: number
  averageAttendance: number
}

export type PlayerCheckInLongTail = {
  playerId: string
  playerName: string
  checkInCount: number
}

export type WeekdayAttendanceOverTime = {
  date: string // ISO date string
  weekday: number // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  weekdayName: string
  checkInCount: number
  averageAttendance: number
}

export type TrainingDayComparison = {
  day1: {
    weekday: number
    weekdayName: string
    checkInCount: number
    uniquePlayers: number
    sessions: number
    averageAttendance: number
  }
  day2: {
    weekday: number
    weekdayName: string
    checkInCount: number
    uniquePlayers: number
    sessions: number
    averageAttendance: number
  }
  difference: {
    checkInCount: number // day1 - day2
    averageAttendance: number // day1 - day2
    percentageDifference: number // ((day1 - day2) / day2) * 100
  }
}

export type TenantConfig = {
  id: string
  name: string
  subdomain: string // Subdomain for tenant (e.g., "herlev-hjorten" for herlev-hjorten.rundeklar.dk)
  logo: string
  maxCourts: number
  sport?: 'badminton' | 'tennis' | 'padel' // Default: 'badminton'
  planId?: 'basic' | 'professional' | 'enterprise' // Subscription plan type
  postgresUrl?: string // Postgres connection string (optional - can use DATABASE_URL env var)
  // Legacy Supabase fields (deprecated, kept for backward compatibility during migration)
  supabaseUrl?: string
  supabaseKey?: string
  features?: {
    [key: string]: boolean | string | number
  }
  deleted?: boolean // Soft delete flag
  deletedAt?: string // Deletion timestamp
}

export type RendererApi = {
  players: {
    list(filters?: PlayerListFilters): Promise<Player[]>
    create(input: PlayerCreateInput): Promise<Player>
    update(input: PlayerUpdateInput): Promise<Player>
  }
  session: {
    startOrGetActive(): Promise<TrainingSession>
    endActive(): Promise<void>
    getActive(): Promise<TrainingSession | null>
  }
  checkIns: {
    add(input: { playerId: string; maxRounds?: number }): Promise<CheckIn>
    remove(input: { playerId: string }): Promise<void>
    listActive(): Promise<CheckedInPlayer[]>
  }
  matches: {
    autoArrange(round?: number): Promise<AutoArrangeResult>
    list(round?: number): Promise<CourtWithPlayers[]>
    reset(): Promise<void>
    move(payload: MatchMovePayload, round?: number): Promise<void>
  }
}
