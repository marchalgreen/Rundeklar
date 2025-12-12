# Authentication Session Testing Guide

## Overview

This guide explains how to test the authentication session management system, especially the auto-refresh functionality that prevents users from being logged out during 2-hour training sessions.

## Quick Test (Development Mode)

In development mode, the system uses shorter intervals for easier testing:

- **Auto-refresh interval**: 1 minute (instead of 30 minutes)
- **Proactive refresh check**: 30 seconds (instead of 15 minutes)
- **Activity threshold**: 30 seconds (instead of 5 minutes)
- **Activity debounce**: 5 seconds (instead of 30 seconds)

### Testing Steps

1. **Start the development server:**
   ```bash
   pnpm dev
   ```

2. **Open browser console** to see authentication logs

3. **Log in** to the application

4. **Watch the console** - you should see:
   ```
   [Auth] Auto-refresh interval set to 1 minute (dev mode)
   ```

5. **Wait 1 minute** - you should see:
   ```
   [Auth] Auto-refresh triggered (interval-based)
   [Auth] Attempting token refresh...
   [Auth] Token refresh successful
   [Auth] Auto-refresh result: success
   ```

6. **Wait 30 seconds** - you should see proactive refresh check (if token is expiring soon):
   ```
   [Auth] Proactive refresh: token expires in X minutes
   [Auth] Attempting token refresh...
   [Auth] Token refresh successful
   [Auth] Proactive refresh result: success
   ```

6. **Test activity-based refresh:**
   - Wait 30 seconds without interacting
   - Move mouse or press a key
   - You should see:
     ```
     [Auth] Activity detected, scheduling refresh in 5 seconds
     [Auth] Activity-based refresh triggered
     [Auth] Attempting token refresh...
     [Auth] Token refresh successful
     [Auth] Activity refresh result: success
     ```

## Production Behavior

In production, the system uses longer intervals:

- **Access token expiry**: 2 hours
- **Auto-refresh interval**: 30 minutes (refreshes frequently to prevent expiry)
- **Proactive refresh check**: Every 15 minutes (refreshes if token expires within 1 hour)
- **Activity threshold**: 5 minutes
- **Activity debounce**: 30 seconds

## Manual Testing Checklist

- [ ] Login works correctly
- [ ] Auto-refresh happens every 1 minute (dev) / 30 minutes (prod)
- [ ] Proactive refresh checks token age every 30 seconds (dev) / 15 minutes (prod)
- [ ] Proactive refresh refreshes token if it expires within 1 hour
- [ ] Activity-based refresh triggers after inactivity
- [ ] Token refresh retries on network errors (check console)
- [ ] User stays logged in during 3+ hour training session
- [ ] User stays logged in after computer restart (if refresh token still valid)
- [ ] Network errors don't cause logout (only permanent 401 errors do)
- [ ] Logout works correctly

## Troubleshooting

### Token refresh fails immediately
- Check that refresh token exists in localStorage: `localStorage.getItem('auth_refresh_token')`
- Check network tab for `/api/auth/refresh` endpoint
- Verify AUTH_JWT_SECRET is set correctly

### User gets logged out unexpectedly
- Check browser console for error messages
- Verify refresh token hasn't expired (7 days)
- Check if network requests are failing

### Activity refresh not working
- Check browser console for activity logs
- Verify event listeners are attached (check DOM)
- Test with mouse/keyboard/touch events

## Console Commands for Testing

Open browser console and run:

```javascript
// Check current tokens
localStorage.getItem('auth_access_token')
localStorage.getItem('auth_refresh_token')

// Manually trigger refresh (if useAuth hook is available)
// This requires access to the auth context
```

## Expected Behavior

1. **User logs in** → Access token (2h) and refresh token (7d) stored
2. **Every 30 minutes** → Access token refreshed automatically (interval-based)
3. **Every 15 minutes** → System checks token age, refreshes if expiring within 1 hour (proactive)
4. **After 5 min inactivity + activity** → Token refreshed on activity
5. **On API 401 error** → Token refreshed automatically, request retried
6. **On network error during refresh** → Retry with exponential backoff, don't log out
7. **After 2 hours** → Token still valid (refreshed before expiry via proactive check)
8. **After 3+ hours** → User still logged in (tokens refreshed proactively)
9. **After 7 days** → Refresh token expires, user must log in again
10. **After computer restart** → User automatically logged in if refresh token still valid


