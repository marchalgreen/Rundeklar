-- Migration: Add isolation_id for demo tenant browser isolation
-- This allows multiple users on demo tenant to have isolated experiences
-- Production tenants are unaffected (isolation_id remains NULL)

-- Add isolation_id column to relevant tables
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS isolation_id TEXT;
ALTER TABLE check_ins ADD COLUMN IF NOT EXISTS isolation_id TEXT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS isolation_id TEXT;
ALTER TABLE match_players ADD COLUMN IF NOT EXISTS isolation_id TEXT;

-- Create indexes for performance (only for rows with isolation_id)
-- These partial indexes only index rows where isolation_id IS NOT NULL
-- This ensures production queries (with NULL isolation_id) are not affected
CREATE INDEX IF NOT EXISTS idx_training_sessions_isolation 
  ON training_sessions(tenant_id, isolation_id) 
  WHERE isolation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_check_ins_isolation 
  ON check_ins(tenant_id, isolation_id) 
  WHERE isolation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_matches_isolation 
  ON matches(tenant_id, isolation_id) 
  WHERE isolation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_match_players_isolation 
  ON match_players(tenant_id, isolation_id) 
  WHERE isolation_id IS NOT NULL;

-- Verify migration
-- All existing rows should have isolation_id = NULL
-- SELECT COUNT(*) FROM training_sessions WHERE isolation_id IS NOT NULL; -- Should return 0

