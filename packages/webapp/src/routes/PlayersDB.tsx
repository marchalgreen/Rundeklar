import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { Player, PlayerGender, PlayerCategory } from '@herlev-hjorten/common'
import { Pencil, Plus, Trash2, UsersRound } from 'lucide-react'
import api from '../api'
import { Badge, Button, EmptyState, PageCard } from '../components/ui'
import { DataTable, TableSearch, Column } from '../components/ui/Table'
import { useToast } from '../components/ui/Toast'

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('da-DK', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(iso))

/**
 * Editable partner cell component for table inline editing.
 */
const EditablePartnerCell = ({ 
  player, 
  partnerType, 
  allPlayers, 
  onUpdate, 
  notify 
}: { 
  player: Player
  partnerType: 'doubles' | 'mixed'
  allPlayers: Player[]
  onUpdate: () => void
  notify: (notification: { variant: 'success' | 'error'; title: string; message?: string }) => void
}) => {
  const partnerId = partnerType === 'doubles' 
    ? (player.preferredDoublesPartners?.[0] ?? null)
    : (player.preferredMixedPartners?.[0] ?? null)
  const partner = partnerId ? allPlayers.find(p => p.id === partnerId) : null
  const [isEditing, setIsEditing] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState('')
  const [editingPartnerId, setEditingPartnerId] = React.useState<string | null>(partnerId)
  const [showConfirmDialog, setShowConfirmDialog] = React.useState(false)
  const [pendingPartnerId, setPendingPartnerId] = React.useState<string | null>(null)
  const [existingPartnerName, setExistingPartnerName] = React.useState<string>('')
  const dropdownRef = React.useRef<HTMLDivElement>(null)
  
  // Filter players based on gender logic
  // Show all players from the same club/database, excluding only the current player
  const availablePlayers = React.useMemo(() => {
    // First, get all players excluding self
    const allExceptSelf = allPlayers.filter(p => p.id !== player.id)
    
    // If player has no gender set, show all players from the club
    if (!player.gender) return allExceptSelf
    
    // Apply gender-based filtering
    let filtered: Player[] = []
    if (partnerType === 'doubles') {
      // Same gender for doubles partner
      filtered = allExceptSelf.filter(p => p.gender === player.gender)
    } else {
      // Opposite gender for mixed partner
      if (player.gender === 'Herre') {
        filtered = allExceptSelf.filter(p => p.gender === 'Dame')
      } else if (player.gender === 'Dame') {
        filtered = allExceptSelf.filter(p => p.gender === 'Herre')
      } else {
        filtered = allExceptSelf
      }
    }
    
    // If no players match the gender filter, fall back to showing all players
    // This allows selection even if there are no gender matches
    return filtered.length > 0 ? filtered : allExceptSelf
  }, [allPlayers, player.id, player.gender, partnerType])
  
  const filteredPlayers = availablePlayers.filter(p => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return p.name.toLowerCase().includes(search) || (p.alias?.toLowerCase().includes(search) ?? false)
  })
  
  // Close dropdown when clicking outside
  React.useEffect(() => {
    if (!isEditing) return
    
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsEditing(false)
        setEditingPartnerId(partnerId)
        setSearchTerm('')
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isEditing, partnerId])
  
  // Reset editing state when player changes
  React.useEffect(() => {
    const currentPartnerId = partnerType === 'doubles' 
      ? (player.preferredDoublesPartners?.[0] ?? null)
      : (player.preferredMixedPartners?.[0] ?? null)
    if (!isEditing) {
      setEditingPartnerId(currentPartnerId)
    }
  }, [player, partnerType, isEditing])
  
  const handleSave = async () => {
    try {
      const updateData = partnerType === 'doubles'
        ? { preferredDoublesPartners: editingPartnerId ? [editingPartnerId] : null }
        : { preferredMixedPartners: editingPartnerId ? [editingPartnerId] : null }
      
      await api.players.update({
        id: player.id,
        patch: updateData
      })
      await onUpdate()
      setIsEditing(false)
      setSearchTerm('')
      notify({ variant: 'success', title: `${partnerType === 'doubles' ? 'Double' : 'Mix'} makker opdateret` })
    } catch (err: any) {
      notify({ variant: 'error', title: `Kunne ikke opdatere ${partnerType === 'doubles' ? 'double' : 'mix'} makker`, message: err.message })
    }
  }
  
  const handleSelectPlayer = async (selectedId: string | null) => {
    // If clearing, proceed directly
    if (!selectedId) {
      await performPartnerUpdate(null)
      return
    }

    // Check if the selected partner already has a preferred partner
    const selectedPartner = allPlayers.find(p => p.id === selectedId)
    if (selectedPartner) {
      const existingPartnerId = partnerType === 'doubles'
        ? (selectedPartner.preferredDoublesPartners?.[0] ?? null)
        : (selectedPartner.preferredMixedPartners?.[0] ?? null)
      
      // If they already have a partner and it's not the current player, show confirmation
      if (existingPartnerId && existingPartnerId !== player.id) {
        const existingPartner = allPlayers.find(p => p.id === existingPartnerId)
        if (existingPartner) {
          console.log('Showing confirmation dialog for override')
          console.log('Selected partner:', selectedPartner.name)
          console.log('Existing partner:', existingPartner.name)
          setPendingPartnerId(selectedId)
          setExistingPartnerName(existingPartner.name)
          setShowConfirmDialog(true)
          console.log('Dialog state set to true')
          return
        }
      }
    }

    // No existing partner or it's the current player, proceed directly
    await performPartnerUpdate(selectedId)
  }

  const performPartnerUpdate = async (selectedId: string | null) => {
    try {
      console.log('performPartnerUpdate called with:', { selectedId, playerId: player.id, partnerType })
      
      // Step 1: Reload fresh data to ensure we have the latest state
      await onUpdate()
      const freshPlayers = await api.players.list({})
      const freshCurrentPlayer = freshPlayers.find(p => p.id === player.id)
      if (!freshCurrentPlayer) {
        throw new Error('Current player not found after reload')
      }
      
      // Step 2: Clear the current player's old partner relationship (if any)
      const currentPartnerId = partnerType === 'doubles'
        ? (freshCurrentPlayer.preferredDoublesPartners?.[0] ?? null)
        : (freshCurrentPlayer.preferredMixedPartners?.[0] ?? null)
      
      console.log('Current partner ID:', currentPartnerId)
      
      if (currentPartnerId && currentPartnerId !== selectedId) {
        // Clear the old partner's relationship
        const clearOldPartnerData = partnerType === 'doubles'
          ? { preferredDoublesPartners: [] }
          : { preferredMixedPartners: [] }
        
        console.log('Clearing old partner:', currentPartnerId, clearOldPartnerData)
        const result = await api.players.update({
          id: currentPartnerId,
          patch: clearOldPartnerData
        })
        console.log('Old partner cleared, result:', result)
      }
      
      // Step 3: If a partner was selected, clear their existing relationship first
      if (selectedId) {
        const selectedPartner = freshPlayers.find(p => p.id === selectedId)
        console.log('Selected partner:', selectedPartner)
        
        if (selectedPartner) {
          const existingPartnerId = partnerType === 'doubles'
            ? (selectedPartner.preferredDoublesPartners?.[0] ?? null)
            : (selectedPartner.preferredMixedPartners?.[0] ?? null)
          
          console.log('Existing partner ID for selected partner:', existingPartnerId)
          
          // If they have an existing partner (and it's not the current player), remove that relationship
          if (existingPartnerId && existingPartnerId !== player.id) {
            // Clear the existing partner's relationship
            const clearExistingData = partnerType === 'doubles'
              ? { preferredDoublesPartners: [] }
              : { preferredMixedPartners: [] }
            
            console.log('Clearing existing partner:', existingPartnerId, clearExistingData)
            const result = await api.players.update({
              id: existingPartnerId,
              patch: clearExistingData
            })
            console.log('Existing partner cleared, result:', result)
          }
        }
      }
      
      // Step 4: Update the current player with the new partner
      const updateData = partnerType === 'doubles'
        ? { preferredDoublesPartners: selectedId ? [selectedId] : [] }
        : { preferredMixedPartners: selectedId ? [selectedId] : [] }
      
      console.log('Updating current player:', player.id, updateData)
      const currentPlayerResult = await api.players.update({
        id: player.id,
        patch: updateData
      })
      console.log('Current player updated, result:', currentPlayerResult)
      console.log('Current player preferredDoublesPartners:', currentPlayerResult.preferredDoublesPartners)
      console.log('Current player preferredMixedPartners:', currentPlayerResult.preferredMixedPartners)
      
      // Step 5: If a partner was selected, set the bidirectional relationship
      if (selectedId) {
        const partnerUpdateData = partnerType === 'doubles'
          ? { preferredDoublesPartners: [player.id] }
          : { preferredMixedPartners: [player.id] }
        
        console.log('Updating selected partner:', selectedId, partnerUpdateData)
        const partnerResult = await api.players.update({
          id: selectedId,
          patch: partnerUpdateData
        })
        console.log('Selected partner updated, result:', partnerResult)
        console.log('Selected partner preferredDoublesPartners:', partnerResult.preferredDoublesPartners)
        console.log('Selected partner preferredMixedPartners:', partnerResult.preferredMixedPartners)
      }
      
      // Step 6: Reload data and close
      console.log('Reloading data...')
      await onUpdate()
      console.log('Data reloaded')
      setIsEditing(false)
      setSearchTerm('')
      setShowConfirmDialog(false)
      setPendingPartnerId(null)
      setExistingPartnerName('')
      notify({ variant: 'success', title: selectedId ? `${partnerType === 'doubles' ? 'Double' : 'Mix'} makker opdateret` : `${partnerType === 'doubles' ? 'Double' : 'Mix'} makker fjernet` })
    } catch (err: any) {
      console.error('Error updating partner:', err)
      console.error('Error stack:', err.stack)
      const errorMessage = err?.message || err?.toString() || 'Ukendt fejl'
      notify({ variant: 'error', title: `Kunne ikke opdatere ${partnerType === 'doubles' ? 'double' : 'mix'} makker`, message: errorMessage })
      setShowConfirmDialog(false)
      setPendingPartnerId(null)
      setExistingPartnerName('')
    }
  }

  const handleConfirmOverride = async () => {
    console.log('handleConfirmOverride called with pendingPartnerId:', pendingPartnerId)
    if (pendingPartnerId) {
      await performPartnerUpdate(pendingPartnerId)
    } else {
      console.warn('handleConfirmOverride called but pendingPartnerId is null')
    }
  }
  
  const handleCancel = () => {
    setIsEditing(false)
    setEditingPartnerId(partnerId)
    setSearchTerm('')
  }
  
  // This useEffect must be called unconditionally (before any early returns)
  React.useEffect(() => {
    if (showConfirmDialog) {
      console.log('Dialog is now visible in DOM')
      console.log('pendingPartnerId:', pendingPartnerId)
      console.log('existingPartnerName:', existingPartnerName)
    }
  }, [showConfirmDialog, pendingPartnerId, existingPartnerName])
  
  // Early return for non-editing state - must come AFTER all hooks
  if (!isEditing) {
    return (
      <div className="w-full max-w-[200px] mx-auto">
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="w-full text-xs rounded bg-[hsl(var(--surface))] px-2 py-1 ring-1 ring-[hsl(var(--line)/.14)] hover:ring-2 hover:ring-[hsl(var(--ring))] transition-colors text-left"
        >
          {partner ? `${partner.name} ${partner.alias ? `(${partner.alias})` : ''}` : 'Ingen'}
        </button>
      </div>
    )
  }
  
  // Editing state - render the editing UI
  if (showConfirmDialog) {
    console.log('Rendering confirmation dialog')
  }
  
  return (
      <>
        {showConfirmDialog && (
          <div 
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm" 
            onClick={(e) => {
              console.log('Backdrop clicked, target:', e.target, 'currentTarget:', e.currentTarget)
              if (e.target === e.currentTarget) {
                console.log('Closing dialog from backdrop click')
                setShowConfirmDialog(false)
                setPendingPartnerId(null)
                setExistingPartnerName('')
              }
            }}
          >
            <div 
              className="bg-[hsl(var(--surface))] rounded-lg shadow-lg p-6 max-w-md w-full mx-4 ring-1 ring-[hsl(var(--line)/.12)]" 
              onClick={(e) => {
                console.log('Dialog content clicked, stopping propagation')
                e.stopPropagation()
              }}
            >
              <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-2">
                Bekræft overskrivning
              </h3>
              <p className="text-sm text-[hsl(var(--muted))] mb-4">
                Den valgte spiller er allerede tildelt til <strong>{existingPartnerName}</strong>. Vil du overskrive denne tilknytning?
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    console.log('Annuller button clicked!')
                    setShowConfirmDialog(false)
                    setPendingPartnerId(null)
                    setExistingPartnerName('')
                  }}
                  className="px-4 py-2 text-sm rounded bg-[hsl(var(--surface-2))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--surface-glass)/.85)] transition-colors"
                >
                  Annuller
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    console.log('Overskriv button clicked!')
                    console.log('pendingPartnerId:', pendingPartnerId)
                    console.log('showConfirmDialog:', showConfirmDialog)
                    handleConfirmOverride()
                  }}
                  onMouseDown={(e) => {
                    console.log('Overskriv button mouseDown!')
                    e.stopPropagation()
                  }}
                  onMouseUp={(e) => {
                    console.log('Overskriv button mouseUp!')
                    e.stopPropagation()
                  }}
                  className="px-4 py-2 text-sm rounded bg-[hsl(var(--primary))] text-white hover:opacity-90 transition-opacity cursor-pointer"
                  style={{ pointerEvents: 'auto' }}
                >
                  Overskriv
                </button>
              </div>
            </div>
          </div>
        )}
        <div ref={dropdownRef} className="relative w-full max-w-[200px]">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown' && filteredPlayers.length > 0) {
              e.preventDefault()
              const firstButton = dropdownRef.current?.querySelector('button[type="button"]:not(:first-child)') as HTMLButtonElement
              firstButton?.focus()
            }
          }}
          placeholder="Søg..."
          className="w-full text-xs rounded bg-[hsl(var(--surface))] px-2 py-1 ring-1 ring-[hsl(var(--line)/.14)] focus:ring-2 focus:ring-[hsl(var(--ring))] outline-none"
          autoFocus
          onClick={(e) => e.stopPropagation()}
        />
        <div className="absolute top-[28px] left-0 w-full min-w-[200px] bg-[hsl(var(--surface))] border border-[hsl(var(--line)/.14)] rounded shadow-lg max-h-[150px] overflow-y-auto z-[100]">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              handleSelectPlayer(null)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                e.stopPropagation()
                handleSelectPlayer(null)
              } else if (e.key === 'ArrowDown') {
                e.preventDefault()
                const next = e.currentTarget.nextElementSibling as HTMLButtonElement
                next?.focus()
              }
            }}
            tabIndex={0}
            className={`w-full text-left px-2 py-1 text-xs hover:bg-[hsl(var(--surface-2))] transition-colors focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] ${
              editingPartnerId === null ? 'bg-[hsl(var(--primary)/.1)]' : ''
            }`}
          >
            Ingen
          </button>
          {availablePlayers.length === 0 ? (
            <div className="px-2 py-1 text-xs text-[hsl(var(--muted))]">
              Ingen andre spillere i klubben
            </div>
          ) : filteredPlayers.length === 0 ? (
            <div className="px-2 py-1 text-xs text-[hsl(var(--muted))]">Ingen spillere fundet</div>
          ) : (
            filteredPlayers.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                  handleSelectPlayer(p.id)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    e.stopPropagation()
                    handleSelectPlayer(p.id)
                  } else if (e.key === 'ArrowDown') {
                    e.preventDefault()
                    const next = e.currentTarget.nextElementSibling as HTMLButtonElement
                    next?.focus()
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault()
                    const prev = e.currentTarget.previousElementSibling as HTMLButtonElement
                    prev?.focus()
                  }
                }}
                tabIndex={0}
                className={`w-full text-left px-2 py-1 text-xs hover:bg-[hsl(var(--surface-2))] transition-colors focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] ${
                  editingPartnerId === p.id ? 'bg-[hsl(var(--primary)/.1)]' : ''
                }`}
              >
                {p.name} {p.alias ? `(${p.alias})` : ''}
              </button>
            ))
          )}
        </div>
        <div className="flex gap-1 mt-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              handleSave()
            }}
            className="text-xs px-2 py-1 bg-[hsl(var(--primary))] text-white rounded hover:opacity-90"
          >
            Gem
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              handleCancel()
            }}
            className="text-xs px-2 py-1 bg-[hsl(var(--surface-2))] rounded hover:opacity-90"
          >
            Annuller
          </button>
        </div>
      </div>
      </>
    )
}

/**
 * Players page — manages player CRUD operations and listing.
 * @remarks Renders player table with search/sort, handles create/edit forms,
 * and delegates data operations to api.players.
 */
const PlayersPage = () => {
  const [players, setPlayers] = useState<Player[]>([])
  const [allPlayersForDropdown, setAllPlayersForDropdown] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create')
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null)
  const [formName, setFormName] = useState('')
  const [formAlias, setFormAlias] = useState('')
  const [formLevelSingle, setFormLevelSingle] = useState<string>('')
  const [formLevelDouble, setFormLevelDouble] = useState<string>('')
  const [formLevelMix, setFormLevelMix] = useState<string>('')
  const [formGender, setFormGender] = useState<PlayerGender | ''>('')
  const [formPrimaryCategory, setFormPrimaryCategory] = useState<PlayerCategory | ''>('')
  const [formActive, setFormActive] = useState(true)
  const [formPreferredDoublesPartners, setFormPreferredDoublesPartners] = useState<string[]>([])
  const [formPreferredMixedPartners, setFormPreferredMixedPartners] = useState<string[]>([])
  const [sort, setSort] = useState<{ columnId: string; direction: 'asc' | 'desc' } | undefined>({ columnId: 'name', direction: 'asc' })
  const scrollPositionRef = useRef<number>(0)
  const shouldRestoreScrollRef = useRef(false)
  const { notify } = useToast()

  /** Loads all players for dropdown (no filters). */
  const loadAllPlayersForDropdown = useCallback(async () => {
    try {
      const result = await api.players.list({})
      setAllPlayersForDropdown(result)
    } catch (err: any) {
      console.error('Failed to load all players for dropdown:', err)
    }
  }, [])

  /** Loads players from API with optional filters. */
  const loadPlayers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await api.players.list({
        q: search.trim() || undefined,
        active: showInactive ? undefined : true
      })
      setPlayers(result)
      // Also update the dropdown list if it's empty or if we're showing all players
      if (allPlayersForDropdown.length === 0 || showInactive) {
        await loadAllPlayersForDropdown()
      }
    } catch (err: any) {
      setError(err.message ?? 'Kunne ikke hente spillere')
    } finally {
      setLoading(false)
      // Restore scroll position after loading completes
      if (shouldRestoreScrollRef.current) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            const tableContainer = document.querySelector('[data-table-container]') as HTMLElement
            if (tableContainer && scrollPositionRef.current > 0) {
              tableContainer.scrollTop = scrollPositionRef.current
            }
            shouldRestoreScrollRef.current = false
          })
        })
      }
    }
  }, [search, showInactive, allPlayersForDropdown.length, loadAllPlayersForDropdown])

  // Load all players for dropdown on mount
  useEffect(() => {
    void loadAllPlayersForDropdown()
  }, [loadAllPlayersForDropdown])

  // WHY: Reload players when showInactive filter changes
  useEffect(() => {
    void loadPlayers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showInactive])

  // WHY: Reload players when search changes (debounced to avoid excessive API calls)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void loadPlayers()
    }, 300) // 300ms debounce

    return () => clearTimeout(timeoutId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])


  /** Memoized filtered players list — applies search term to name/alias. */
  const filteredPlayers = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return players
    return players.filter((player) => {
      const alias = (player.alias ?? '').toLowerCase()
      return player.name.toLowerCase().includes(term) || alias.includes(term)
    })
  }, [players, search])

  /** Resets form state to initial values. */
  const resetForm = () => {
    setFormName('')
    setFormAlias('')
    setFormLevelSingle('')
    setFormLevelDouble('')
    setFormLevelMix('')
    setFormGender('')
    setFormPrimaryCategory('')
    setFormActive(true)
    setFormPreferredDoublesPartners([])
    setFormPreferredMixedPartners([])
    setCurrentPlayer(null)
  }

  /** Opens create player form dialog. */
  const openCreate = () => {
    setDialogMode('create')
    resetForm()
    setIsSheetOpen(true)
  }

  /** Opens edit player form dialog with player data pre-filled. */
  const openEdit = (player: Player) => {
    setDialogMode('edit')
    setCurrentPlayer(player)
    setFormName(player.name)
    setFormAlias(player.alias ?? '')
    setFormLevelSingle(player.levelSingle?.toString() ?? '')
    setFormLevelDouble(player.levelDouble?.toString() ?? '')
    setFormLevelMix(player.levelMix?.toString() ?? '')
    setFormGender(player.gender ?? '')
    setFormPrimaryCategory(player.primaryCategory ?? '')
    setFormActive(player.active)
    setFormPreferredDoublesPartners(player.preferredDoublesPartners ?? [])
    setFormPreferredMixedPartners(player.preferredMixedPartners ?? [])
    setIsSheetOpen(true)
  }

  /** Handles form submission for create/edit player. */
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!formName.trim()) return
    try {
      if (dialogMode === 'create') {
        await api.players.create({
          name: formName.trim(),
          alias: formAlias.trim() || undefined,
          levelSingle: formLevelSingle ? Number(formLevelSingle) : undefined,
          levelDouble: formLevelDouble ? Number(formLevelDouble) : undefined,
          levelMix: formLevelMix ? Number(formLevelMix) : undefined,
          gender: formGender || undefined,
          primaryCategory: formPrimaryCategory || undefined,
          active: formActive,
          preferredDoublesPartners: formPreferredDoublesPartners.length > 0 ? formPreferredDoublesPartners : undefined,
          preferredMixedPartners: formPreferredMixedPartners.length > 0 ? formPreferredMixedPartners : undefined
        })
        notify({ variant: 'success', title: 'Spiller oprettet' })
      } else if (currentPlayer) {
        await api.players.update({
          id: currentPlayer.id,
          patch: {
            name: formName.trim(),
            alias: formAlias || null,
            levelSingle: formLevelSingle ? Number(formLevelSingle) : null,
            levelDouble: formLevelDouble ? Number(formLevelDouble) : null,
            levelMix: formLevelMix ? Number(formLevelMix) : null,
            gender: formGender || null,
            primaryCategory: formPrimaryCategory || null,
            active: formActive,
            preferredDoublesPartners: formPreferredDoublesPartners.length > 0 ? formPreferredDoublesPartners : null,
            preferredMixedPartners: formPreferredMixedPartners.length > 0 ? formPreferredMixedPartners : null
          }
        })
        notify({ variant: 'success', title: 'Spiller opdateret' })
      }
      await loadPlayers()
      setIsSheetOpen(false)
    } catch (err: any) {
      setError(err.message ?? 'Kunne ikke gemme spiller')
    }
  }

  /** Toggles player active status. */
  const toggleActive = useCallback(async (player: Player) => {
    try {
      // Save scroll position before update
      const tableContainer = document.querySelector('[data-table-container]') as HTMLElement
      if (tableContainer) {
        scrollPositionRef.current = tableContainer.scrollTop
        shouldRestoreScrollRef.current = true
      }
      
      await api.players.update({ id: player.id, patch: { active: !player.active } })
      await loadPlayers()
      
      notify({ variant: 'success', title: player.active ? 'Spiller deaktiveret' : 'Spiller aktiveret' })
    } catch (err: any) {
      setError(err.message ?? 'Kunne ikke opdatere spiller')
      shouldRestoreScrollRef.current = false
    }
  }, [loadPlayers, notify])

  /** Updates player primary category. */
  const updatePrimaryCategory = useCallback(async (player: Player, category: PlayerCategory | null) => {
    try {
      // Save scroll position before update
      const tableContainer = document.querySelector('[data-table-container]') as HTMLElement
      if (tableContainer) {
        scrollPositionRef.current = tableContainer.scrollTop
        shouldRestoreScrollRef.current = true
      }
      
      await api.players.update({ id: player.id, patch: { primaryCategory: category } })
      await loadPlayers()
      
      notify({ variant: 'success', title: 'Kategori opdateret' })
    } catch (err: any) {
      setError(err.message ?? 'Kunne ikke opdatere kategori')
      shouldRestoreScrollRef.current = false
    }
  }, [loadPlayers, notify])

  /** Memoized table column definitions with sort/filter logic. */
  const columns: Column<Player>[] = useMemo(
    () => [
      {
        id: 'name',
        header: 'Navn',
        sortable: true,
        sortValue: (row: Player) => row.name.toLowerCase(),
        cell: (row: Player) => (
          <div className="flex flex-col">
            <span className="font-semibold text-[hsl(var(--foreground))]">{row.name}</span>
            <span className="text-xs text-[hsl(var(--muted))]">{row.alias ?? 'Ingen kaldenavn'}</span>
          </div>
        )
      },
      {
        id: 'levelSingle',
        header: 'Rangliste Single',
        align: 'center',
        sortable: true,
        sortValue: (row) => row.levelSingle ?? 0,
        accessor: (row: Player) => row.levelSingle ?? '–'
      },
      {
        id: 'levelDouble',
        header: 'Rangliste Double',
        align: 'center',
        sortable: true,
        sortValue: (row) => row.levelDouble ?? 0,
        accessor: (row: Player) => row.levelDouble ?? '–'
      },
      {
        id: 'levelMix',
        header: 'Rangliste Mix',
        align: 'center',
        sortable: true,
        sortValue: (row) => row.levelMix ?? 0,
        accessor: (row: Player) => row.levelMix ?? '–'
      },
      {
        id: 'gender',
        header: 'Køn',
        align: 'center',
        sortable: true,
        sortValue: (row: Player) => row.gender ?? '',
        accessor: (row: Player) => row.gender ?? '–'
      },
      {
        id: 'primaryCategory',
        header: 'Primær kategori',
        align: 'center',
        sortable: true,
        sortValue: (row: Player) => row.primaryCategory ?? '',
        cell: (row: Player) => (
          <div className="flex items-center justify-center gap-1">
            {(['Single', 'Double', 'Begge'] as PlayerCategory[]).map((category) => {
              const isSelected = row.primaryCategory === category
              return (
                <button
                  key={category}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    updatePrimaryCategory(row, isSelected ? null : category)
                  }}
                  className={`px-2 py-1 text-xs font-medium rounded transition-all duration-200 ${
                    isSelected
                      ? 'bg-[hsl(var(--primary))] text-white ring-1 ring-[hsl(var(--primary)/.3)]'
                      : 'bg-[hsl(var(--surface-2))] text-[hsl(var(--muted))] hover:bg-[hsl(var(--surface-glass)/.85)] hover:text-[hsl(var(--foreground))] ring-1 ring-[hsl(var(--line)/.12)]'
                  }`}
                  title={isSelected ? 'Klik for at fjerne' : `Klik for at sætte til ${category}`}
                >
                  {category === 'Single' ? 'S' : category === 'Double' ? 'D' : 'B'}
                </button>
              )
            })}
          </div>
        )
      },
      {
        id: 'preferredDoublesPartner',
        header: 'Double makker',
        align: 'center',
        width: '200px',
        cell: (row: Player) => (
          <div className="w-full max-w-[200px] mx-auto">
            <EditablePartnerCell
              player={row}
              partnerType="doubles"
              allPlayers={allPlayersForDropdown}
              onUpdate={loadPlayers}
              notify={notify}
            />
          </div>
        )
      },
      {
        id: 'preferredMixedPartner',
        header: 'Mix makker',
        align: 'center',
        width: '200px',
        cell: (row: Player) => (
          <div className="w-full max-w-[200px] mx-auto">
            <EditablePartnerCell
              player={row}
              partnerType="mixed"
              allPlayers={allPlayersForDropdown}
              onUpdate={loadPlayers}
              notify={notify}
            />
          </div>
        )
      },
      {
        id: 'createdAt',
        header: 'Oprettet',
        sortable: true,
        sortValue: (row) => new Date(row.createdAt).getTime(),
        accessor: (row: Player) => formatDate(row.createdAt)
      },
      {
        id: 'status',
        header: 'Status',
        align: 'center',
        cell: (row: Player) => (
          <Badge variant={row.active ? 'success' : 'muted'}>{row.active ? 'Aktiv' : 'Inaktiv'}</Badge>
        )
      },
      {
        id: 'actions',
        header: 'Handling',
        align: 'right',
        cell: (row: Player) => (
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => openEdit(row)} aria-label={`Rediger ${row.name}`}>
              <Pencil size={16} />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => toggleActive(row)} aria-label={`Skift status for ${row.name}`}>
              <Trash2 size={16} />
            </Button>
          </div>
        )
      }
    ],
    [toggleActive, updatePrimaryCategory]
  )

  return (
    <section className="flex flex-col gap-6 pt-6">
      <header className="flex items-center justify-between mb-4">
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-[hsl(var(--foreground))]">Spillere</h1>
          <p className="text-base text-[hsl(var(--muted))] mt-1">Administrer medlemslisten og deres status.</p>
          {error && (
            <span className="mt-2 inline-block text-sm text-[hsl(var(--destructive))]">{error}</span>
          )}
        </div>
        <div className="flex gap-2">
          <label className="flex items-center gap-2 text-sm text-[hsl(var(--muted))] cursor-pointer">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(event) => setShowInactive(event.target.checked)}
              className="h-4 w-4 rounded bg-[hsl(var(--surface))] ring-1 ring-[hsl(var(--line)/.12)] focus:ring-2 focus:ring-[hsl(var(--ring))] outline-none transition-all duration-200 motion-reduce:transition-none"
            />
            Vis inaktive
          </label>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-lg text-sm font-medium whitespace-nowrap bg-[hsl(var(--surface-glass)/.85)] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--surface-glass)/.95)] ring-1 ring-[hsl(var(--line)/.12)] transition-all duration-200 ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] outline-none disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Plus size={16} />
            <span>Ny spiller</span>
          </button>
        </div>
      </header>

      <PageCard className="space-y-4">
        <TableSearch value={search} onChange={(value) => setSearch(value)} placeholder="Søg efter navn eller kaldenavn" />
        {loading ? (
          <div className="py-16 text-center text-[hsl(var(--muted))]">Henter spillere...</div>
        ) : (
          <DataTable
            data={filteredPlayers}
            columns={columns}
            initialSort={{ columnId: 'name', direction: 'asc' }}
            sort={sort}
            onSortChange={setSort}
            emptyState={
              <EmptyState
                icon={<UsersRound />}
                title="Ingen spillere"
                helper="Tilføj klubbens spillere for at komme i gang."
                action={<Button onClick={openCreate}>Ny spiller</Button>}
              />
            }
          />
        )}
      </PageCard>

      {isSheetOpen && (
        /* A11y: Dialog pattern — modal form with backdrop and role="dialog" */
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm transition-opacity duration-200 motion-reduce:transition-none" role="dialog" aria-modal="true">
          <div className="h-full w-full max-w-md ring-1 ring-[hsl(var(--line)/.12)] bg-[hsl(var(--surface)/.98)] backdrop-blur-md p-6 shadow-[0_2px_8px_hsl(var(--line)/.12)]">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-lg font-medium text-[hsl(var(--foreground))]">
                  {dialogMode === 'create' ? 'Ny spiller' : 'Rediger spiller'}
                </h3>
                <p className="text-sm text-[hsl(var(--muted))] mt-1">Udfyld oplysningerne og gem.</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setIsSheetOpen(false)}>
                Luk
              </Button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              <label className="flex flex-col gap-2 text-sm">
                <span className="font-medium text-[hsl(var(--foreground))]">Navn *</span>
                <input
                  value={formName}
                  onChange={(event) => setFormName(event.target.value)}
                  className="rounded-md bg-[hsl(var(--surface))] px-3 py-2 ring-1 ring-[hsl(var(--line)/.14)] focus:ring-2 focus:ring-[hsl(var(--ring))] outline-none transition-all duration-200 motion-reduce:transition-none text-[hsl(var(--foreground))]"
                  required
                />
              </label>
              <label className="flex flex-col gap-2 text-sm">
                <span className="font-medium text-[hsl(var(--foreground))]">Kaldenavn</span>
                <input
                  value={formAlias}
                  onChange={(event) => setFormAlias(event.target.value)}
                  className="rounded-md bg-[hsl(var(--surface))] px-3 py-2 ring-1 ring-[hsl(var(--line)/.14)] focus:ring-2 focus:ring-[hsl(var(--ring))] outline-none transition-all duration-200 motion-reduce:transition-none text-[hsl(var(--foreground))]"
                />
              </label>
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-[hsl(var(--foreground))]">Rangliste</h4>
                
                <label className="flex flex-col gap-2 text-sm">
                  <span className="font-medium text-[hsl(var(--foreground))]">Rangliste Single</span>
                  <input
                    type="number"
                    value={formLevelSingle}
                    onChange={(event) => setFormLevelSingle(event.target.value)}
                    className="rounded-md bg-[hsl(var(--surface))] px-3 py-2 ring-1 ring-[hsl(var(--line)/.14)] focus:ring-2 focus:ring-[hsl(var(--ring))] outline-none transition-all duration-200 motion-reduce:transition-none text-[hsl(var(--foreground))]"
                  />
                </label>
                
                <label className="flex flex-col gap-2 text-sm">
                  <span className="font-medium text-[hsl(var(--foreground))]">Rangliste Double</span>
                  <input
                    type="number"
                    value={formLevelDouble}
                    onChange={(event) => setFormLevelDouble(event.target.value)}
                    className="rounded-md bg-[hsl(var(--surface))] px-3 py-2 ring-1 ring-[hsl(var(--line)/.14)] focus:ring-2 focus:ring-[hsl(var(--ring))] outline-none transition-all duration-200 motion-reduce:transition-none text-[hsl(var(--foreground))]"
                  />
                </label>
                
                <label className="flex flex-col gap-2 text-sm">
                  <span className="font-medium text-[hsl(var(--foreground))]">Rangliste Mix</span>
                  <input
                    type="number"
                    value={formLevelMix}
                    onChange={(event) => setFormLevelMix(event.target.value)}
                    className="rounded-md bg-[hsl(var(--surface))] px-3 py-2 ring-1 ring-[hsl(var(--line)/.14)] focus:ring-2 focus:ring-[hsl(var(--ring))] outline-none transition-all duration-200 motion-reduce:transition-none text-[hsl(var(--foreground))]"
                  />
                </label>
              </div>
              <label className="flex flex-col gap-2 text-sm">
                <span className="font-medium text-[hsl(var(--foreground))]">Køn</span>
                <select
                  value={formGender}
                  onChange={(event) => setFormGender(event.target.value as PlayerGender | '')}
                  className="rounded-md bg-[hsl(var(--surface))] px-3 py-2 ring-1 ring-[hsl(var(--line)/.14)] focus:ring-2 focus:ring-[hsl(var(--ring))] outline-none transition-all duration-200 motion-reduce:transition-none text-[hsl(var(--foreground))]"
                >
                  <option value="">Vælg køn</option>
                  <option value="Herre">Herre</option>
                  <option value="Dame">Dame</option>
                </select>
              </label>
              <label className="flex flex-col gap-2 text-sm">
                <span className="font-medium text-[hsl(var(--foreground))]">Primær kategori</span>
                <select
                  value={formPrimaryCategory}
                  onChange={(event) => setFormPrimaryCategory(event.target.value as PlayerCategory | '')}
                  className="rounded-md bg-[hsl(var(--surface))] px-3 py-2 ring-1 ring-[hsl(var(--line)/.14)] focus:ring-2 focus:ring-[hsl(var(--ring))] outline-none transition-all duration-200 motion-reduce:transition-none text-[hsl(var(--foreground))]"
                >
                  <option value="">Vælg kategori</option>
                  <option value="Single">Single</option>
                  <option value="Double">Double</option>
                  <option value="Begge">Begge</option>
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm text-[hsl(var(--muted))] cursor-pointer">
                <input
                  type="checkbox"
                  checked={formActive}
                  onChange={(event) => setFormActive(event.target.checked)}
                  className="h-4 w-4 rounded bg-[hsl(var(--surface))] ring-1 ring-[hsl(var(--line)/.12)] focus:ring-2 focus:ring-[hsl(var(--ring))] outline-none transition-all duration-200 motion-reduce:transition-none"
                />
                Aktiv spiller
              </label>
              
              {/* Preferred Partners Section */}
              <div className="space-y-4 pt-4 border-t border-[hsl(var(--line)/.12)]">
                <h4 className="text-sm font-medium text-[hsl(var(--foreground))]">Fast makker</h4>
                
                <label className="flex flex-col gap-2 text-sm">
                  <span className="font-medium text-[hsl(var(--foreground))]">Double makker</span>
                  <select
                    value={formPreferredDoublesPartners[0] ?? ''}
                    onChange={(event) => {
                      const selectedId = event.target.value
                      setFormPreferredDoublesPartners(selectedId ? [selectedId] : [])
                    }}
                    className="rounded-md bg-[hsl(var(--surface))] px-3 py-2 ring-1 ring-[hsl(var(--line)/.14)] focus:ring-2 focus:ring-[hsl(var(--ring))] outline-none transition-all duration-200 motion-reduce:transition-none text-[hsl(var(--foreground))]"
                  >
                    <option value="">Ingen</option>
                    {players
                      .filter(p => {
                        // Exclude self only
                        if (p.id === currentPlayer?.id) return false
                        // Same gender for doubles partner
                        if (formGender === 'Herre') return p.gender === 'Herre'
                        if (formGender === 'Dame') return p.gender === 'Dame'
                        return true
                      })
                      .map((player) => (
                        <option key={player.id} value={player.id}>
                          {player.name} {player.alias ? `(${player.alias})` : ''}
                        </option>
                      ))}
                  </select>
                </label>
                
                <label className="flex flex-col gap-2 text-sm">
                  <span className="font-medium text-[hsl(var(--foreground))]">Mix makker</span>
                  <select
                    value={formPreferredMixedPartners[0] ?? ''}
                    onChange={(event) => {
                      const selectedId = event.target.value
                      setFormPreferredMixedPartners(selectedId ? [selectedId] : [])
                    }}
                    className="rounded-md bg-[hsl(var(--surface))] px-3 py-2 ring-1 ring-[hsl(var(--line)/.14)] focus:ring-2 focus:ring-[hsl(var(--ring))] outline-none transition-all duration-200 motion-reduce:transition-none text-[hsl(var(--foreground))]"
                  >
                    <option value="">Ingen</option>
                    {players
                      .filter(p => {
                        // Exclude self only
                        if (p.id === currentPlayer?.id) return false
                        // Opposite gender for mixed partner
                        if (formGender === 'Herre') return p.gender === 'Dame'
                        if (formGender === 'Dame') return p.gender === 'Herre'
                        return true
                      })
                      .map((player) => (
                        <option key={player.id} value={player.id}>
                          {player.name} {player.alias ? `(${player.alias})` : ''}
                        </option>
                      ))}
                  </select>
                </label>
              </div>
              
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="ghost" type="button" onClick={() => setIsSheetOpen(false)}>
                  Annuller
                </Button>
                <Button type="submit" className="ring-2 ring-[hsl(var(--accent)/.2)]">Gem spiller</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}

export default PlayersPage
