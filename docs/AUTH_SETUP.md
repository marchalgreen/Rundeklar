# Authentication Setup

This document describes the authentication system setup and required environment variables.

## Overview

The application uses JWT-based authentication with:
- Email/password authentication
- Email verification via Resend
- Two-factor authentication (TOTP)
- Password reset functionality
- Rate limiting for login attempts

## Environment Variables

Add these environment variables to your `.env.local` file in `packages/webapp/` and to Vercel:

### Required

- `AUTH_JWT_SECRET` - JWT signing secret for access tokens
  - Generate with: `openssl rand -base64 32`
  - Must be at least 32 characters
  - Keep this secret secure - never commit to git

- `RESEND_API_KEY` - Resend API key for sending emails
  - Get from: https://resend.com/api-keys
  - User: marchalgreen@gmail.com
  - For now, using demo domain: `onboarding@resend.dev`

- `RESEND_FROM_EMAIL` - Email address to send from
  - Default: `onboarding@resend.dev` (demo domain)
  - Later: Use your verified domain

- `RESEND_FROM_NAME` - Display name for emails
  - Default: `Herlev Hjorten`
  - Customize as needed

- `APP_URL` - Base URL for email links
  - Development: `http://localhost:5173`
  - Production: Your production URL (e.g., `https://yourdomain.com`)

### Optional

- `TOTP_WINDOW` - TOTP validation window (default: 1)
  - Number of time steps to allow for clock skew
  - Default: 1 (30 seconds before/after)

## Database Migration

Run the migration to create authentication tables in your Neon database:

```bash
# Using psql with Neon connection string:
psql $DATABASE_URL -f database/migrations/007_add_club_auth.sql

# Or using Neon CLI:
neonctl db execute --project-id <your-project-id> --database <your-db-name> --file database/migrations/007_add_club_auth.sql
```

**Note**: The `database/migrations/` directory name is historical - these are standard PostgreSQL migrations that work with Neon.

## Setup Steps

1. **Generate JWT Secret**
   ```bash
   openssl rand -base64 32
   ```
   Copy the output and add to `.env.local` as `AUTH_JWT_SECRET`

2. **Get Resend API Key**
   - Sign in to Resend: https://resend.com
   - Go to API Keys section
   - Create a new API key
   - Copy and add to `.env.local` as `RESEND_API_KEY`

3. **Set Email Configuration**
   - For now, use demo domain: `onboarding@resend.dev`
   - Later, verify your domain in Resend and update `RESEND_FROM_EMAIL`

4. **Set App URL**
   - Development: `http://localhost:5173`
   - Production: Your production domain

5. **Run Database Migration**
   - Apply `database/migrations/007_add_club_auth.sql` to your Neon database
   - You can use `psql` with your Neon connection string, or the Neon dashboard SQL editor

6. **Restart Development Server**
   ```bash
   cd packages/webapp
   vercel dev
   ```

## Testing

### Register a Club Account

1. Navigate to `/register` (or `/:tenantId/register`)
2. Enter email and password
3. Check email for verification link
4. Click verification link
5. Log in at `/login`

### Test 2FA

1. Log in to your account
2. Go to Account Settings (`/account`)
3. Click "Aktiver 2FA"
4. Scan QR code with authenticator app
5. Enter verification code
6. Save backup codes

### Test Password Reset

1. Go to `/forgot-password`
2. Enter your email
3. Check email for reset link
4. Click link and set new password

## API Routes

All auth API routes are under `/api/auth/`:

- `POST /api/auth/register` - Register new club
- `POST /api/auth/verify-email` - Verify email address
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout (invalidate refresh token)
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token
- `POST /api/auth/change-password` - Change password (authenticated)
- `POST /api/auth/setup-2fa` - Setup 2FA (get QR code)
- `POST /api/auth/verify-2fa-setup` - Verify and enable 2FA
- `POST /api/auth/disable-2fa` - Disable 2FA
- `GET /api/auth/me` - Get current club info
- `PUT /api/auth/update-profile` - Update club profile

## Security Features

- **Password Hashing**: Argon2id with secure parameters
- **JWT Tokens**: Short-lived access tokens (15min) + refresh tokens (7 days)
- **Rate Limiting**: 5 failed login attempts = 15 minute lockout
- **Email Verification**: Required before login
- **2FA**: Optional TOTP-based two-factor authentication
- **Password Strength**: Enforced requirements (8+ chars, uppercase, lowercase, number, special char)

## Future Extensions

The authentication system is designed to support future player/user login:

- Database schema supports adding `user_type` to sessions
- Auth context can be extended with `userType` state
- API routes can check `user_type` for authorization
- Player login can reuse same JWT/auth infrastructure

