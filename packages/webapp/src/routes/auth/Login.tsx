import React, { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useNavigation } from '../../contexts/NavigationContext'
import { Button } from '../../components/ui'
import { PageCard } from '../../components/ui'

export default function LoginPage() {
  const { login } = useAuth()
  const { navigate, navigateToAuth } = useNavigation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [requires2FA, setRequires2FA] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await login(email, password, totpCode || undefined)
      navigate('coach')
    } catch (err) {
      if (err instanceof Error && err.message === '2FA_REQUIRED') {
        setRequires2FA(true)
        setError(null)
      } else {
        setError(err instanceof Error ? err.message : 'Login failed')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <PageCard className="w-full max-w-md">
        <h1 className="text-2xl font-semibold mb-6 text-center">Log ind</h1>

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

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1">
              Adgangskode
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-[hsl(var(--line))] rounded-md bg-[hsl(var(--surface))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
              disabled={loading}
            />
          </div>

          {requires2FA && (
            <div>
              <label htmlFor="totp" className="block text-sm font-medium mb-1">
                To-faktor kode
              </label>
              <input
                id="totp"
                type="text"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                placeholder="000000"
                maxLength={6}
                className="w-full px-3 py-2 border border-[hsl(var(--line))] rounded-md bg-[hsl(var(--surface))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] text-center text-2xl tracking-widest"
                disabled={loading}
              />
            </div>
          )}

          <Button type="submit" className="w-full" loading={loading}>
            Log ind
          </Button>
        </form>

        <div className="mt-6 text-center space-y-2">
          <button
            type="button"
            onClick={() => navigateToAuth('forgot-password')}
            className="text-sm text-[hsl(var(--primary))] hover:underline"
          >
            Glemt adgangskode?
          </button>
          <div className="text-sm text-[hsl(var(--muted))]">
            Har du ikke en konto?{' '}
            <button
              type="button"
              onClick={() => navigateToAuth('register')}
              className="text-[hsl(var(--primary))] hover:underline"
            >
              Registrer dig
            </button>
          </div>
        </div>
      </PageCard>
    </div>
  )
}

