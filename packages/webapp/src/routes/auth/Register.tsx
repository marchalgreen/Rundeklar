import React, { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useNavigation } from '../../contexts/NavigationContext'
import { Button } from '../../components/ui'
import { PageCard } from '../../components/ui'

export default function RegisterPage() {
  const { register } = useAuth()
  const { navigateToAuth } = useNavigation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [passwordErrors, setPasswordErrors] = useState<string[]>([])

  const validatePassword = (pwd: string): string[] => {
    const errors: string[] = []
    if (pwd.length < 8) errors.push('Mindst 8 tegn')
    if (pwd.length > 128) errors.push('Maksimalt 128 tegn')
    if (!/[a-z]/.test(pwd)) errors.push('Mindst ét lille bogstav')
    if (!/[A-Z]/.test(pwd)) errors.push('Mindst ét stort bogstav')
    if (!/[0-9]/.test(pwd)) errors.push('Mindst ét tal')
    if (!/[^a-zA-Z0-9]/.test(pwd)) errors.push('Mindst ét specialtegn')
    return errors
  }

  const handlePasswordChange = (pwd: string) => {
    setPassword(pwd)
    setPasswordErrors(validatePassword(pwd))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Adgangskoderne matcher ikke')
      return
    }

    const errors = validatePassword(password)
    if (errors.length > 0) {
      setError('Adgangskoden opfylder ikke kravene')
      return
    }

    setLoading(true)

    try {
      await register(email, password)
      setSuccess(true)
      setTimeout(() => {
        navigateToAuth('login')
      }, 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registrering fejlede')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-12">
        <PageCard className="w-full max-w-md">
          <div className="text-center">
            <h1 className="text-2xl font-semibold mb-4">Registrering gennemført!</h1>
            <p className="text-[hsl(var(--muted))] mb-4">
              Vi har sendt en bekræftelsesmail til {email}. Klik på linket i emailen for at aktivere din konto.
            </p>
            <p className="text-sm text-[hsl(var(--muted))]">
              Omdirigerer til login...
            </p>
          </div>
        </PageCard>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <PageCard className="w-full max-w-md">
        <h1 className="text-2xl font-semibold mb-6 text-center">Opret konto</h1>

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
              onChange={(e) => handlePasswordChange(e.target.value)}
              required
              className="w-full px-3 py-2 border border-[hsl(var(--line))] rounded-md bg-[hsl(var(--surface))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
              disabled={loading}
            />
            {passwordErrors.length > 0 && (
              <ul className="mt-1 text-xs text-[hsl(var(--muted))] list-disc list-inside">
                {passwordErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1">
              Bekræft adgangskode
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-[hsl(var(--line))] rounded-md bg-[hsl(var(--surface))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
              disabled={loading}
            />
            {confirmPassword && password !== confirmPassword && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                Adgangskoderne matcher ikke
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" loading={loading}>
            Opret konto
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-[hsl(var(--muted))]">
          Har du allerede en konto?{' '}
          <button
            type="button"
            onClick={() => navigateToAuth('login')}
            className="text-[hsl(var(--primary))] hover:underline"
          >
            Log ind
          </button>
        </div>
      </PageCard>
    </div>
  )
}

