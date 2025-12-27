import React, { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '../ui'
import { useToast } from '../ui/Toast'

interface CreateAdminModalProps {
  isOpen: boolean
  onClose: () => void
  tenantId: string
  onSuccess: () => void
}

/**
 * CreateAdminModal component — modal for creating a new admin user for a tenant.
 * 
 * Allows super admins to create admin users with email and password.
 */
export const CreateAdminModal: React.FC<CreateAdminModalProps> = ({
  isOpen,
  onClose,
  tenantId,
  onSuccess
}) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { notify } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!email.trim()) {
      setError('Email er påkrævet')
      return
    }

    if (!password) {
      setError('Adgangskode er påkrævet')
      return
    }

    if (password.length < 8) {
      setError('Adgangskode skal være mindst 8 tegn')
      return
    }

    if (password !== confirmPassword) {
      setError('Adgangskoder matcher ikke')
      return
    }

    setIsCreating(true)

    try {
      const token = localStorage.getItem('auth_access_token')
      const apiUrl = import.meta.env.DEV 
        ? `http://127.0.0.1:3000/api/admin/tenants/${tenantId}/admins`
        : `/api/admin/tenants/${tenantId}/admins`

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: email.trim(),
          password
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Kunne ikke oprette administrator')
      }

      notify({
        variant: 'success',
        title: 'Administrator oprettet',
        description: `Administrator "${email}" er blevet oprettet`
      })

      // Reset form
      setEmail('')
      setPassword('')
      setConfirmPassword('')
      
      onSuccess()
      onClose()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Kunne ikke oprette administrator'
      setError(errorMessage)
      notify({
        variant: 'danger',
        title: 'Fejl',
        description: errorMessage
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    }
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-label="Opret administrator"
      onKeyDown={handleKeyDown}
      onClick={handleBackdropClick}
    >
      <div
        className="w-full max-w-md mx-3 sm:mx-4 bg-[hsl(var(--surface))] ring-1 ring-[hsl(var(--line)/.12)] rounded-lg shadow-lg flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-4 sm:p-6 border-b border-[hsl(var(--line)/.12)] flex-shrink-0">
          <div className="min-w-0 flex-1">
            <h3 className="text-base sm:text-lg font-semibold text-[hsl(var(--foreground))]">
              Opret administrator
            </h3>
            <p className="text-xs sm:text-sm text-[hsl(var(--muted))] mt-1">
              Opret en ny administrator for denne tenant
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="flex-shrink-0"
            aria-label="Luk dialog"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6">
          {error && (
            <div className="mb-4 p-3 rounded-md bg-[hsl(var(--destructive)/.1)] border border-[hsl(var(--destructive)/.2)]">
              <p className="text-sm text-[hsl(var(--destructive))]">{error}</p>
            </div>
          )}

          <div className="space-y-4">
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
                disabled={isCreating}
                placeholder="admin@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2 text-[hsl(var(--foreground))]">
                Adgangskode *
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-3 py-2 rounded-md bg-[hsl(var(--surface))] border border-[hsl(var(--line)/.14)] focus:ring-2 focus:ring-[hsl(var(--ring))] outline-none text-[hsl(var(--foreground))]"
                disabled={isCreating}
              />
              <p className="text-xs text-[hsl(var(--muted))] mt-1">
                Minimum 8 tegn
              </p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2 text-[hsl(var(--foreground))]">
                Bekræft adgangskode *
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-3 py-2 rounded-md bg-[hsl(var(--surface))] border border-[hsl(var(--line)/.14)] focus:ring-2 focus:ring-[hsl(var(--ring))] outline-none text-[hsl(var(--foreground))]"
                disabled={isCreating}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 pt-6 mt-6 border-t border-[hsl(var(--line)/.12)]">
            <Button type="submit" loading={isCreating} disabled={!email.trim() || !password || password.length < 8}>
              Opret administrator
            </Button>
            <Button type="button" variant="secondary" onClick={onClose} disabled={isCreating}>
              Annuller
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

