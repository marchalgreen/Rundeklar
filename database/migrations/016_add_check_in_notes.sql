-- Migration: Add notes column to check_ins table
-- This allows players to add optional notes about training preferences (e.g., preferred partners)
-- Run this AFTER the initial schema migration and tenant isolation migration

-- Add notes column to check_ins table
ALTER TABLE check_ins ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add comment to document the column purpose
COMMENT ON COLUMN check_ins.notes IS 'Optional notes from player about training preferences';

-- Note: Column is nullable by default, so no default value needed
-- Existing check-ins will have NULL notes, which is the desired behavior

