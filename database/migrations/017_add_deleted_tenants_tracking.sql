-- Migration: Add deleted tenants tracking table
-- This allows marking tenants as deleted without modifying read-only config files
-- Used in Vercel serverless functions where filesystem is read-only

CREATE TABLE IF NOT EXISTS deleted_tenants (
  tenant_id TEXT PRIMARY KEY,
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_by TEXT -- Optional: email of admin who deleted it
);

CREATE INDEX IF NOT EXISTS idx_deleted_tenants_deleted_at ON deleted_tenants(deleted_at);

-- Add comment
COMMENT ON TABLE deleted_tenants IS 'Tracks tenants that have been soft-deleted. Used to filter tenants in UI without modifying read-only config files.';

