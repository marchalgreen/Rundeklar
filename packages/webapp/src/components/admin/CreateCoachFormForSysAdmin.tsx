import React, { useState, useEffect } from 'react'
import { Button } from '../ui'
import { generateRandomPIN } from '../../lib/auth/pin'

interface Tenant {
  id: string
  name: string
  subdomain: string
}

interface CreateCoachFormForSysAdminProps {
  onSuccess: () => void
  onCancel: () => void
}

export default function CreateCoachFormForSysAdmin({ onSuccess, onCancel }: CreateCoachFormForSysAdminProps) {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [selectedTenantId, setSelectedTenantId] = useState<string>('')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [pin, setPin] = useState('')
  const [autoGeneratePIN, setAutoGeneratePIN] = useState(true)
  const [sendEmail, setSendEmail] = useState(true)
  const [loading, setLoading] = useState(false)
  const [loadingTenants, setLoadingTenants] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTenants = async () => {
      try {
        const token = localStorage.getItem('auth_access_token')
        const apiUrl = import.meta.env.DEV 
          ? 'http://127.0.0.1:3000/api/admin/tenants'
          : '/api/admin/tenants'
        
        const response = await fetch(apiUrl, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (!response.ok) {
          throw new Error('Failed to fetch tenants')
        }

        const data = await response.json()
        setTenants(data.tenants || [])
        if (data.tenants && data.tenants.length > 0) {
          setSelectedTenantId(data.tenants[0].id)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load tenants')
      } finally {
        setLoadingTenants(false)
      }
    }

    fetchTenants()
  }, [])

  const handleGeneratePIN = () => {
    const newPIN = generateRandomPIN()
    setPin(newPIN)
    setAutoGeneratePIN(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!selectedTenantId) {
      setError('Vælg venligst en tenant')
      return
    }

    setLoading(true)

    try {
      const token = localStorage.getItem('auth_access_token')
      const finalPIN = autoGeneratePIN ? undefined : pin
      const apiUrl = import.meta.env.DEV 
        ? `http://127.0.0.1:3000/api/${selectedTenantId}/admin/coaches`
        : `/api/${selectedTenantId}/admin/coaches`

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          username,
          pin: finalPIN,
          sendEmail
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create coach')
      }

      if (!sendEmail && data.coach?.pin) {
        alert(`Træner oprettet! PIN: ${data.coach.pin}`)
      }

      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create coach')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-6 border border-[hsl(var(--line)/.12)] rounded-lg bg-[hsl(var(--surface))]">
      <h2 className="text-xl font-semibold mb-4 text-[hsl(var(--foreground))]">Opret ny træner</h2>

      {error && (
        <div className="p-4 rounded-lg bg-[hsl(var(--destructive)/.1)] border border-[hsl(var(--destructive)/.2)]">
          <p className="text-sm text-[hsl(var(--destructive))]">{error}</p>
        </div>
      )}

      <div>
        <label htmlFor="tenant" className="block text-sm font-medium mb-2 text-[hsl(var(--foreground))]">
          Tenant *
        </label>
        {loadingTenants ? (
          <div className="text-sm text-[hsl(var(--muted))]">Indlæser tenants...</div>
        ) : (
          <select
            id="tenant"
            value={selectedTenantId}
            onChange={(e) => setSelectedTenantId(e.target.value)}
            required
            className="w-full px-3 py-2 rounded-md bg-[hsl(var(--surface))] border border-[hsl(var(--line)/.14)] focus:ring-2 focus:ring-[hsl(var(--ring))] outline-none text-[hsl(var(--foreground))]"
            disabled={loading}
          >
            <option value="">Vælg tenant</option>
            {tenants.map((tenant) => (
              <option key={tenant.id} value={tenant.id}>
                {tenant.name} ({tenant.subdomain})
              </option>
            ))}
          </select>
        )}
      </div>

      <div>
        <label htmlFor="username" className="block text-sm font-medium mb-2 text-[hsl(var(--foreground))]">
          Brugernavn *
        </label>
        <input
          id="username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          minLength={3}
          maxLength={50}
          className="w-full px-3 py-2 rounded-md bg-[hsl(var(--surface))] border border-[hsl(var(--line)/.14)] focus:ring-2 focus:ring-[hsl(var(--ring))] outline-none text-[hsl(var(--foreground))]"
          disabled={loading}
        />
        <p className="text-xs text-[hsl(var(--muted))] mt-1">
          Minimum 3 tegn, maksimum 50 tegn
        </p>
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-2 text-[hsl(var(--foreground))]">
          Email *
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-3 py-2 rounded-md bg-[hsl(var(--surface))] border border-[hsl(var(--line)/.14)] focus:ring-2 focus:ring-[hsl(var(--ring))] outline-none text-[hsl(var(--foreground))]"
          disabled={loading}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label htmlFor="pin" className="block text-sm font-medium text-[hsl(var(--foreground))]">
            PIN (6 cifre) *
          </label>
          <button
            type="button"
            onClick={handleGeneratePIN}
            className="text-sm text-[hsl(var(--primary))] hover:underline"
            disabled={loading}
          >
            Generer automatisk
          </button>
        </div>
        <input
          id="pin"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={pin}
          onChange={(e) => {
            setPin(e.target.value.replace(/\D/g, '').slice(0, 6))
            setAutoGeneratePIN(false)
          }}
          required={!autoGeneratePIN}
          maxLength={6}
          placeholder={autoGeneratePIN ? 'Genereres automatisk' : '000000'}
          className="w-full px-3 py-2 rounded-md bg-[hsl(var(--surface))] border border-[hsl(var(--line)/.14)] focus:ring-2 focus:ring-[hsl(var(--ring))] outline-none text-center text-xl tracking-widest text-[hsl(var(--foreground))]"
          disabled={loading || autoGeneratePIN}
        />
        {autoGeneratePIN && (
          <p className="text-xs text-[hsl(var(--muted))] mt-1">
            PIN genereres automatisk ved oprettelse
          </p>
        )}
      </div>

      <div className="flex items-center">
        <input
          id="sendEmail"
          type="checkbox"
          checked={sendEmail}
          onChange={(e) => setSendEmail(e.target.checked)}
          className="mr-2 w-4 h-4 rounded border-[hsl(var(--line)/.14)] text-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--ring))]"
          disabled={loading}
        />
        <label htmlFor="sendEmail" className="text-sm text-[hsl(var(--foreground))]">
          Send velkomstemail med PIN til træneren
        </label>
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="submit" loading={loading} disabled={!selectedTenantId}>
          Opret træner
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
          Annuller
        </Button>
      </div>
    </form>
  )
}

