# Hotfix: PIN Login & Reset Flow Fixes

## Summary
This hotfix resolves critical issues with PIN authentication and improves the PIN reset flow UX. The main issues were:
1. PIN login not working due to module loading issues
2. Missing "Forgot PIN" page - users couldn't request reset emails
3. PIN reset page UX issues (token handling, username display, styling)

## Changes

### 🔧 PIN Login Fixes
- **Fixed PIN module loading**: Changed from `require()` to direct `import` statements
- **Removed debug logs**: Cleaned up verbose logging after successful fix
- **Improved error handling**: Better error messages and fallback handling

### ✨ New Features
- **Forgot PIN page**: New page where users can request PIN reset emails
- **Email OR Username**: Users only need to remember one identifier (not both)
- **Token validation**: Added `validate` action to API to fetch username before showing reset form

### 🎨 UX Improvements
- **Reset PIN page styling**: Matches Login page design (bg-app-gradient, u-glass, etc.)
- **PINInput component**: Uses 6 separate input boxes matching login page
- **Username display**: Shows which user is resetting PIN
- **Better error messages**: Clearer feedback throughout the flow

### 🐛 Bug Fixes
- **CORS fixes**: Improved localhost/127.0.0.1 origin handling in development
- **Validation fixes**: Proper handling of empty strings in form inputs
- **Token extraction**: Better URL parsing for reset links

## Technical Details

### API Changes
- `packages/webapp/api/auth/login.ts`: Direct imports instead of require()
- `packages/webapp/api/auth/reset-pin.ts`: 
  - Added `validate` action
  - Updated schema to accept email OR username
  - Improved validation with z.preprocess()

### Frontend Changes
- `packages/webapp/src/routes/auth/ForgotPin.tsx`: New page for requesting reset
- `packages/webapp/src/routes/auth/ResetPin.tsx`: Complete redesign
- `packages/webapp/src/routes/auth/Login.tsx`: Updated link to forgot-pin
- `packages/webapp/src/lib/utils/cors.ts`: Better dev environment handling

## User-Facing Outcomes

### Before
- ❌ PIN login didn't work (module loading error)
- ❌ No way to request PIN reset email
- ❌ Reset page required token but had no way to get one
- ❌ Required both email AND username to reset

### After
- ✅ PIN login works correctly
- ✅ "Forgot PIN?" link leads to request page
- ✅ Can request reset with email OR username
- ✅ Reset page shows username and matches app design
- ✅ Smooth flow: Login → Forgot PIN → Email → Reset PIN

## Validation Steps

1. **PIN Login**:
   - [ ] Log in as coach with username + PIN
   - [ ] Verify successful login

2. **Forgot PIN Flow**:
   - [ ] Click "Glemt PIN?" on login page
   - [ ] Enter email OR username (not both required)
   - [ ] Verify email is sent
   - [ ] Click link in email
   - [ ] Verify reset page shows username
   - [ ] Enter new PIN (6 digits)
   - [ ] Confirm PIN matches
   - [ ] Verify PIN is reset and redirects to login

3. **Edge Cases**:
   - [ ] Empty email field + username works
   - [ ] Empty username field + email works
   - [ ] Both fields empty shows error
   - [ ] Invalid email format shows error
   - [ ] Expired token shows error

## Risk Assessment

**Low Risk**: 
- Changes are isolated to auth flow
- No database schema changes
- Backward compatible (existing reset links still work)

**Rollback Plan**:
- Revert commits if issues arise
- PIN login will fall back to email/password for admins
- Existing reset tokens remain valid

## Testing Coverage

- ✅ Manual testing of PIN login
- ✅ Manual testing of forgot PIN flow
- ✅ Validation error handling
- ✅ CORS handling in dev environment

## Related Issues

Fixes issues with:
- PIN authentication not working
- Missing forgot PIN functionality
- Poor UX on reset PIN page
