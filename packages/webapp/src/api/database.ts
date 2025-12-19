import { createBackup, hasBackup, restoreFromBackup } from './postgres'

export const databaseApi = {
  createBackup,
  restoreFromBackup,
  hasBackup
}
