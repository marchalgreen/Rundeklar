import { readdir, readFile, writeFile, mkdir } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import type { TenantConfig } from '@rundeklar/common'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/**
 * Normalize Danish characters to ASCII equivalents
 * @param str - String to normalize
 * @returns String with Danish characters converted (æ→ae, ø→oe, å→aa)
 */
function normalizeDanishChars(str: string): string {
  return str
    .replace(/æ/g, 'ae')
    .replace(/ø/g, 'oe')
    .replace(/å/g, 'aa')
    .replace(/Æ/g, 'Ae')
    .replace(/Ø/g, 'Oe')
    .replace(/Å/g, 'Aa')
}

/**
 * Generate short tenant ID from initials for long names
 * @param name - Club name (e.g., "Københavns Bedste Drenge Badmintonklub")
 * @returns Short tenant ID (e.g., "kbdb")
 */
function generateShortTenantId(name: string): string {
  // Normalize Danish characters first
  const normalized = normalizeDanishChars(name)
  
  // Get all words (including stop words for initials)
  const allWords = normalized
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters (after normalization)
    .split(/\s+/)
    .filter(word => word.length > 0)
  
  if (allWords.length === 0) return 'club'
  
  // If only one word, use first 8 characters
  if (allWords.length === 1) {
    return allWords[0].substring(0, 8)
  }
  
  // Generate initials from first letters of ALL words
  let initials = allWords.map(word => word[0]).join('')
  
  // If initials are too short (< 3), add more letters from first word
  if (initials.length < 3 && allWords[0].length > 1) {
    initials = allWords[0].substring(0, Math.min(4, allWords[0].length)) + initials.substring(1)
  }
  
  // Limit to 8 characters max
  return initials.substring(0, 8)
}

/**
 * Convert tenant name to valid subdomain
 * @param name - Tenant name (e.g., "Herlev/Hjorten")
 * @returns Valid subdomain (e.g., "herlev-hjorten" or "kbdb" for long names)
 */
export function nameToSubdomain(name: string): string {
  // Normalize Danish characters first
  const normalized = normalizeDanishChars(name)
  
  // First, remove stop words to get meaningful words
  const stopWords = ['badmintonklub', 'badminton', 'klub', 'forening', 'sport', 'club']
  const meaningfulWords = normalized
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters (after normalization)
    .split(/\s+/)
    .filter(word => word.length > 0 && !stopWords.includes(word))
  
  if (meaningfulWords.length === 0) {
    return 'club'
  }
  
  // Create cleaned version from meaningful words
  const cleaned = meaningfulWords
    .join('-') // Join with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
  
  // If cleaned name is longer than 20 characters, use short version
  if (cleaned.length > 20) {
    return generateShortTenantId(name)
  }
  
  return cleaned
}

/**
 * Validate subdomain format
 * @param subdomain - Subdomain to validate
 * @returns Object with isValid and errors
 */
export function validateSubdomain(subdomain: string): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!subdomain || subdomain.length === 0) {
    errors.push('Subdomain is required')
  }

  if (subdomain.length < 3) {
    errors.push('Subdomain must be at least 3 characters')
  }

  if (subdomain.length > 63) {
    errors.push('Subdomain must be less than 63 characters')
  }

  if (!/^[a-z0-9-]+$/.test(subdomain)) {
    errors.push('Subdomain can only contain lowercase letters, numbers, and hyphens')
  }

  if (subdomain.startsWith('-') || subdomain.endsWith('-')) {
    errors.push('Subdomain cannot start or end with a hyphen')
  }

  // Reserved subdomains
  const reserved = ['www', 'demo', 'api', 'admin', 'mail', 'ftp', 'localhost', 'marketing']
  if (reserved.includes(subdomain)) {
    errors.push(`Subdomain "${subdomain}" is reserved`)
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Check if subdomain is available (not already used)
 * @param subdomain - Subdomain to check
 * @returns True if available
 */
export async function isSubdomainAvailable(subdomain: string): Promise<boolean> {
  try {
    const tenantsDir = join(process.cwd(), 'packages/webapp/src/config/tenants')
    const files = await readdir(tenantsDir)
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const tenantId = file.replace('.json', '')
        if (tenantId === subdomain) {
          return false
        }
        
        // Also check subdomain field in config
        try {
          const configPath = join(tenantsDir, file)
          const configContent = await readFile(configPath, 'utf-8')
          const config = JSON.parse(configContent) as TenantConfig & { subdomain?: string }
          if (config.subdomain && config.subdomain === subdomain) {
            return false
          }
        } catch {
          // Ignore errors reading config
        }
      }
    }
    
    return true
  } catch {
    // If we can't check, assume available (will fail later during creation)
    return true
  }
}

/**
 * Create tenant config file
 * @param tenantData - Tenant configuration data
 * @returns Created tenant config
 */
export async function createTenantConfig(tenantData: {
  id: string
  name: string
  subdomain: string
  logo?: string
  maxCourts?: number
  features?: Record<string, any>
  postgresUrl?: string
}): Promise<TenantConfig> {
  const config: TenantConfig = {
    id: tenantData.id,
    name: tenantData.name,
    subdomain: tenantData.subdomain,
    logo: tenantData.logo || 'fulllogo_transparent_nobuffer_horizontal.png',
    maxCourts: tenantData.maxCourts || 8,
    features: tenantData.features || {},
    ...(tenantData.postgresUrl && { postgresUrl: tenantData.postgresUrl })
  }

  // Try multiple possible paths for tenant configs directory
  const possibleBasePaths = [
    join(process.cwd(), 'packages/webapp/src/config/tenants'),
    join(process.cwd(), 'src/config/tenants'),
    join(__dirname, '../../config/tenants'),
    join(__dirname, '../../../config/tenants')
  ]
  
  let configDir: string | null = null
  for (const basePath of possibleBasePaths) {
    try {
      await readdir(basePath)
      configDir = basePath
      break
    } catch {
      // Try next path
      continue
    }
  }
  
  if (!configDir) {
    // Use the first path and create directory if it doesn't exist
    configDir = possibleBasePaths[0]
    try {
      await mkdir(configDir, { recursive: true })
    } catch (error) {
      throw new Error(`Failed to create tenant config directory at ${configDir}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  // Write config file
  const configPath = join(configDir, `${tenantData.id}.json`)
  
  try {
    await writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8')
  } catch (error) {
    throw new Error(`Failed to write tenant config file at ${configPath}: ${error instanceof Error ? error.message : String(error)}`)
  }
  
  return config
}

/**
 * Get all tenant configs
 * @returns Array of tenant configs
 */
export async function getAllTenantConfigs(): Promise<TenantConfig[]> {
  try {
    // Try multiple possible paths for tenant configs directory
    const possiblePaths = [
      join(process.cwd(), 'packages/webapp/src/config/tenants'),
      join(process.cwd(), 'src/config/tenants'),
      join(__dirname, '../../config/tenants'),
      join(__dirname, '../../../config/tenants')
    ]
    
    let tenantsDir: string | null = null
    for (const path of possiblePaths) {
      try {
        await readdir(path)
        tenantsDir = path
        break
      } catch {
        // Try next path
      }
    }
    
    if (!tenantsDir) {
      console.warn('Tenant configs directory not found. Tried:', possiblePaths)
      return []
    }
    
    const files = await readdir(tenantsDir)
    const configs: TenantConfig[] = []
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const configPath = join(tenantsDir, file)
          const configContent = await readFile(configPath, 'utf-8')
          const config = JSON.parse(configContent) as TenantConfig
          configs.push(config)
        } catch (error) {
          console.warn(`Failed to read tenant config ${file}:`, error)
          // Ignore errors reading config
        }
      }
    }
    
    return configs
  } catch (error) {
    console.error('Failed to get tenant configs:', error)
    return []
  }
}

/**
 * Get tenant config by ID
 * @param tenantId - Tenant ID
 * @returns Tenant config or null
 */
export async function getTenantConfig(tenantId: string): Promise<TenantConfig | null> {
  try {
    // Try multiple possible paths for tenant configs directory
    const possiblePaths = [
      join(process.cwd(), 'packages/webapp/src/config/tenants'),
      join(process.cwd(), 'src/config/tenants'),
      join(__dirname, '../../config/tenants'),
      join(__dirname, '../../../config/tenants')
    ]
    
    for (const basePath of possiblePaths) {
      try {
        const configPath = join(basePath, `${tenantId}.json`)
        const configContent = await readFile(configPath, 'utf-8')
        return JSON.parse(configContent) as TenantConfig
      } catch {
        // Try next path
        continue
      }
    }
    
    return null
  } catch (error) {
    console.error(`Failed to get tenant config for ${tenantId}:`, error)
    return null
  }
}

