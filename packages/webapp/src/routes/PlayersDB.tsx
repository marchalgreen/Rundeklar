/**
 * Players page — manages player CRUD operations and listing.
 * 
 * @remarks Renders player table with search/sort, handles create/edit forms,
 * and delegates data operations to usePlayers hook. Uses sub-components for
 * partner editing and form management.
 */

import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { Player, PlayerCategory, PlayerGender, PlayerCreateInput, PlayerUpdateInput } from '@rundeklar/common'
import { Pencil, Plus, Trash2, UsersRound, Info, Download, Upload, HelpCircle, FileText, CheckSquare, Square, Edit, ArrowUpDown } from 'lucide-react'
import { Badge, Button, EmptyState, PageCard, Tooltip } from '../components/ui'
import { DataTable, TableSearch, type Column } from '../components/ui/Table'
import { EditablePartnerCell, PlayerForm } from '../components/players'
import { EditableTrainingGroupsCell } from '../components/players/EditableTrainingGroupsCell'
import { BulkEditModal } from '../components/players/BulkEditModal'
import { PlayerCard as PlayerCardMobile } from '../components/players/PlayerCard'
import { usePlayers, useSelection, useScrollRestoration } from '../hooks'
import { formatDate } from '../lib/formatting'
import { PLAYER_CATEGORIES } from '../constants'
import { useToast } from '../components/ui/Toast'
import api from '../api'

/**
 * Players page component.
 * 
 * @example
 * ```tsx
 * <PlayersPage />
 * ```
 */
const PlayersPage = () => {
  const { notify } = useToast()
  
  // Data hooks
  const [showInactive, setShowInactive] = useState(false)
  const [search, setSearch] = useState('')
  const { players, loading, error, createPlayer, updatePlayer, refetch } = usePlayers({
    q: search.trim() || undefined,
    active: showInactive ? undefined : true
  })

  // Get all players for dropdown (no filters)
  const { players: allPlayersForDropdown } = usePlayers({})

  // UI state
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create')
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [sort, setSort] = useState<{ columnId: string; direction: 'asc' | 'desc' } | undefined>({
    columnId: 'name',
    direction: 'asc'
  })

  // Use reusable hooks for selection and scroll restoration
  const selection = useSelection<string>()
  const scrollRestoration = useScrollRestoration({
    container: '[data-table-container]',
    autoRestore: true,
    restoreDependencies: [loading, players]
  })

  // Form state
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
  const [formTrainingGroups, setFormTrainingGroups] = useState<string[]>([])

  /**
   * Resets form state to initial values.
   */
  const resetForm = useCallback(() => {
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
    setFormTrainingGroups([])
    setCurrentPlayer(null)
  }, [])

  /**
   * Opens create player form dialog.
   */
  const openCreate = useCallback(() => {
    setDialogMode('create')
    resetForm()
    setIsSheetOpen(true)
  }, [resetForm])

  /**
   * Opens edit player form dialog with player data pre-filled.
   */
  const openEdit = useCallback(
    (player: Player) => {
    setDialogMode('edit')
    setCurrentPlayer(player)
    setFormName(player.name)
    setFormAlias(player.alias ?? '')
    setFormLevelSingle((player.levelSingle ?? null)?.toString() ?? '')
    setFormLevelDouble((player.levelDouble ?? null)?.toString() ?? '')
    setFormLevelMix((player.levelMix ?? null)?.toString() ?? '')
    setFormGender(player.gender ?? '')
    setFormPrimaryCategory(player.primaryCategory ?? '')
    setFormActive(player.active)
      setFormPreferredDoublesPartners((player.preferredDoublesPartners ?? null) ?? [])
      setFormPreferredMixedPartners((player.preferredMixedPartners ?? null) ?? [])
      setFormTrainingGroups((player.trainingGroups ?? null) ?? [])
    setIsSheetOpen(true)
    },
    []
  )

  /**
   * Handles form submission for create/edit player.
   */
  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
    event.preventDefault()
    if (!formName.trim()) return

      // Save scroll position before update (for edit mode)
      if (dialogMode === 'edit') {
        scrollRestoration.saveScrollPosition()
      }

    try {
      if (dialogMode === 'create') {
          const createInput: PlayerCreateInput = {
          name: formName.trim(),
          alias: formAlias.trim() || undefined,
            levelSingle: formLevelSingle ? Number(formLevelSingle) : undefined,
            levelDouble: formLevelDouble ? Number(formLevelDouble) : undefined,
            levelMix: formLevelMix ? Number(formLevelMix) : undefined,
          gender: formGender || undefined,
          primaryCategory: formPrimaryCategory || undefined,
            trainingGroups: formTrainingGroups,
            active: formActive,
            preferredDoublesPartners: formPreferredDoublesPartners.length > 0 ? formPreferredDoublesPartners : undefined,
            preferredMixedPartners: formPreferredMixedPartners.length > 0 ? formPreferredMixedPartners : undefined
          }
          await createPlayer(createInput)
      } else if (currentPlayer) {
          const patch: PlayerUpdateInput['patch'] = {
            name: formName.trim(),
            alias: formAlias || null,
            levelSingle: formLevelSingle ? Number(formLevelSingle) : null,
            levelDouble: formLevelDouble ? Number(formLevelDouble) : null,
            levelMix: formLevelMix ? Number(formLevelMix) : null,
            gender: formGender || null,
            primaryCategory: formPrimaryCategory || null,
            trainingGroups: formTrainingGroups,
            active: formActive,
            preferredDoublesPartners: formPreferredDoublesPartners.length > 0 ? formPreferredDoublesPartners : null,
            preferredMixedPartners: formPreferredMixedPartners.length > 0 ? formPreferredMixedPartners : null
      }
          await updatePlayer({
            id: currentPlayer.id,
            patch
          })
        }
      setIsSheetOpen(false)
      } catch {
        // Error is handled by the hook
      }
    },
    [
      formName,
      formAlias,
      formLevelSingle,
      formLevelDouble,
      formLevelMix,
      formGender,
      formPrimaryCategory,
      formActive,
      formPreferredDoublesPartners,
      formPreferredMixedPartners,
      formTrainingGroups,
      dialogMode,
      currentPlayer,
      createPlayer,
      updatePlayer,
      scrollRestoration.saveScrollPosition
    ]
  )

  /**
   * Toggles player active status.
   */
  const toggleActive = useCallback(
    async (player: Player) => {
      // Save scroll position before update
      scrollRestoration.saveScrollPosition()
      
      await updatePlayer({
        id: player.id,
        patch: { active: !player.active }
      })
    },
    [updatePlayer, scrollRestoration.saveScrollPosition]
  )

  /**
   * Updates player primary category.
   */
  const updatePrimaryCategory = useCallback(
    async (player: Player, category: PlayerCategory | null) => {
      // Save scroll position before update
      scrollRestoration.saveScrollPosition()

      await updatePlayer({
        id: player.id,
        patch: { primaryCategory: category }
      })
    },
    [updatePlayer, scrollRestoration.saveScrollPosition]
  )

  /**
   * Deletes a player.
   */
  const handleDelete = useCallback(
    async (player: Player) => {
      if (!confirm(`Er du sikker på, at du vil slette ${player.name}? Denne handling kan ikke fortrydes.`)) {
        return
      }

      // Save scroll position before delete
      scrollRestoration.saveScrollPosition()

      try {
        await api.players.delete(player.id)
        await refetch()
        notify({
          variant: 'success',
          title: 'Spiller slettet',
          description: `${player.name} er nu slettet`
        })
      } catch (err) {
        notify({
          variant: 'danger',
          title: 'Kunne ikke slette spiller',
          description: err instanceof Error ? err.message : 'Der opstod en fejl'
        })
      }
    },
    [refetch, notify, scrollRestoration.saveScrollPosition]
  )

  // Scroll restoration is handled by useScrollRestoration hook
  // The hook automatically restores scroll when dependencies change

  // Note: Search filtering is handled by API via usePlayers hook with q parameter
  // No client-side filtering needed - improves performance with large datasets

  /**
   * Exports players to CSV format.
   */
  const exportToCSV = useCallback(() => {
    try {
      // CSV headers
      const headers = [
        'Navn',
        'Kaldenavn',
        'Rangliste Single',
        'Rangliste Double',
        'Rangliste Mix',
        'Køn',
        'Primær kategori',
        'Træningsgrupper',
        'Double makker',
        'Mix makker',
        'Status',
        'Oprettet'
      ]

      // CSV rows
      const rows = players.map((player) => {
        const doublesPartner = player.preferredDoublesPartners?.[0]
          ? allPlayersForDropdown.find((p) => p.id === player.preferredDoublesPartners?.[0])?.name ?? ''
          : ''
        const mixedPartner = player.preferredMixedPartners?.[0]
          ? allPlayersForDropdown.find((p) => p.id === player.preferredMixedPartners?.[0])?.name ?? ''
          : ''
        const trainingGroups = (player.trainingGroups ?? []).join('; ')

        return [
          player.name,
          player.alias ?? '',
          player.levelSingle ?? '',
          player.levelDouble ?? '',
          player.levelMix ?? '',
          player.gender ?? '',
          player.primaryCategory ?? '',
          trainingGroups,
          doublesPartner,
          mixedPartner,
          player.active ? 'Aktiv' : 'Inaktiv',
          player.createdAt ? formatDate(player.createdAt) : ''
        ]
      })

      // Combine headers and rows
      const csvContent = [
        headers.join(','),
        ...rows.map((row) => row.map((cell) => {
          // Escape commas and quotes in cell values
          const cellStr = String(cell ?? '')
          if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
            return `"${cellStr.replace(/"/g, '""')}"`
          }
          return cellStr
        }).join(','))
      ].join('\n')

      // Create blob and download
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' }) // BOM for Excel compatibility
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `spillere_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      notify({
        variant: 'success',
        title: 'Eksport gennemført',
        description: `${players.length} spillere eksporteret til CSV`
      })
    } catch (err) {
      notify({
        variant: 'danger',
        title: 'Eksport fejlede',
        description: err instanceof Error ? err.message : 'Kunne ikke eksportere spillere'
      })
    }
  }, [players, allPlayersForDropdown, notify])

  /**
   * Parses CSV content into array of row arrays.
   * Handles quoted fields, escaped quotes, and newlines.
   */
  const parseCSV = useCallback((csvContent: string): string[][] => {
    const rows: string[][] = []
    let currentRow: string[] = []
    let currentField = ''
    let insideQuotes = false
    
    for (let i = 0; i < csvContent.length; i++) {
      const char = csvContent[i]
      const nextChar = csvContent[i + 1]
      
      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          // Escaped quote
          currentField += '"'
          i++ // Skip next quote
        } else {
          // Toggle quote state
          insideQuotes = !insideQuotes
        }
      } else if (char === ',' && !insideQuotes) {
        // Field separator
        currentRow.push(currentField.trim())
        currentField = ''
      } else if ((char === '\n' || char === '\r') && !insideQuotes) {
        // Row separator (skip \r\n)
        if (char === '\n' || (char === '\r' && nextChar !== '\n')) {
          if (currentField || currentRow.length > 0) {
            currentRow.push(currentField.trim())
            rows.push(currentRow)
            currentRow = []
            currentField = ''
          }
        }
      } else {
        currentField += char
      }
    }
    
    // Add last field and row
    if (currentField || currentRow.length > 0) {
      currentRow.push(currentField.trim())
      rows.push(currentRow)
    }
    
    return rows
  }, [])

  /**
   * Validates and converts CSV row to PlayerCreateInput.
   */
  const parsePlayerRow = useCallback((row: string[], headers: string[], rowIndex: number): { player: PlayerCreateInput | null; errors: string[] } => {
    const errors: string[] = []
    
    // Find column indices
    const nameIdx = headers.indexOf('Navn')
    const aliasIdx = headers.indexOf('Kaldenavn')
    const levelSingleIdx = headers.indexOf('Rangliste Single')
    const levelDoubleIdx = headers.indexOf('Rangliste Double')
    const levelMixIdx = headers.indexOf('Rangliste Mix')
    const genderIdx = headers.indexOf('Køn')
    const categoryIdx = headers.indexOf('Primær kategori')
    const trainingGroupsIdx = headers.indexOf('Træningsgrupper')
    const statusIdx = headers.indexOf('Status')
    
    // Validate required field
    if (nameIdx === -1 || !row[nameIdx]?.trim()) {
      errors.push(`Række ${rowIndex + 1}: Navn er påkrævet`)
      return { player: null, errors }
    }
    
    const name = row[nameIdx].trim()
    
    // Parse optional fields
    const alias = aliasIdx >= 0 && row[aliasIdx]?.trim() ? row[aliasIdx].trim() : undefined
    const levelSingle = levelSingleIdx >= 0 && row[levelSingleIdx]?.trim() ? parseInt(row[levelSingleIdx].trim(), 10) : undefined
    const levelDouble = levelDoubleIdx >= 0 && row[levelDoubleIdx]?.trim() ? parseInt(row[levelDoubleIdx].trim(), 10) : undefined
    const levelMix = levelMixIdx >= 0 && row[levelMixIdx]?.trim() ? parseInt(row[levelMixIdx].trim(), 10) : undefined
    
    // Validate gender
    let gender: PlayerGender | undefined = undefined
    if (genderIdx >= 0 && row[genderIdx]?.trim()) {
      const genderValue = row[genderIdx].trim()
      if (genderValue === 'Herre' || genderValue === 'Dame') {
        gender = genderValue as PlayerGender
      } else {
        errors.push(`Række ${rowIndex + 1}: Ugyldig køn værdi "${genderValue}" (skal være "Herre" eller "Dame")`)
      }
    }
    
    // Validate category
    let primaryCategory: PlayerCategory | undefined = undefined
    if (categoryIdx >= 0 && row[categoryIdx]?.trim()) {
      const categoryValue = row[categoryIdx].trim()
      if (categoryValue === 'Single' || categoryValue === 'Double' || categoryValue === 'Begge') {
        primaryCategory = categoryValue as PlayerCategory
      } else {
        errors.push(`Række ${rowIndex + 1}: Ugyldig kategori værdi "${categoryValue}" (skal være "Single", "Double" eller "Begge")`)
      }
    }
    
    // Parse training groups (semicolon-separated)
    let trainingGroups: string[] | undefined = undefined
    if (trainingGroupsIdx >= 0 && row[trainingGroupsIdx]?.trim()) {
      trainingGroups = row[trainingGroupsIdx]
        .split(';')
        .map(g => g.trim())
        .filter(g => g.length > 0)
    }
    
    // Parse status (default to active)
    const active = statusIdx >= 0 && row[statusIdx]?.trim() 
      ? row[statusIdx].trim().toLowerCase() === 'aktiv'
      : true
    
    // Validate levels are numbers if provided
    if (levelSingleIdx >= 0 && row[levelSingleIdx]?.trim() && isNaN(levelSingle!)) {
      errors.push(`Række ${rowIndex + 1}: Ugyldig rangliste single værdi "${row[levelSingleIdx]}"`)
    }
    if (levelDoubleIdx >= 0 && row[levelDoubleIdx]?.trim() && isNaN(levelDouble!)) {
      errors.push(`Række ${rowIndex + 1}: Ugyldig rangliste double værdi "${row[levelDoubleIdx]}"`)
    }
    if (levelMixIdx >= 0 && row[levelMixIdx]?.trim() && isNaN(levelMix!)) {
      errors.push(`Række ${rowIndex + 1}: Ugyldig rangliste mix værdi "${row[levelMixIdx]}"`)
    }
    
    const player: PlayerCreateInput = {
      name,
      ...(alias && { alias }),
      ...(levelSingle !== undefined && !isNaN(levelSingle) && { levelSingle }),
      ...(levelDouble !== undefined && !isNaN(levelDouble) && { levelDouble }),
      ...(levelMix !== undefined && !isNaN(levelMix) && { levelMix }),
      ...(gender && { gender }),
      ...(primaryCategory && { primaryCategory }),
      ...(trainingGroups && trainingGroups.length > 0 && { trainingGroups }),
      active
    }
    
    return { player, errors }
  }, [])

  /**
   * Handles CSV file import.
   */
  const handleImportCSV = useCallback(async (file: File) => {
    setIsImporting(true)
    
    try {
      // Read file content
      const text = await file.text()
      
      // Remove BOM if present
      const content = text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text
      
      // Parse CSV
      const rows = parseCSV(content)
      
      if (rows.length < 2) {
        throw new Error('CSV filen skal indeholde mindst en header række og en data række')
      }
      
      const headers = rows[0]
      const dataRows = rows.slice(1)
      
      // Validate headers
      if (!headers.includes('Navn')) {
        throw new Error('CSV filen skal indeholde en "Navn" kolonne')
      }
      
      // Parse and validate all rows
      const playersToCreate: PlayerCreateInput[] = []
      const allErrors: string[] = []
      
      for (let i = 0; i < dataRows.length; i++) {
        const { player, errors } = parsePlayerRow(dataRows[i], headers, i)
        if (errors.length > 0) {
          allErrors.push(...errors)
        }
        if (player) {
          playersToCreate.push(player)
        }
      }
      
      // Show validation errors if any
      if (allErrors.length > 0) {
        notify({
          variant: 'danger',
          title: 'Valideringsfejl i CSV fil',
          description: `${allErrors.length} fejl fundet. Første fejl: ${allErrors[0]}`,
        })
        setIsImporting(false)
        return
      }
      
      if (playersToCreate.length === 0) {
        notify({
          variant: 'default',
          title: 'Ingen spillere at importere',
          description: 'CSV filen indeholder ingen gyldige spillere'
        })
        setIsImporting(false)
        return
      }
      
      // Create players in batches to avoid overwhelming the API
      const batchSize = 10
      let created = 0
      let failed = 0
      const failedErrors: string[] = []
      
      for (let i = 0; i < playersToCreate.length; i += batchSize) {
        const batch = playersToCreate.slice(i, i + batchSize)
        const results = await Promise.allSettled(
          batch.map(player => createPlayer(player))
        )
        
        results.forEach((result, idx) => {
          if (result.status === 'fulfilled') {
            created++
          } else {
            failed++
            failedErrors.push(`${batch[idx].name}: ${result.reason?.message || 'Ukendt fejl'}`)
          }
        })
      }
      
      // Refresh player list
      await refetch()
      
      // Show results
      if (failed === 0) {
        notify({
          variant: 'success',
          title: 'Import gennemført',
          description: `${created} spillere importeret succesfuldt`
        })
      } else {
        notify({
          variant: 'danger',
          title: 'Delvis import gennemført',
          description: `${created} spillere importeret, ${failed} fejlede. Første fejl: ${failedErrors[0]}`
        })
      }
    } catch (err) {
      notify({
        variant: 'danger',
        title: 'Import fejlede',
        description: err instanceof Error ? err.message : 'Kunne ikke importere CSV fil'
      })
    } finally {
      setIsImporting(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }, [parseCSV, parsePlayerRow, createPlayer, refetch, notify])

  /**
   * Triggers file input click.
   */
  const triggerFileInput = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  /**
   * Handles file input change.
   */
  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (!file.name.endsWith('.csv')) {
        notify({
          variant: 'danger',
          title: 'Ugyldig filtype',
          description: 'Kun CSV filer kan importeres'
        })
        return
      }
      void handleImportCSV(file)
    }
  }, [handleImportCSV, notify])

  /**
   * Downloads an example CSV file with correct format.
   */
  const downloadExampleCSV = useCallback(() => {
    const headers = [
      'Navn',
      'Kaldenavn',
      'Rangliste Single',
      'Rangliste Double',
      'Rangliste Mix',
      'Køn',
      'Primær kategori',
      'Træningsgrupper',
      'Double makker',
      'Mix makker',
      'Status',
      'Oprettet'
    ]

    // Example rows with various data types
    const exampleRows = [
      [
        'Lars Nielsen',
        'Lasse',
        '5',
        '4',
        '5',
        'Herre',
        'Double',
        'A-gruppe; B-gruppe',
        '',
        '',
        'Aktiv',
        ''
      ],
      [
        'Anna Hansen',
        '',
        '3',
        '3',
        '2',
        'Dame',
        'Begge',
        'A-gruppe',
        '',
        '',
        'Aktiv',
        ''
      ],
      [
        'Peter Madsen',
        'Pete',
        '',
        '',
        '',
        'Herre',
        'Single',
        '',
        '',
        '',
        'Inaktiv',
        ''
      ]
    ]

    const csvContent = [
      headers.join(','),
      ...exampleRows.map((row) => row.map((cell) => {
        const cellStr = String(cell ?? '')
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`
        }
        return cellStr
      }).join(','))
    ].join('\n')

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'eksempel_spillere.csv'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    notify({
      variant: 'success',
      title: 'Eksempel CSV downloadet',
      description: 'Du kan nu redigere filen og uploade den'
    })
  }, [notify])

  // Selection is handled by useSelection hook
  // togglePlayerSelection -> selection.toggle
  // toggleSelectAll -> selection.toggleAll

  /**
   * Handles bulk edit save.
   */
  const handleBulkEditSave = useCallback(async (updates: {
    trainingGroups?: string[]
    active?: boolean
  }) => {
    if (selection.selectedCount === 0) return

    const selectedPlayers = players.filter(p => selection.isSelected(p.id))
    let successCount = 0
    let failCount = 0

    for (const player of selectedPlayers) {
      try {
        const updateData: PlayerUpdateInput['patch'] = {}

        // Update training groups (add to existing)
        if (updates.trainingGroups && updates.trainingGroups.length > 0) {
          const existingGroups = player.trainingGroups ?? []
          const newGroups = [...new Set([...existingGroups, ...updates.trainingGroups])]
          updateData.trainingGroups = newGroups
        }

        // Update active status
        if (updates.active !== undefined) {
          updateData.active = updates.active
        }

        if (Object.keys(updateData).length > 0) {
          await updatePlayer({ id: player.id, patch: updateData })
          successCount++
        }
      } catch (error) {
        failCount++
      }
    }

    // Refresh player list
    await refetch()

    // Clear selection
    selection.clear()

    // Show results
    if (failCount === 0) {
      notify({
        variant: 'success',
        title: 'Bulk redigering gennemført',
        description: `${successCount} spillere opdateret succesfuldt`
      })
    } else {
      notify({
        variant: 'danger',
        title: 'Delvis bulk redigering gennemført',
        description: `${successCount} spillere opdateret, ${failCount} fejlede`
      })
    }
  }, [selection.selected, players, updatePlayer, refetch, notify])

  /**
   * Memoized table column definitions with sort/filter logic.
   */
  const columns: Column<Player>[] = useMemo(
    () => [
      {
        id: 'select',
        header: (
          <button
            type="button"
            onClick={() => selection.toggleAll(players.map(p => p.id))}
            className="p-1 rounded hover:bg-[hsl(var(--surface-2)/.5)] transition-colors"
            aria-label={selection.isAllSelected(players.map(p => p.id)) ? 'Fjern markering' : 'Vælg alle'}
          >
            {selection.isAllSelected(players.map(p => p.id)) && players.length > 0 ? (
              <CheckSquare size={18} className="text-[hsl(var(--primary))]" />
            ) : (
              <Square size={18} className="text-[hsl(var(--muted))]" />
            )}
          </button>
        ),
        cell: (row: Player) => (
          <button
            type="button"
            onClick={() => selection.toggle(row.id)}
            className="p-1 rounded hover:bg-[hsl(var(--surface-2)/.5)] transition-colors"
            aria-label={`${selection.isSelected(row.id) ? 'Fjern' : 'Vælg'} ${row.name}`}
          >
            {selection.isSelected(row.id) ? (
              <CheckSquare size={18} className="text-[hsl(var(--primary))]" />
            ) : (
              <Square size={18} className="text-[hsl(var(--muted))]" />
            )}
          </button>
        ),
        width: '50px',
        align: 'center' as const
      },
      {
        id: 'name',
        header: 'Navn',
        sortable: true,
        sortValue: (row: Player) => row.name.toLowerCase(),
        cell: (row: Player) => (
          <div className="flex flex-col">
            <span className="font-semibold text-[hsl(var(--foreground))]">{row.name}</span>
            <span className="text-xs text-[hsl(var(--muted))]">
              {row.alias ?? 'Ingen kaldenavn'}
            </span>
          </div>
        )
      },
      {
        id: 'levelSingle',
        header: (
          <div className="flex items-center gap-1.5">
            <span>Rangliste Single</span>
            <Tooltip 
              content="Rangliste niveau fra BadmintonPlayer.dk. Højere tal = højere niveau. Bruges til matchmaking og statistikker."
              position="top"
            >
              <Info className="h-3.5 w-3.5 text-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]" />
            </Tooltip>
          </div>
        ),
        align: 'center',
        sortable: true,
        sortValue: (row) => (row.levelSingle ?? null) ?? 0,
        accessor: (row: Player) => (row.levelSingle ?? null) ?? '–'
      },
      {
        id: 'levelDouble',
        header: (
          <div className="flex items-center gap-1.5">
            <span>Rangliste Double</span>
            <Tooltip 
              content="Rangliste niveau fra BadmintonPlayer.dk for double. Højere tal = højere niveau. Bruges til matchmaking og statistikker."
              position="top"
            >
              <Info className="h-3.5 w-3.5 text-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]" />
            </Tooltip>
          </div>
        ),
        align: 'center',
        sortable: true,
        sortValue: (row) => (row.levelDouble ?? null) ?? 0,
        accessor: (row: Player) => (row.levelDouble ?? null) ?? '–'
      },
      {
        id: 'levelMix',
        header: (
          <div className="flex items-center gap-1.5">
            <span>Rangliste Mix</span>
            <Tooltip 
              content="Rangliste niveau fra BadmintonPlayer.dk for mixed double. Højere tal = højere niveau. Bruges til matchmaking og statistikker."
              position="top"
            >
              <Info className="h-3.5 w-3.5 text-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]" />
            </Tooltip>
          </div>
        ),
        align: 'center',
        sortable: true,
        sortValue: (row) => (row.levelMix ?? null) ?? 0,
        accessor: (row: Player) => (row.levelMix ?? null) ?? '–'
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
            {([PLAYER_CATEGORIES.SINGLE, PLAYER_CATEGORIES.DOUBLE, PLAYER_CATEGORIES.BOTH] as PlayerCategory[]).map(
              (category) => {
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
                    {category === PLAYER_CATEGORIES.SINGLE
                      ? 'S'
                      : category === PLAYER_CATEGORIES.DOUBLE
                        ? 'D'
                        : 'B'}
                </button>
              )
              }
            )}
          </div>
        )
      },
      {
        id: 'trainingGroups',
        header: 'Træningsgrupper',
        align: 'center',
        sortable: true,
        sortValue: (row: Player) => {
          const groups = row.trainingGroups ?? []
          return groups.join(' | ')
        },
        cell: (row: Player) => (
          <EditableTrainingGroupsCell
            player={row}
            onUpdate={refetch}
            onBeforeUpdate={scrollRestoration.saveScrollPosition}
          />
        )
      },
      {
        id: 'preferredDoublesPartner',
        header: (
          <div className="flex items-center gap-1.5">
            <span>Double makker</span>
            <Tooltip 
              content="Foretrukken double makker. Partner-relationer er tovejs - når du vælger en makker, opdateres begge spilleres preferencer automatisk."
              position="top"
            >
              <Info className="h-3.5 w-3.5 text-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]" />
            </Tooltip>
          </div>
        ),
        align: 'center',
        width: '200px',
        cell: (row: Player) => (
          <div className="w-full max-w-[200px] mx-auto">
            <EditablePartnerCell
              player={row}
              partnerType="doubles"
              allPlayers={allPlayersForDropdown}
              onUpdate={refetch}
              onBeforeUpdate={scrollRestoration.saveScrollPosition}
            />
          </div>
        )
      },
      {
        id: 'preferredMixedPartner',
        header: (
          <div className="flex items-center gap-1.5">
            <span>Mix makker</span>
            <Tooltip 
              content="Foretrukken mixed double makker. Partner-relationer er tovejs - når du vælger en makker, opdateres begge spilleres preferencer automatisk."
              position="top"
            >
              <Info className="h-3.5 w-3.5 text-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]" />
            </Tooltip>
          </div>
        ),
        align: 'center',
        width: '200px',
        cell: (row: Player) => (
          <div className="w-full max-w-[200px] mx-auto">
            <EditablePartnerCell
              player={row}
              partnerType="mixed"
              allPlayers={allPlayersForDropdown}
              onUpdate={refetch}
              onBeforeUpdate={scrollRestoration.saveScrollPosition}
            />
          </div>
        )
      },
      {
        id: 'createdAt',
        header: 'Oprettet',
        sortable: true,
        sortValue: (row) => new Date(row.createdAt).getTime(),
        accessor: (row: Player) => formatDate(row.createdAt, true)
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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openEdit(row)}
              aria-label={`Rediger ${row.name}`}
            >
              <Pencil size={16} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleActive(row)}
              aria-label={`Skift status for ${row.name}`}
            >
              <Trash2 size={16} />
            </Button>
          </div>
        )
      }
    ],
    [allPlayersForDropdown, refetch, toggleActive, updatePrimaryCategory, openEdit, scrollRestoration.saveScrollPosition, selection, players]
  )

  // Sort data for mobile card view
  const sortedData = useMemo(() => {
    if (!sort) return players
    const column = columns.find((col) => col.id === sort.columnId)
    if (!column || !column.sortValue) return players
    const copy = [...players]
    copy.sort((a, b) => {
      const aValue = column.sortValue!(a)
      const bValue = column.sortValue!(b)
      if (aValue < bValue) return sort.direction === 'asc' ? -1 : 1
      if (aValue > bValue) return sort.direction === 'asc' ? 1 : -1
      return 0
    })
    return copy
  }, [players, columns, sort])

  return (
    <section className="flex flex-col gap-4 sm:gap-6 pt-2 sm:pt-4 xl:pt-2">
      <header className="flex flex-col gap-2 sm:gap-3 mb-2 lg:mb-1.5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-xl font-semibold text-[hsl(var(--foreground))]">Spillere</h1>
            <p className="text-xs sm:text-sm md:text-base text-[hsl(var(--muted))] mt-1">Administrer medlemslisten og deres status.</p>
            {error && (
              <span className="mt-2 inline-block text-sm text-[hsl(var(--destructive))]">{error}</span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
          <label className="flex items-center gap-2 text-sm text-[hsl(var(--muted))] cursor-pointer">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(event) => setShowInactive(event.target.checked)}
              className="h-4 w-4 rounded bg-[hsl(var(--surface))] ring-1 ring-[hsl(var(--line)/.12)] focus:ring-2 focus:ring-[hsl(var(--ring))] outline-none transition-all duration-200 motion-reduce:transition-none"
            />
            Vis inaktive
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
            aria-label="Import CSV fil"
          />
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="md"
              onClick={triggerFileInput}
              disabled={isImporting || loading}
            >
              <Upload size={18} />
              <span className="hidden sm:inline">{isImporting ? 'Importerer...' : 'Importer CSV'}</span>
              <span className="sm:hidden">{isImporting ? '...' : 'Import'}</span>
            </Button>
            <Tooltip content="Download eksempel CSV fil med korrekt format">
              <Button
                variant="ghost"
                size="md"
                onClick={downloadExampleCSV}
                className="p-2"
                aria-label="Download eksempel CSV"
              >
                <FileText size={18} />
              </Button>
            </Tooltip>
          </div>
          <Button
            variant="secondary"
            size="md"
            onClick={exportToCSV}
            disabled={players.length === 0 || loading}
          >
            <Download size={18} />
            <span className="hidden sm:inline">Eksporter CSV</span>
            <span className="sm:hidden">Export</span>
          </Button>
          {selection.selectedCount > 0 && (
            <Button
              variant="primary"
              size="md"
              onClick={() => setIsBulkEditOpen(true)}
            >
              <Edit size={18} />
              <span className="hidden sm:inline">Rediger {selection.selectedCount}</span>
              <span className="sm:hidden">{selection.selectedCount}</span>
            </Button>
          )}
          <Button
            variant="secondary"
            size="md"
            onClick={openCreate}
          >
            <Plus size={18} />
            <span>Ny spiller</span>
          </Button>
          </div>
        </div>
      </header>

      <PageCard className="space-y-3 sm:space-y-4">
        <TableSearch
          value={search}
          onChange={(value) => setSearch(value)}
          placeholder="Søg efter navn eller kaldenavn"
        />
        {loading ? (
          <div className="py-16 text-center text-[hsl(var(--muted))]">Henter spillere...</div>
        ) : (
          <>
            {/* Desktop: Table view */}
            <div className="hidden md:block">
              <DataTable
                data={players}
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
            </div>
            
            {/* Mobile: Card view */}
            <div className="md:hidden space-y-3">
              {players.length === 0 ? (
                <EmptyState
                  icon={<UsersRound />}
                  title="Ingen spillere"
                  helper="Tilføj klubbens spillere for at komme i gang."
                  action={<Button onClick={openCreate}>Ny spiller</Button>}
                />
              ) : (
                <>
                  {/* Sort controls for mobile */}
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-[hsl(var(--line)/.12)]">
                    <span className="text-sm text-[hsl(var(--muted))]">
                      {players.length} {players.length === 1 ? 'spiller' : 'spillere'}
                    </span>
                    <select
                      value={sort?.columnId || 'name'}
                      onChange={(e) => {
                        const columnId = e.target.value
                        const currentDirection = sort?.columnId === columnId ? sort.direction : 'asc'
                        setSort({ columnId, direction: currentDirection })
                      }}
                      className="text-sm px-2 py-1 rounded border border-[hsl(var(--line)/.12)] bg-[hsl(var(--surface))] text-[hsl(var(--foreground))]"
                    >
                      <option value="name">Navn</option>
                      <option value="levelSingle">Rangliste Single</option>
                      <option value="levelDouble">Rangliste Double</option>
                      <option value="levelMix">Rangliste Mix</option>
                      <option value="createdAt">Oprettet</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        if (sort) {
                          setSort({
                            ...sort,
                            direction: sort.direction === 'asc' ? 'desc' : 'asc'
                          })
                        }
                      }}
                      className="p-1 rounded hover:bg-[hsl(var(--surface-2)/.5)] transition-colors"
                      aria-label="Sorteringsretning"
                    >
                      <ArrowUpDown size={16} className="text-[hsl(var(--muted))]" />
                    </button>
                  </div>
                  
                  {/* Player cards */}
                  <div className="space-y-3">
                    {sortedData.map((player) => (
                      <PlayerCardMobile
                        key={player.id}
                        player={player}
                        isSelected={selection.isSelected(player.id)}
                        onToggleSelection={selection.toggle}
                        onEdit={openEdit}
                        onDelete={handleDelete}
                        allPlayers={allPlayersForDropdown}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </PageCard>

      <BulkEditModal
        isOpen={isBulkEditOpen}
        selectedPlayers={players.filter(p => selection.isSelected(p.id))}
        onClose={() => setIsBulkEditOpen(false)}
        onSave={handleBulkEditSave}
      />

      <PlayerForm
        isOpen={isSheetOpen}
        mode={dialogMode}
        currentPlayer={currentPlayer}
        allPlayers={allPlayersForDropdown}
        formState={{
          name: formName,
          alias: formAlias,
          levelSingle: formLevelSingle,
          levelDouble: formLevelDouble,
          levelMix: formLevelMix,
          gender: formGender,
          primaryCategory: formPrimaryCategory,
          active: formActive,
          preferredDoublesPartners: formPreferredDoublesPartners,
          preferredMixedPartners: formPreferredMixedPartners,
          trainingGroups: formTrainingGroups
        }}
        formSetters={{
          setName: setFormName,
          setAlias: setFormAlias,
          setLevelSingle: setFormLevelSingle,
          setLevelDouble: setFormLevelDouble,
          setLevelMix: setFormLevelMix,
          setGender: setFormGender,
          setPrimaryCategory: setFormPrimaryCategory,
          setActive: setFormActive,
          setPreferredDoublesPartners: setFormPreferredDoublesPartners,
          setPreferredMixedPartners: setFormPreferredMixedPartners,
          setTrainingGroups: setFormTrainingGroups
        }}
        onSubmit={handleSubmit}
        onClose={() => setIsSheetOpen(false)}
      />
    </section>
  )
}

export default PlayersPage
