/**
 * Group selection utilities for multi-group training session support.
 * 
 * Provides functions for toggling group selection, normalizing group IDs
 * for backward compatibility, and validating group ID arrays.
 */

/**
 * Toggles a group ID in an array of selected group IDs.
 * If the group ID is already in the array, it is removed.
 * If the group ID is not in the array, it is added.
 * 
 * @param groupIds - Current array of selected group IDs
 * @param id - Group ID to toggle
 * @returns New array with the group ID toggled
 * 
 * @example
 * ```ts
 * toggleGroupId(['A', 'B'], 'A') // Returns ['B']
 * toggleGroupId(['A', 'B'], 'C') // Returns ['A', 'B', 'C']
 * ```
 */
export function toggleGroupId(groupIds: string[], id: string): string[] {
  const index = groupIds.indexOf(id)
  if (index === -1) {
    // Add group ID if not present
    return [...groupIds, id]
  } else {
    // Remove group ID if present
    return groupIds.filter((gid) => gid !== id)
  }
}

/**
 * Normalizes group IDs to an array format for backward compatibility.
 * Converts single groupId (string | null) from old format to new array format.
 * 
 * @param input - Group ID input in various formats (string, string[], or null)
 * @returns Array of group IDs (empty array if input is null or empty)
 * 
 * @example
 * ```ts
 * normalizeGroupIds('A') // Returns ['A']
 * normalizeGroupIds(['A', 'B']) // Returns ['A', 'B']
 * normalizeGroupIds(null) // Returns []
 * normalizeGroupIds('') // Returns []
 * ```
 */
export function normalizeGroupIds(input: string | string[] | null | undefined): string[] {
  if (!input) {
    return []
  }
  
  if (Array.isArray(input)) {
    // Filter out empty strings and null values, and trim whitespace
    return input
      .map((id) => (typeof id === 'string' ? id.trim() : id))
      .filter((id): id is string => Boolean(id))
  }
  
  // Single string - convert to array
  return input.trim() ? [input.trim()] : []
}

/**
 * Validates an array of group IDs.
 * Checks that the array is non-empty and contains only non-empty strings.
 * 
 * @param groupIds - Array of group IDs to validate
 * @returns True if the array is valid (non-empty and contains valid IDs)
 * 
 * @example
 * ```ts
 * validateGroupIds(['A', 'B']) // Returns true
 * validateGroupIds([]) // Returns false
 * validateGroupIds(['', 'B']) // Returns false
 * ```
 */
export function validateGroupIds(groupIds: string[]): boolean {
  if (!Array.isArray(groupIds)) {
    return false
  }
  
  if (groupIds.length === 0) {
    return false
  }
  
  // Check that all IDs are non-empty strings
  return groupIds.every((id) => typeof id === 'string' && id.trim().length > 0)
}

