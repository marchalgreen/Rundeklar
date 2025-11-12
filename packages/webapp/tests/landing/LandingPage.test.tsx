import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import LandingPage from '../../src/routes/LandingPage'

// Basic network/api stubs through the service adapter
vi.mock('../../src/services/coachLandingApi', () => {
  return {
    default: {
      fetchTrainingGroups: vi.fn(async () => ([
        { id: 'Senior A', name: 'Senior A', color: null, playersCount: 10, lastSessionAt: null },
        { id: 'Senior B', name: 'Senior B', color: null, playersCount: 8, lastSessionAt: null }
      ])),
      getActiveForCoach: vi.fn(async () => null),
      searchPlayers: vi.fn(async ({ q }: { q?: string }) => {
        if (!q) return []
        return [{ id: 'p1', displayName: 'Alice', groupId: 'Senior A', active: true }]
      }),
      startSession: vi.fn(async () => ({ sessionId: 's1', startedAt: new Date().toISOString(), groupId: 'Senior A' }))
    }
  }
})

describe('LandingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders groups', async () => {
    render(<LandingPage />)
    expect(await screen.findByText('Senior A')).toBeInTheDocument()
    expect(screen.getByText('Senior B')).toBeInTheDocument()
  })

  it('enables start after selecting a group', async () => {
    render(<LandingPage />)
    const group = await screen.findByText('Senior A')
    fireEvent.click(group)
    const start = screen.getByRole('button', { name: /Start session/i })
    expect(start).not.toBeDisabled()
  })

  it('opens search and picks a cross-group player', async () => {
    render(<LandingPage />)
    // open modal
    const open = await screen.findByRole('button', { name: /Søg spillere på tværs/i })
    fireEvent.click(open)
    const input = await screen.findByPlaceholderText('Søg spillere på tværs af grupper')
    fireEvent.change(input, { target: { value: 'A' } })
    // minimal wait for debounce not simulated; adapter returns immediately
    const add = await screen.findByRole('button', { name: /Tilføj/i })
    fireEvent.click(add)
    // chip visible in controls
    expect(screen.getByText('Alice')).toBeInTheDocument()
  })

  it('starts session with redirect callback', async () => {
    const onRedirect = vi.fn()
    render(<LandingPage onRedirectToCheckin={onRedirect} />)
    const group = await screen.findByText('Senior A')
    fireEvent.click(group)
    const start = screen.getByRole('button', { name: /Start session/i })
    fireEvent.click(start)
    // Allow state microtasks to flush
    await screen.findByText(/Ekstra spillere:/i)
    expect(onRedirect).toHaveBeenCalledWith('s1')
  })
})

