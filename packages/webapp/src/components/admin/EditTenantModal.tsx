import React, { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { Button } from '../ui'
import { useToast } from '../ui/Toast'

interface TenantDetails {
  id: string
  name: string
  subdomain: string
  logo?: string
  maxCourts?: number
  features?: Record<string, any>
}

interface EditTenantModalProps {
  isOpen: boolean
  onClose: () => void
  tenant: TenantDetails
  onSuccess: () => void
}

/**
 * EditTenantModal component — modal for editing tenant details.
 * 
 * Allows super admins to update tenant name, logo, max courts, and features.
 */
export const EditTenantModal: React.FC<EditTenantModalProps> = ({
  isOpen,
  onClose,
  tenant,
  onSuccess
}) => {
  const [name, setName] = useState('')
  const [logo, setLogo] = useState('')
  const [maxCourts, setMaxCourts] = useState<number | undefined>(undefined)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { notify } = useToast()

  // Initialize form from tenant when modal opens
  useEffect(() => {
    if (isOpen && tenant) {
      setName(tenant.name || '')
      setLogo(tenant.logo || '')
      setMaxCourts(tenant.maxCourts)
      setError(null)
    }
  }, [isOpen, tenant])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Navn er påkrævet')
      return
    }

    setIsSaving(true)

    try {
      const token = localStorage.getItem('auth_access_token')
      const apiUrl = import.meta.env.DEV 
        ? `http://127.0.0.1:3000/api/admin/tenants/${tenant.id}`
        : `/api/admin/tenants/${tenant.id}`

      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: name.trim(),
          logo: logo.trim() || undefined,
          maxCourts: maxCourts ? Number(maxCourts) : undefined
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Kunne ikke opdatere tenant')
      }

      notify({
        variant: 'success',
        title: 'Tenant opdateret',
        description: `Tenant "${name}" er blevet opdateret`
      })

      onSuccess()
      onClose()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Kunne ikke opdatere tenant'
      setError(errorMessage)
      notify({
        variant: 'danger',
        title: 'Fejl',
        description: errorMessage
      })
    } finally {
      setIsSaving(false)
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
      aria-label="Rediger tenant"
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
              Rediger tenant
            </h3>
            <p className="text-xs sm:text-sm text-[hsl(var(--muted))] mt-1">
              {tenant.subdomain}.rundeklar.dk
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
              <label htmlFor="name" className="block text-sm font-medium mb-2 text-[hsl(var(--foreground))]">
                Navn *
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-md bg-[hsl(var(--surface))] border border-[hsl(var(--line)/.14)] focus:ring-2 focus:ring-[hsl(var(--ring))] outline-none text-[hsl(var(--foreground))]"
                disabled={isSaving}
              />
            </div>

            <div>
              <label htmlFor="logo" className="block text-sm font-medium mb-2 text-[hsl(var(--foreground))]">
                Logo (filnavn)
              </label>
              <input
                id="logo"
                type="text"
                value={logo}
                onChange={(e) => setLogo(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-[hsl(var(--surface))] border border-[hsl(var(--line)/.14)] focus:ring-2 focus:ring-[hsl(var(--ring))] outline-none text-[hsl(var(--foreground))]"
                disabled={isSaving}
                placeholder="logo.png"
              />
            </div>

            <div>
              <label htmlFor="maxCourts" className="block text-sm font-medium mb-2 text-[hsl(var(--foreground))]">
                Max baner
              </label>
              <input
                id="maxCourts"
                type="number"
                min="1"
                max="20"
                value={maxCourts || ''}
                onChange={(e) => setMaxCourts(e.target.value ? Number(e.target.value) : undefined)}
                className="w-full px-3 py-2 rounded-md bg-[hsl(var(--surface))] border border-[hsl(var(--line)/.14)] focus:ring-2 focus:ring-[hsl(var(--ring))] outline-none text-[hsl(var(--foreground))]"
                disabled={isSaving}
                placeholder="8"
              />
              <p className="text-xs text-[hsl(var(--muted))] mt-1">
                Antal baner tenanten kan bruge (1-20)
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 pt-6 mt-6 border-t border-[hsl(var(--line)/.12)]">
            <Button type="submit" loading={isSaving} disabled={!name.trim()}>
              Gem ændringer
            </Button>
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>
              Annuller
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

