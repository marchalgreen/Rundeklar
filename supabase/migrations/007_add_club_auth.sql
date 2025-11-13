-- Migration: Add club authentication tables
-- Creates clubs, club_sessions, and club_login_attempts tables for JWT-based auth
-- Supports email verification, password reset, and two-factor authentication

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Clubs table (extends tenant concept)
CREATE TABLE clubs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  email_verified BOOLEAN NOT NULL DEFAULT false,
  email_verification_token TEXT,
  email_verification_expires TIMESTAMPTZ,
  two_factor_enabled BOOLEAN NOT NULL DEFAULT false,
  two_factor_secret TEXT,
  two_factor_backup_codes TEXT[],
  password_reset_token TEXT,
  password_reset_expires TIMESTAMPTZ,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Club sessions table (JWT refresh tokens)
CREATE TABLE club_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Club login attempts table (rate limiting)
CREATE TABLE club_login_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id UUID REFERENCES clubs(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  ip_address TEXT,
  success BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_clubs_tenant_id ON clubs(tenant_id);
CREATE INDEX idx_clubs_email ON clubs(email);
CREATE INDEX idx_clubs_email_verification_token ON clubs(email_verification_token);
CREATE INDEX idx_clubs_password_reset_token ON clubs(password_reset_token);
CREATE INDEX idx_club_sessions_club_id ON club_sessions(club_id);
CREATE INDEX idx_club_sessions_expires_at ON club_sessions(expires_at);
CREATE INDEX idx_club_sessions_token_hash ON club_sessions(token_hash);
CREATE INDEX idx_club_login_attempts_club_id ON club_login_attempts(club_id);
CREATE INDEX idx_club_login_attempts_email ON club_login_attempts(email);
CREATE INDEX idx_club_login_attempts_created_at ON club_login_attempts(created_at);

-- Enable Row Level Security
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_login_attempts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for clubs table
-- Application layer will filter by tenant_id, but we add basic policies
CREATE POLICY "Allow public read access on clubs" ON clubs
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert access on clubs" ON clubs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access on clubs" ON clubs
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access on clubs" ON clubs
  FOR DELETE USING (true);

-- RLS Policies for club_sessions table
CREATE POLICY "Allow public read access on club_sessions" ON club_sessions
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert access on club_sessions" ON club_sessions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access on club_sessions" ON club_sessions
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access on club_sessions" ON club_sessions
  FOR DELETE USING (true);

-- RLS Policies for club_login_attempts table
CREATE POLICY "Allow public read access on club_login_attempts" ON club_login_attempts
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert access on club_login_attempts" ON club_login_attempts
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access on club_login_attempts" ON club_login_attempts
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access on club_login_attempts" ON club_login_attempts
  FOR DELETE USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_clubs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER clubs_updated_at
  BEFORE UPDATE ON clubs
  FOR EACH ROW
  EXECUTE FUNCTION update_clubs_updated_at();

-- Note: Application-level filtering ensures tenant isolation
-- All queries must include WHERE tenant_id = ? clause
-- The API proxy (api/db.ts) automatically adds tenant_id to all queries

