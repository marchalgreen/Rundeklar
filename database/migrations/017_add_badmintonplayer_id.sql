-- Migration: Add badmintonplayer_id column to players table
-- This allows matching players with their BadmintonPlayer.dk profiles for automatic ranking updates
-- Run this AFTER the initial schema migration

-- Add badmintonplayer_id column to players table
ALTER TABLE players ADD COLUMN IF NOT EXISTS badmintonplayer_id TEXT;

-- Create index for faster lookups when matching players
CREATE INDEX IF NOT EXISTS idx_players_badmintonplayer_id ON players(badmintonplayer_id);

-- Add comment to document the column purpose
COMMENT ON COLUMN players.badmintonplayer_id IS 'BadmintonPlayer.dk player ID used for matching and automatic ranking updates';

-- Note: Column is nullable by default, so no default value needed
-- Existing players will have NULL badmintonplayer_id, which is the desired behavior
-- Players without this ID will not be updated automatically

