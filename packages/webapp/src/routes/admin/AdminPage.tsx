import React, { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { UserRole } from '../../lib/auth/roles'
import TenantsPage from './Tenants'
import CoachesPage from '../[tenantId]/admin/Coaches'
import AllCoachesPage from './AllCoaches'
import AnalyticsPage from './Analytics'
import ColdCallEmailsPage from './ColdCallEmails'
import { PageCard } from '../../components/ui'
import { Building2, Users, BarChart3, Mail } from 'lucide-react'

type AdminTab = 'tenants' | 'coaches' | 'analytics' | 'cold-call-emails'

export default function AdminPage() {
  const { club } = useAuth()
  const clubRole = (club as any)?.role as string | undefined
  const isSuperAdmin = clubRole === UserRole.SYSADMIN || clubRole === 'sysadmin' || clubRole === 'super_admin' // Backward compatibility
  const [activeTab, setActiveTab] = useState<AdminTab>(isSuperAdmin ? 'coaches' : 'coaches')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Administration</h1>
        {isSuperAdmin && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('coaches')}
              className={`
                px-4 py-2 text-sm font-medium rounded-lg
                transition-all duration-200 ease-out
                flex items-center gap-2
                ${
                  activeTab === 'coaches'
                    ? 'bg-[hsl(var(--surface))] text-[hsl(var(--foreground))] shadow-sm ring-1 ring-[hsl(var(--line)/.2)]'
                    : 'text-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--surface-2)/.5)]'
                }
              `}
            >
              <Users className="w-4 h-4" />
              <span>Trænere</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('tenants')}
              className={`
                px-4 py-2 text-sm font-medium rounded-lg
                transition-all duration-200 ease-out
                flex items-center gap-2
                ${
                  activeTab === 'tenants'
                    ? 'bg-[hsl(var(--surface))] text-[hsl(var(--foreground))] shadow-sm ring-1 ring-[hsl(var(--line)/.2)]'
                    : 'text-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--surface-2)/.5)]'
                }
              `}
            >
              <Building2 className="w-4 h-4" />
              <span>Tenants</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('analytics')}
              className={`
                px-4 py-2 text-sm font-medium rounded-lg
                transition-all duration-200 ease-out
                flex items-center gap-2
                ${
                  activeTab === 'analytics'
                    ? 'bg-[hsl(var(--surface))] text-[hsl(var(--foreground))] shadow-sm ring-1 ring-[hsl(var(--line)/.2)]'
                    : 'text-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--surface-2)/.5)]'
                }
              `}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Analytics</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('cold-call-emails')}
              className={`
                px-4 py-2 text-sm font-medium rounded-lg
                transition-all duration-200 ease-out
                flex items-center gap-2
                ${
                  activeTab === 'cold-call-emails'
                    ? 'bg-[hsl(var(--surface))] text-[hsl(var(--foreground))] shadow-sm ring-1 ring-[hsl(var(--line)/.2)]'
                    : 'text-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--surface-2)/.5)]'
                }
              `}
            >
              <Mail className="w-4 h-4" />
              <span>Cold Call</span>
            </button>
          </div>
        )}
      </div>

      {isSuperAdmin && activeTab === 'coaches' && <AllCoachesPage />}
      {isSuperAdmin && activeTab === 'tenants' && <TenantsPage />}
      {isSuperAdmin && activeTab === 'analytics' && <AnalyticsPage />}
      {isSuperAdmin && activeTab === 'cold-call-emails' && <ColdCallEmailsPage />}
      {!isSuperAdmin && activeTab === 'coaches' && <CoachesPage />}
      
      {!isSuperAdmin && (
        <PageCard>
          <p className="text-[hsl(var(--muted))]">
            Du har adgang til træner-administration. Brug fanen ovenfor for at skifte.
          </p>
        </PageCard>
      )}
    </div>
  )
}

