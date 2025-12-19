import React, { useState, useEffect, useCallback } from 'react'
import { PageCard } from '../../components/ui'
import { Button } from '../../components/ui'
import { formatCoachUsername } from '../../lib/formatting'
import CreateCoachFormForSysAdmin from '../../components/admin/CreateCoachFormForSysAdmin'
import { Trash2, RotateCcw, Clock, Building2, Plus } from 'lucide-react'
import { logger } from '../../lib/utils/logger'

interface Coach {
  id: string
  email: string
  username: string
  role: string
  emailVerified: boolean
  createdAt: string
  lastLogin: string | null
  tenantId: string
  tenantName?: string
}

export default function AllCoachesPage() {
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())
  const [resettingIds, setResettingIds] = useState<Set<string>>(new Set())
  const [showCreateForm, setShowCreateForm] = useState(false)

  const fetchCoaches = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const token = localStorage.getItem('auth_access_token')
      
      if (!token) {
        throw new Error('Ikke logget ind. Log venligst ind igen.')
      }
      
      const apiUrl = import.meta.env.DEV 
        ? 'http://127.0.0.1:3000/api/admin/coaches'
        : '/api/admin/coaches'
      
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        cache: 'no-store' // Prevent caching
      })

      // Check content type before parsing
      const contentType = response.headers.get('content-type')
      const isJson = contentType?.includes('application/json')

      if (!response.ok) {
        if (isJson) {
          const errorData = await response.json()
          throw new Error(errorData.error || `Failed to fetch coaches (${response.status})`)
        } else {
          // Response is HTML (404 page, etc.)
          throw new Error(`API endpoint not found (${response.status}). Please ensure the API server is running and has been restarted.`)
        }
      }

      if (!isJson) {
        throw new Error('API returned non-JSON response. Please check that the API server is running.')
      }

      const data = await response.json()
      setCoaches(data.coaches || [])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load coaches'
      logger.error('Failed to fetch coaches', err)
      setError(errorMessage)
      setCoaches([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCoaches()
  }, [fetchCoaches])

  const handleDeleteCoach = async (coachId: string, tenantId: string) => {
    if (!confirm('Er du sikker på, at du vil slette denne træner?')) {
      return
    }

    try {
      setDeletingIds(prev => new Set(prev).add(coachId))
      const token = localStorage.getItem('auth_access_token')
      const apiUrl = import.meta.env.DEV 
        ? `http://127.0.0.1:3000/api/${tenantId}/admin/coaches/${coachId}`
        : `/api/${tenantId}/admin/coaches/${coachId}`
      
      const response = await fetch(apiUrl, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        const contentType = response.headers.get('content-type')
        const isJson = contentType?.includes('application/json')
        
        if (isJson) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to delete coach')
        } else {
          throw new Error(`Failed to delete coach (${response.status})`)
        }
      }

      await fetchCoaches()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete coach')
    } finally {
      setDeletingIds(prev => {
        const next = new Set(prev)
        next.delete(coachId)
        return next
      })
    }
  }

  const handleResetPIN = async (coachId: string, tenantId: string) => {
    try {
      setResettingIds(prev => new Set(prev).add(coachId))
      const token = localStorage.getItem('auth_access_token')
      const apiUrl = import.meta.env.DEV 
        ? `http://127.0.0.1:3000/api/${tenantId}/admin/coaches/${coachId}`
        : `/api/${tenantId}/admin/coaches/${coachId}`
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'reset-pin' })
      })

      if (!response.ok) {
        const contentType = response.headers.get('content-type')
        const isJson = contentType?.includes('application/json')
        
        if (isJson) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to reset PIN')
        } else {
          throw new Error(`Failed to reset PIN (${response.status})`)
        }
      }

      const data = await response.json()
      alert(`PIN nulstillet. Ny PIN: ${data.pin}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset PIN')
    } finally {
      setResettingIds(prev => {
        const next = new Set(prev)
        next.delete(coachId)
        return next
      })
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('da-DK', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  return (
    <PageCard>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-[hsl(var(--foreground))]">
              Alle Trænere
            </h2>
            <p className="text-sm text-[hsl(var(--muted))] mt-1">
              Oversigt over alle trænere på tværs af tenants
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchCoaches}
              disabled={loading}
            >
              Opdater
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {showCreateForm ? 'Annuller' : 'Opret træner'}
            </Button>
          </div>
        </div>

        {showCreateForm && (
          <div className="mb-6">
            <CreateCoachFormForSysAdmin
              onSuccess={() => {
                setShowCreateForm(false)
                fetchCoaches()
              }}
              onCancel={() => setShowCreateForm(false)}
            />
          </div>
        )}

        {error && (
          <div className="p-4 rounded-lg bg-[hsl(var(--destructive)/.1)] border border-[hsl(var(--destructive)/.2)]">
            <p className="text-sm text-[hsl(var(--destructive))]">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="text-center py-8 text-[hsl(var(--muted))]">
            Indlæser trænere...
          </div>
        ) : coaches.length === 0 ? (
          <div className="text-center py-8 text-[hsl(var(--muted))]">
            Ingen trænere fundet
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[hsl(var(--line)/.12)]">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-[hsl(var(--foreground))]">
                    Tenant
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-[hsl(var(--foreground))]">
                    Email
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-[hsl(var(--foreground))]">
                    Brugernavn
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-[hsl(var(--foreground))]">
                    Oprettet
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-[hsl(var(--foreground))]">
                    Sidste login
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-[hsl(var(--foreground))]">
                    Status
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-[hsl(var(--foreground))]">
                    Handling
                  </th>
                </tr>
              </thead>
              <tbody>
                {coaches.map((coach) => (
                  <tr
                    key={coach.id}
                    className="border-b border-[hsl(var(--line)/.08)] hover:bg-[hsl(var(--surface-2)/.5)] transition-colors"
                  >
                    <td className="py-3 px-4 text-sm text-[hsl(var(--foreground))]">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-[hsl(var(--muted))]" />
                        {coach.tenantName || coach.tenantId}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-[hsl(var(--foreground))]">
                      {coach.email}
                    </td>
                    <td className="py-3 px-4 text-sm text-[hsl(var(--foreground))]">
                      {formatCoachUsername(coach.username)}
                    </td>
                    <td className="py-3 px-4 text-sm text-[hsl(var(--foreground))]">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3 text-[hsl(var(--muted))]" />
                        {formatDate(coach.createdAt)}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-[hsl(var(--foreground))]">
                      {coach.lastLogin ? formatDate(coach.lastLogin) : 'Aldrig'}
                    </td>
                    <td className="py-3 px-4">
                      {coach.emailVerified ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[hsl(var(--success)/.1)] text-[hsl(var(--success))]">
                          Verificeret
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[hsl(var(--warning)/.1)] text-[hsl(var(--warning))]">
                          Ikke verificeret
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleResetPIN(coach.id, coach.tenantId)}
                          disabled={resettingIds.has(coach.id)}
                          className="p-2 rounded-md text-[hsl(var(--muted))] hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/.1)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Nulstil PIN"
                        >
                          {resettingIds.has(coach.id) ? (
                            <Clock className="w-4 h-4 animate-spin" />
                          ) : (
                            <RotateCcw className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDeleteCoach(coach.id, coach.tenantId)}
                          disabled={deletingIds.has(coach.id)}
                          className="p-2 rounded-md text-[hsl(var(--muted))] hover:text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/.1)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Slet træner"
                        >
                          {deletingIds.has(coach.id) ? (
                            <Clock className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageCard>
  )
}

