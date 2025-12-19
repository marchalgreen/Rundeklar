import { playersApi } from './players'
import { sessionApi } from './session'
import { checkInsApi } from './checkIns'
import { matchesApi } from './matches'
import { matchResultsApi } from './matchResults'
import { databaseApi } from './database'

/** Main API client — exports all API modules. */
const api = {
  players: playersApi,
  session: sessionApi,
  checkIns: checkInsApi,
  matches: matchesApi,
  matchResults: matchResultsApi,
  database: databaseApi
}

export default api
