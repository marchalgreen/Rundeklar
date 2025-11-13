import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTenant } from '../../contexts/TenantContext'
import { Button } from '../../components/ui'
import { PageCard } from '../../components/ui'

export default function ForgotPasswordPage() {
  const { buildPath, tenantId } = useTenant()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const apiUrl = import.meta.env.DEV 
        ? 'http://127.0.0.1:3000/api/auth/forgot-password'
        : '/api/auth/forgot-password'

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          tenantId
        })
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(true)
      } else {
        setError(data.error || 'Anmodning fejlede')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Anmodning fejlede')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-12">
        <PageCard className="w-full max-w-md">
          <div className="text-center">
            <h1 className="text-2xl font-semibold mb-4">Email sendt!</h1>
            <p className="text-[hsl(var(--muted))] mb-4">
              Hvis en konto med denne email findes, har vi sendt et link til nulstilling af adgangskode.
            </p>
            <Link
              to={buildPath('/login')}
              className="text-[hsl(var(--primary))] hover:underline"
            >
              Tilbage til login
            </Link>
          </div>
        </PageCard>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <PageCard className="w-full max-w-md">
        <h1 className="text-2xl font-semibold mb-6 text-center">Glemt adgangskode</h1>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-[hsl(var(--line))] rounded-md bg-[hsl(var(--surface))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
              disabled={loading}
            />
          </div>

          <Button type="submit" className="w-full" loading={loading}>
            Send nulstillingslink
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Link
            to={buildPath('/login')}
            className="text-sm text-[hsl(var(--primary))] hover:underline"
          >
            Tilbage til login
          </Link>
        </div>
      </PageCard>
    </div>
  )
}

