-- Migration: Add match_results table for storing match scores and results
-- This allows tracking detailed match results with sport-specific scoring
-- Run this AFTER the initial schema migration and tenant isolation migration

-- Match results table
CREATE TABLE match_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  sport TEXT NOT NULL CHECK (sport IN ('badminton', 'tennis', 'padel')),
  score_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  winner_team TEXT NOT NULL CHECK (winner_team IN ('team1', 'team2')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tenant_id TEXT NOT NULL DEFAULT 'default',
  UNIQUE(match_id, tenant_id)
);

-- Create indexes for common queries
CREATE INDEX idx_match_results_match_id ON match_results(match_id);
CREATE INDEX idx_match_results_tenant_id ON match_results(tenant_id);
CREATE INDEX idx_match_results_sport ON match_results(sport);
CREATE INDEX idx_match_results_created_at ON match_results(created_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_match_results_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER match_results_updated_at
  BEFORE UPDATE ON match_results
  FOR EACH ROW
  EXECUTE FUNCTION update_match_results_updated_at();

-- Add RLS policies (application layer enforces tenant isolation)
ALTER TABLE match_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow tenant read access on match_results" ON match_results
  FOR SELECT USING (true); -- Application layer filters by tenant_id

CREATE POLICY "Allow tenant insert access on match_results" ON match_results
  FOR INSERT WITH CHECK (true); -- Application layer sets tenant_id

CREATE POLICY "Allow tenant update access on match_results" ON match_results
  FOR UPDATE USING (true); -- Application layer filters by tenant_id

CREATE POLICY "Allow tenant delete access on match_results" ON match_results
  FOR DELETE USING (true); -- Application layer filters by tenant_id

-- Note: Application-level filtering ensures tenant isolation
-- All queries must include WHERE tenant_id = ? clause


