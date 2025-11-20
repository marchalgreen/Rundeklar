-- Migration: Add cold_call_emails table for tracking sent cold-call emails
-- This allows sysadmins to track which clubs have been contacted and when

CREATE TABLE IF NOT EXISTS cold_call_emails (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  club_name TEXT NOT NULL,
  president_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed')),
  resend_id TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_cold_call_emails_email ON cold_call_emails(email);
CREATE INDEX IF NOT EXISTS idx_cold_call_emails_sent_at ON cold_call_emails(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_cold_call_emails_status ON cold_call_emails(status);
CREATE INDEX IF NOT EXISTS idx_cold_call_emails_club_name ON cold_call_emails(club_name);

