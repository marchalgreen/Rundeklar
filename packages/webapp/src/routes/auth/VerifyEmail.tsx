import React, { useEffect, useState } from 'react'
import { useNavigation } from '../../contexts/NavigationContext'
import { PageCard } from '../../components/ui'
import { Button } from '../../components/ui'

export default function VerifyEmailPage() {
  const { navigateToAuth } = useNavigation()
  const [loading, setLoading] = useState(true)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const verifyEmail = async () => {
      // Extract token from URL query params
      const params = new URLSearchParams(window.location.search)
      const token = params.get('token')
      if (!token) {
        setError('Ingen verifikationstoken fundet')
        setLoading(false)
        return
      }

      try {
        const apiUrl = import.meta.env.DEV 
          ? 'http://127.0.0.1:3000/api/auth/verify-email'
          : '/api/auth/verify-email'

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ token })
        })

        const data = await response.json()

        if (response.ok) {
          setSuccess(true)
          setTimeout(() => {
            navigateToAuth('login')
          }, 3000)
        } else {
          setError(data.error || 'Email verifikation fejlede')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Email verifikation fejlede')
      } finally {
        setLoading(false)
      }
    }

    verifyEmail()
  }, [navigateToAuth])

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <PageCard className="w-full max-w-md">
        {loading && (
          <div className="text-center">
            <p className="text-lg">Verificerer email...</p>
          </div>
        )}

        {success && (
          <div className="text-center">
            <h1 className="text-2xl font-semibold mb-4 text-green-600 dark:text-green-400">
              Email verificeret!
            </h1>
            <p className="text-[hsl(var(--muted))] mb-4">
              Din email er nu verificeret. Du kan nu logge ind.
            </p>
            <p className="text-sm text-[hsl(var(--muted))]">
              Omdirigerer til login...
            </p>
          </div>
        )}

        {error && (
          <div className="text-center">
            <h1 className="text-2xl font-semibold mb-4 text-red-600 dark:text-red-400">
              Verifikation fejlede
            </h1>
            <p className="text-[hsl(var(--muted))] mb-4">{error}</p>
            <Button onClick={() => navigateToAuth('login')}>
              Gå til login
            </Button>
          </div>
        )}
      </PageCard>
    </div>
  )
}

