import { describe, expect, it } from 'vitest'
import { buildAssignments, chunkPlayers } from '../src/lib/matchmaker'

describe('chunkPlayers', () => {
  it('splits players into equal chunks', () => {
    const players = ['a', 'b', 'c', 'd', 'e']
    expect(chunkPlayers(players, 2)).toEqual([
      ['a', 'b'],
      ['c', 'd'],
      ['e']
    ])
  })

  it('returns empty array when size is invalid', () => {
    expect(chunkPlayers(['a'], 0)).toEqual([])
  })
})

describe('buildAssignments', () => {
  it('assigns four players to first available court', () => {
    const result = buildAssignments({
      benchPlayerIds: ['p1', 'p2', 'p3', 'p4'],
      availableCourtIdxs: [1, 2]
    })
    expect(result.assignments).toEqual([
      { courtIdx: 1, playerIds: ['p1', 'p2', 'p3', 'p4'] }
    ])
    expect(result.leftoverPlayerIds).toEqual([])
  })

  it('leaves leftovers when players exceed court capacity', () => {
    const result = buildAssignments({
      benchPlayerIds: ['p1', 'p2', 'p3', 'p4', 'p5'],
      availableCourtIdxs: [1]
    })
    expect(result.assignments).toHaveLength(1)
    expect(result.leftoverPlayerIds).toEqual(['p5'])
  })

  it('respects available court list', () => {
    const result = buildAssignments({
      benchPlayerIds: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'],
      availableCourtIdxs: [3]
    })
    expect(result.assignments).toEqual([
      { courtIdx: 3, playerIds: ['a', 'b', 'c', 'd'] }
    ])
    expect(result.leftoverPlayerIds).toEqual(['e', 'f', 'g', 'h'])
  })

  it('handles many players across multiple courts', () => {
    const players = Array.from({ length: 33 }, (_, index) => `p${index}`)
    const result = buildAssignments({
      benchPlayerIds: players,
      availableCourtIdxs: [1, 2, 3, 4, 5, 6, 7, 8]
    })
    expect(result.assignments).toHaveLength(8)
    expect(result.leftoverPlayerIds).toEqual(['p32'])
  })
})
