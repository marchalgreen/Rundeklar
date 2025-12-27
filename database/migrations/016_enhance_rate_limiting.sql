-- Migration: Enhance rate limiting with IP-based limiting and progressive lockout support
-- Adds indexes for IP-based rate limiting and improves query performance

-- Add index on ip_address for IP-based rate limiting queries
CREATE INDEX IF NOT EXISTS idx_club_login_attempts_ip_address 
ON club_login_attempts(ip_address, created_at) 
WHERE success = false;

-- Add composite index for account-based rate limiting (email + created_at + success)
CREATE INDEX IF NOT EXISTS idx_club_login_attempts_email_created_success 
ON club_login_attempts(email, created_at DESC, success);

-- Add index for cleanup queries (created_at)
-- Note: idx_club_login_attempts_created_at already exists, but ensure it's optimized
-- This index helps with cleanup of old attempts

-- Add comment explaining the rate limiting strategy
COMMENT ON TABLE club_login_attempts IS 'Tracks login attempts for rate limiting. Supports both account-based and IP-based rate limiting with progressive lockout. IP addresses are anonymized (first 3 octets) for GDPR compliance.';

COMMENT ON COLUMN club_login_attempts.ip_address IS 'Anonymized IP address (first 3 octets for IPv4) for GDPR compliance. Used for IP-based rate limiting.';
COMMENT ON COLUMN club_login_attempts.email IS 'Email or username used for login. Used for account-based rate limiting.';
COMMENT ON COLUMN club_login_attempts.success IS 'Whether the login attempt was successful. Failed attempts are counted for rate limiting.';
COMMENT ON COLUMN club_login_attempts.created_at IS 'Timestamp of the login attempt. Used for time-windowed rate limiting.';



