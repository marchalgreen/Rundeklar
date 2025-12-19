#!/usr/bin/env tsx
/// <reference types="node" />
/**
 * Generate dummy statistics data script.
 * 
 * This script generates realistic historical statistics data (sessions, matches, check-ins, match results)
 * for a specified tenant. This is useful for demo purposes.
 * 
 * Usage:
 *   pnpm exec tsx packages/webapp/scripts/generate-dummy-statistics.ts [tenant-id]
 * 
 * Examples:
 *   pnpm exec tsx packages/webapp/scripts/generate-dummy-statistics.ts rundemanager
 *   pnpm exec tsx packages/webapp/scripts/generate-dummy-statistics.ts demo
 * 
 * WARNING: This will add historical data to the database. It does NOT clear existing data.
 */

import postgres from 'postgres'
import { loadTenantConfig } from '../src/lib/tenant'
import { setCurrentTenantConfig } from '../src/lib/postgres'
import type { BadmintonScoreData, Player, Match, MatchPlayer, CheckIn } from '@rundeklar/common'

/**
 * Generates a unique ID (UUID).
 */
function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

/**
 * Determines season from a date string (August to July).
 */
const getSeasonFromDate = (dateStr: string): string => {
  const date = new Date(dateStr)
  const month = date.getMonth() + 1 // 1-12 (Jan=1, Dec=12)
  const year = date.getFullYear()
  
  if (month >= 8) {
    return `${year}-${year + 1}`
  } else {
    return `${year - 1}-${year}`
  }
}

/**
 * Gets the next Tuesday or Thursday from a given date.
 * Returns the date if it's already Tuesday or Thursday.
 */
function getNextTrainingDay(date: Date): Date {
  const dayOfWeek = date.getDay() // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const result = new Date(date)
  
  // If it's Tuesday (2) or Thursday (4), return as-is
  if (dayOfWeek === 2 || dayOfWeek === 4) {
    return result
  }
  
  // Otherwise, find the next Tuesday or Thursday
  if (dayOfWeek === 0) { // Sunday
    result.setDate(result.getDate() + 2) // Tuesday
  } else if (dayOfWeek === 1) { // Monday
    result.setDate(result.getDate() + 1) // Tuesday
  } else if (dayOfWeek === 3) { // Wednesday
    result.setDate(result.getDate() + 1) // Thursday
  } else if (dayOfWeek === 5) { // Friday
    result.setDate(result.getDate() + 3) // Monday -> Tuesday
  } else if (dayOfWeek === 6) { // Saturday
    result.setDate(result.getDate() + 3) // Tuesday
  }
  
  return result
}

/**
 * Generates realistic badminton scores following validation rules.
 * Rules:
 * - Maximum score: 30
 * - Minimum winning score: 21
 * - Minimum score difference: 2 points (except 30-29 is valid)
 * - Valid scores: 21-19, 22-20, 23-21, ..., 29-27, 30-29
 * - Invalid scores: 21-20, 22-21, 31-29 (not enough difference)
 * - 40% of matches are 3-set matches
 */
function generateBadmintonScore(): BadmintonScoreData {
  // Determine if 2-set or 3-set match (60% chance of 2-set, 40% chance of 3-set)
  const isThreeSet = Math.random() < 0.4
  
  // Helper to generate valid losing score (ensuring 2+ point difference)
  function generateLosingScore(winningScore: number): number {
    if (winningScore === 30) return 29 // Special case: 30-29 is valid
    
    // Ensure at least 2 point difference, max losing score is winningScore - 2
    const maxLosing = winningScore - 2
    
    // Realistic losing scores: between 15-20 for 21, or winningScore-2 for higher
    const minLosing = winningScore === 21 ? 15 : Math.max(15, winningScore - 5)
    const actualMaxLosing = Math.min(maxLosing, winningScore === 21 ? 20 : maxLosing)
    
    return Math.floor(Math.random() * (actualMaxLosing - minLosing + 1)) + minLosing
  }
  
  // Helper to generate winning score (usually 21, sometimes 22-30)
  function generateWinningScore(): number {
    if (Math.random() < 0.05) {
      // 5% chance of special scores (22-30)
      return 21 + Math.floor(Math.random() * 9) + 1 // 22-30
    }
    return 21
  }
  
  if (isThreeSet) {
    // 3-set match: team1 wins first, team2 wins second, team1 wins third
    const set1Winner = generateWinningScore()
    const set1Loser = generateLosingScore(set1Winner)
    
    const set2Winner = generateWinningScore()
    const set2Loser = generateLosingScore(set2Winner)
    
    const set3Winner = generateWinningScore()
    const set3Loser = generateLosingScore(set3Winner)
    
    return {
      sets: [
        { team1: set1Winner, team2: set1Loser },
        { team1: set2Loser, team2: set2Winner },
        { team1: set3Winner, team2: set3Loser }
      ],
      winner: 'team1'
    }
  } else {
    // 2-set match
    const team1Wins = Math.random() < 0.5
    const set1Winner = generateWinningScore()
    const set1Loser = generateLosingScore(set1Winner)
    
    const set2Winner = generateWinningScore()
    const set2Loser = generateLosingScore(set2Winner)
    
    return {
      sets: team1Wins 
        ? [
            { team1: set1Winner, team2: set1Loser },
            { team1: set2Winner, team2: set2Loser }
          ]
        : [
            { team1: set1Loser, team2: set1Winner },
            { team1: set2Loser, team2: set2Winner }
          ],
      winner: team1Wins ? 'team1' : 'team2'
    }
  }
}

/**
 * Gets attendance rate for a training group.
 */
function getGroupAttendanceRate(groupName: string): { min: number; max: number } {
  if (groupName === 'Senior A') {
    return { min: 0.70, max: 0.85 }
  } else if (groupName === 'U17') {
    return { min: 0.60, max: 0.75 }
  } else if (groupName === 'U15') {
    return { min: 0.50, max: 0.70 }
  }
  // Default for other groups
  return { min: 0.55, max: 0.75 }
}

/**
 * Generates dummy historical data for demo purposes.
 */
async function generateDummyHistoricalData(sql: ReturnType<typeof postgres>, tenantId: string) {
  // Fetch active players
  const playersData = await sql`
    SELECT id, name, training_group, active
    FROM players
    WHERE tenant_id = ${tenantId} AND active = true
    ORDER BY name
  `
  
  const players: Player[] = playersData.map((row: any) => ({
    id: row.id,
    name: row.name,
    trainingGroups: row.training_group || [],
    active: row.active,
    // Other required fields with defaults
    alias: null,
    level: null,
    levelSingle: null,
    levelDouble: null,
    levelMix: null,
    gender: null,
    primaryCategory: null,
    preferredDoublesPartners: null,
    preferredMixedPartners: null,
    createdAt: new Date().toISOString()
  }))
  
  if (players.length < 8) {
    throw new Error('Mindst 8 aktive spillere kræves for at generere dummy data')
  }

  // Fetch courts
  const courtsData = await sql`
    SELECT id, idx
    FROM courts
    WHERE tenant_id = ${tenantId}
    ORDER BY idx
  `
  const courts = courtsData.map((row: any) => ({
    id: row.id,
    idx: row.idx
  }))

  const now = new Date()
  
  // Generate sessions for the past 1.5 seasons (about 18 months)
  // Normalize: equal amount of data for current and previous season
  const sessions: Array<{ date: string; season: string }> = []
  const monthsToGenerate = 18
  
  // Start from 18 months ago
  const startDate = new Date(now)
  startDate.setMonth(startDate.getMonth() - monthsToGenerate)
  
  // Find first training day (Tuesday or Thursday)
  let currentDate = getNextTrainingDay(startDate)
  
  // Track sessions per month for normalization
  const sessionsPerMonth = new Map<string, number>()
  
  // Generate sessions until now
  while (currentDate <= now) {
    // Skip ~10% of weeks (holidays, breaks)
    if (Math.random() > 0.1) {
      const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`
      const count = sessionsPerMonth.get(monthKey) || 0
      
      // Normalize: max 8 sessions per month per season
      if (count < 8) {
        const hour = 18 + Math.floor(Math.random() * 3) // 18-20 (6-8 PM)
        const minute = Math.floor(Math.random() * 4) * 15 // 0, 15, 30, 45
        const sessionDate = new Date(currentDate)
        sessionDate.setHours(hour, minute, 0, 0)
        
        const season = getSeasonFromDate(sessionDate.toISOString())
        sessions.push({
          date: sessionDate.toISOString(),
          season
        })
        
        sessionsPerMonth.set(monthKey, count + 1)
      }
    }
    
    // Move to next training day (alternate between Tuesday and Thursday)
    const dayOfWeek = currentDate.getDay()
    if (dayOfWeek === 2) { // Tuesday
      currentDate.setDate(currentDate.getDate() + 2) // Thursday
    } else { // Thursday
      currentDate.setDate(currentDate.getDate() + 5) // Next Tuesday
    }
  }

  // Sort sessions by date
  sessions.sort((a, b) => a.date.localeCompare(b.date))

  console.log(`📅 Generating ${sessions.length} sessions...`)

  // Categorize players by activity level
  // Core players: 80-90% attendance
  // Casual players: 30-50% attendance
  const corePlayerCount = Math.floor(players.length * 0.4) // 40% core players
  const corePlayers = players.slice(0, corePlayerCount)
  const casualPlayers = players.slice(corePlayerCount)
  
  // Track player check-in history for realistic patterns
  const playerCheckInHistory = new Map<string, number>()
  players.forEach(p => playerCheckInHistory.set(p.id, 0))

  // Process each session and create in Postgres
  let sessionCount = 0
  let matchResultCount = 0
  
  for (const sessionInfo of sessions) {
    sessionCount++
    if (sessionCount % 10 === 0) {
      console.log(`   Progress: ${sessionCount}/${sessions.length} sessions...`)
    }

    const sessionDate = new Date(sessionInfo.date)
      
    // Create ended session in Postgres
    const [session] = await sql`
      INSERT INTO training_sessions (id, date, status, tenant_id, created_at)
      VALUES (${createId()}, ${sessionInfo.date}, 'ended', ${tenantId}, NOW())
      RETURNING id, date, status, created_at
    `
    const sessionId = session.id

    // Determine which players check in based on training groups and activity levels
    const checkedInPlayers: Player[] = []
    
    // Group players by training group
    const playersByGroup = new Map<string, Player[]>()
    players.forEach(player => {
      const groups = player.trainingGroups || []
      groups.forEach(group => {
        if (!playersByGroup.has(group)) {
          playersByGroup.set(group, [])
        }
        playersByGroup.get(group)!.push(player)
      })
    })
    
    // Select players based on group attendance rates
    for (const [groupName, groupPlayers] of playersByGroup.entries()) {
      const attendanceRate = getGroupAttendanceRate(groupName)
      const targetAttendance = Math.floor(groupPlayers.length * (attendanceRate.min + Math.random() * (attendanceRate.max - attendanceRate.min)))
      
      // Shuffle and select players
      const shuffled = [...groupPlayers].sort(() => Math.random() - 0.5)
      const selected = shuffled.slice(0, Math.min(targetAttendance, groupPlayers.length))
      
      // Apply activity level bias: core players more likely to attend
      selected.forEach(player => {
        const isCore = corePlayers.includes(player)
        const shouldAttend = isCore 
          ? Math.random() < 0.85 // Core players 85% chance
          : Math.random() < 0.40 // Casual players 40% chance
        
        if (shouldAttend && !checkedInPlayers.find(p => p.id === player.id)) {
          checkedInPlayers.push(player)
          playerCheckInHistory.set(player.id, (playerCheckInHistory.get(player.id) || 0) + 1)
        }
      })
    }
    
    // Ensure at least some players check in
    if (checkedInPlayers.length < 8) {
      // Add more players if needed
      const remaining = players.filter(p => !checkedInPlayers.find(cp => cp.id === p.id))
      const needed = 8 - checkedInPlayers.length
      const additional = remaining.slice(0, needed)
      additional.forEach(player => {
        checkedInPlayers.push(player)
        playerCheckInHistory.set(player.id, (playerCheckInHistory.get(player.id) || 0) + 1)
      })
    }

    // Create check-ins in Postgres
    const checkIns: CheckIn[] = []
    for (const player of checkedInPlayers) {
      const [checkIn] = await sql`
        INSERT INTO check_ins (id, session_id, player_id, max_rounds, tenant_id, created_at)
        VALUES (${createId()}, ${sessionId}, ${player.id}, NULL, ${tenantId}, NOW())
        RETURNING id, session_id, player_id, max_rounds, created_at, notes
      `
      checkIns.push({
        id: checkIn.id,
        sessionId: checkIn.session_id,
        playerId: checkIn.player_id,
        maxRounds: checkIn.max_rounds,
        createdAt: checkIn.created_at,
        notes: checkIn.notes ?? null
      })
    }

    // Generate 2 rounds on average (1-3 rounds per session)
    const roundsPerSession = Math.floor(Math.random() * 3) + 1 // 1-3 rounds, average ~2
    const allMatches: Match[] = []
    const allMatchPlayers: MatchPlayer[] = []
    
    // Track how many matches each player has been assigned to in this session
    const playerMatchCount = new Map<string, number>()
    checkedInPlayers.forEach((p) => playerMatchCount.set(p.id, 0))
    
    // Target: ~1.7 matches per player per session
    const targetPlayerSlots = Math.round(checkedInPlayers.length * 1.7)
    const avgPlayersPerMatch = 3 // Mix of 1v1 and 2v2 averages to ~3
    const neededMatches = Math.ceil(targetPlayerSlots / avgPlayersPerMatch)
    const courtsPerRound = Math.ceil(neededMatches / roundsPerSession)

    for (let roundNum = 1; roundNum <= roundsPerSession; roundNum++) {
      const courtCount = Math.min(
        Math.max(courtsPerRound, Math.floor(Math.random() * 3) + 5), // At least courtsPerRound, but 5-7 if possible
        courts.length,
        Math.floor(checkedInPlayers.length / 2)
      )
      const usedCourts = courts.slice(0, courtCount)
      const matches: Match[] = []
      const matchPlayers: MatchPlayer[] = []
      
      // Sort players by match count (fewer matches first) to ensure fair distribution
      const sortedPlayers = [...checkedInPlayers].sort((a, b) => {
        const countA = playerMatchCount.get(a.id) ?? 0
        const countB = playerMatchCount.get(b.id) ?? 0
        return countA - countB
      })

      usedCourts.forEach((court, courtIndex) => {
        const matchId = createId()
        const matchStart = new Date(sessionDate)
        matchStart.setMinutes(matchStart.getMinutes() + (roundNum - 1) * 45 + courtIndex * 5)
        const matchEnd = new Date(matchStart.getTime() + 45 * 60000)
        
        matches.push({
          id: matchId,
          sessionId,
          courtId: court.id,
          startedAt: matchStart.toISOString(),
          endedAt: matchEnd.toISOString(),
          round: roundNum
        })

        // Re-sort players before each court
        sortedPlayers.sort((a, b) => {
          const countA = playerMatchCount.get(a.id) ?? 0
          const countB = playerMatchCount.get(b.id) ?? 0
          return countA - countB
        })

        if (sortedPlayers.length < 2) return

        const currentAvgMatches = Array.from(playerMatchCount.values()).reduce((a, b) => a + b, 0) / checkedInPlayers.length
        const needsMoreMatches = currentAvgMatches < 1.7
        
        // 60% doubles, 40% singles
        const isDoubles = sortedPlayers.length >= 4 && (needsMoreMatches || Math.random() < 0.6)
        
        if (isDoubles && sortedPlayers.length >= 4) {
          // 2v2 match
          const selectedPlayers = sortedPlayers.slice(0, 4)
          
          selectedPlayers.forEach((player, index) => {
            playerMatchCount.set(player.id, (playerMatchCount.get(player.id) ?? 0) + 1)
            matchPlayers.push({
              id: createId(),
              matchId,
              playerId: player.id,
              slot: index + 1
            })
          })
        } else {
          // 1v1 match
          const selectedPlayers = sortedPlayers.slice(0, 2)
          
          selectedPlayers.forEach((player) => {
            playerMatchCount.set(player.id, (playerMatchCount.get(player.id) ?? 0) + 1)
          })
          matchPlayers.push({
            id: createId(),
            matchId,
            playerId: selectedPlayers[0].id,
            slot: 1
          })
          matchPlayers.push({
            id: createId(),
            matchId,
            playerId: selectedPlayers[1].id,
            slot: 2
          })
        }
      })

      allMatches.push(...matches)
      allMatchPlayers.push(...matchPlayers)
    }

    // Insert matches and match players
    if (allMatches.length > 0) {
      await sql`
        INSERT INTO matches ${sql(allMatches.map(m => ({
          id: m.id,
          session_id: m.sessionId,
          court_id: m.courtId,
          started_at: m.startedAt,
          ended_at: m.endedAt,
          round: m.round,
          tenant_id: tenantId
        })))}
      `
      
      await sql`
        INSERT INTO match_players ${sql(allMatchPlayers.map(mp => ({
          id: mp.id,
          match_id: mp.matchId,
          player_id: mp.playerId,
          slot: mp.slot,
          tenant_id: tenantId
        })))}
      `
    }

    // Create match results for ~70% of matches
    for (const match of allMatches) {
      if (Math.random() < 0.7) {
        const scoreData = generateBadmintonScore()
        
        // Determine winner based on match players
        const matchPlayersForMatch = allMatchPlayers.filter(mp => mp.matchId === match.id)
        const team1Players = matchPlayersForMatch.filter(mp => mp.slot === 1 || mp.slot === 2).map(mp => mp.playerId)
        const team2Players = matchPlayersForMatch.filter(mp => mp.slot === 3 || mp.slot === 4).map(mp => mp.playerId)
        
        // If no team2 players (singles), team2 is slot 2
        if (team2Players.length === 0) {
          const slot2Player = matchPlayersForMatch.find(mp => mp.slot === 2)
          if (slot2Player) {
            team2Players.push(slot2Player.playerId)
          }
        }
        
        const winnerTeam = scoreData.winner
        
        await sql`
          INSERT INTO match_results (match_id, sport, score_data, winner_team, tenant_id)
          VALUES (
            ${match.id},
            'badminton',
            ${JSON.stringify(scoreData)}::jsonb,
            ${winnerTeam},
            ${tenantId}
          )
          ON CONFLICT (match_id, tenant_id) DO UPDATE SET
            sport = EXCLUDED.sport,
            score_data = EXCLUDED.score_data,
            winner_team = EXCLUDED.winner_team,
            updated_at = NOW()
        `
        
        matchResultCount++
      }
    }

    // Create snapshot in Postgres
    await sql`
      INSERT INTO statistics_snapshots (
        id, session_id, session_date, season, matches, match_players, check_ins, tenant_id, created_at
      )
      VALUES (
        ${createId()},
        ${sessionId},
        ${sessionInfo.date},
        ${sessionInfo.season},
        ${JSON.stringify(allMatches)},
        ${JSON.stringify(allMatchPlayers)},
        ${JSON.stringify(checkIns)},
        ${tenantId},
        NOW()
      )
    `
  }

  console.log('')
  console.log('🎉 Dummy statistics data generation completed!')
  console.log('')
  console.log('📊 Summary:')
  console.log(`   - Sessions created: ${sessions.length}`)
  console.log(`   - Active players used: ${players.length}`)
  console.log(`   - Match results created: ${matchResultCount}`)
  console.log('')
}

/**
 * Main function to generate dummy statistics for a tenant.
 */
async function generateDummyStatistics() {
  const tenantId = process.argv[2] || 'rundemanager'
  
  if (tenantId === 'default') {
    console.error('❌ Error: Cannot generate dummy data for "default" tenant (HerlevHjorten)')
    console.error('   This script is intended for demo tenants only.')
    console.error('   Use: pnpm exec tsx packages/webapp/scripts/generate-dummy-statistics.ts rundemanager')
    process.exit(1)
  }
  
  console.log(`📊 Starting dummy statistics generation for tenant: ${tenantId}...`)

  try {
    // Load tenant config
    const config = await loadTenantConfig(tenantId)
    
    if (!config.postgresUrl) {
      console.error('❌ Tenant config is missing Postgres connection string.')
      console.error(`Please update packages/webapp/src/config/tenants/${tenantId}.json with your Postgres postgresUrl,`)
      console.error(`or set DATABASE_URL environment variable.`)
      process.exit(1)
    }

    // Create Postgres client
    const sql = postgres(config.postgresUrl, {
      ssl: 'require',
      max: 1
    })
    
    setCurrentTenantConfig(config)

    // Test connection
    console.log('🔌 Testing Postgres connection...')
    await sql`SELECT 1`
    console.log('✅ Connected to Postgres')

    // Check active players
    const playersData = await sql`
      SELECT id
      FROM players
      WHERE tenant_id = ${tenantId} AND active = true
    `

    const activePlayerCount = playersData.length
    console.log(`👥 Found ${activePlayerCount} active players`)

    if (activePlayerCount < 8) {
      console.error('❌ Error: At least 8 active players are required to generate dummy data')
      console.error(`   Current active players: ${activePlayerCount}`)
      process.exit(1)
    }

    // Generate dummy data
    await generateDummyHistoricalData(sql, tenantId)
    
    await sql.end()
    
  } catch (error) {
    console.error('❌ Error generating dummy statistics:', error)
    process.exit(1)
  }
}

// Run the generation
generateDummyStatistics()
