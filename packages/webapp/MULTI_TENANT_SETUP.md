# Multi-Tenant Setup Guide

This guide explains how to set up and manage multiple tenants (customers) in the Herlev/Hjorten application.

## Overview

The application supports multiple tenants, where each tenant has:
- Their own Neon database
- Custom branding (logo, name)
- Custom configuration (number of courts, features)
- Isolated data

## Architecture

### Tenant Identification

Tenants are identified by URL path:
- Default tenant: `/#/check-in` (no prefix)
- Demo tenant: `/#/demo/check-in`
- Custom tenant: `/#/customer1/check-in`

### Configuration Files

Each tenant has a JSON configuration file in `packages/webapp/src/config/tenants/`:
- `default.json` - Default tenant (current Herlev/Hjorten)
- `demo.json` - Demo tenant for sales
- `customer1.json` - Example customer tenant

### Configuration Schema

Each tenant config file contains:

```json
{
  "id": "tenant-id",
  "name": "TENANT NAME",
  "logo": "logo.jpeg",
  "maxCourts": 8,
  "postgresUrl": "postgresql://user:password@host:port/database",
  "features": {}
}
```

**Fields:**
- `id`: Unique tenant identifier (used in URL path)
- `name`: Display name shown in header
- `logo`: Logo filename (must be in `packages/webapp/public/`)
- `maxCourts`: Maximum number of courts for this tenant
- `postgresUrl`: Neon database connection string
- `features`: Optional feature flags (for future use)

## Setting Up a New Tenant

### Step 1: Create Neon Database

1. Go to [console.neon.tech](https://console.neon.tech) and sign in
2. Click "New Project"
3. Fill in:
   - **Name**: Your tenant name (e.g., "Customer1 Badminton")
   - **Database Password**: Choose a strong password (save it!)
   - **Region**: Choose closest to your users
4. Click "Create new project"
5. Wait for the project to be provisioned (2-3 minutes)

### Step 2: Run Database Migration

1. In your Neon project dashboard, go to **SQL Editor**
2. Click "New query"
3. Open the file `database/migrations/001_initial_schema.sql` from this repository
4. Copy and paste the entire SQL content into the SQL Editor
5. Click "Run" (or press Cmd/Ctrl + Enter)
6. Verify the migration succeeded (you should see "Success. No rows returned")

### Step 3: Get Neon Database Connection String

1. In your Neon project dashboard, go to **Dashboard** → **Connection Details**
2. Copy the connection string (e.g., `postgresql://user:password@host:port/database`)

### Step 4: Create Tenant Config File

1. Create a new file: `packages/webapp/src/config/tenants/customer1.json` (replace `customer1` with your tenant ID)
2. Copy the structure from `default.json` or `demo.json`
3. Update the values:
   ```json
   {
     "id": "customer1",
     "name": "CUSTOMER 1 BADMINTON",
     "logo": "logo.jpeg",
     "maxCourts": 5,
     "postgresUrl": "postgresql://user:password@host:port/database",
     "features": {}
   }
   ```

### Step 5: Add Logo (Optional)

1. Add your tenant's logo to `packages/webapp/public/`
2. Update the `logo` field in the config file to match the filename

### Step 6: Seed Initial Data (Optional)

If you want to seed initial data (courts, players, etc.), you can:

1. Use the demo seed script as a template: `packages/webapp/scripts/seed-demo-data.ts`
2. Create a custom seed script for your tenant
3. Run it: `pnpm tsx packages/webapp/scripts/seed-your-tenant.ts`

### Step 7: Test

1. Start the dev server: `pnpm dev`
2. Navigate to: `http://127.0.0.1:5173/#/customer1/check-in`
3. Verify the tenant loads correctly with custom branding

## Setting Up Demo Tenant

The demo tenant is pre-configured for sales demonstrations.

### Step 1: Create Demo Neon Database

Follow the same steps as "Setting Up a New Tenant" but create a project named "Demo Badminton" or similar.

### Step 2: Update Demo Config

1. Open `packages/webapp/src/config/tenants/demo.json`
2. Update `postgresUrl` with your demo Neon database connection string

### Step 3: Run Demo Seed Script

```bash
pnpm tsx packages/webapp/scripts/seed-demo-data.ts
```

This will seed the demo database with:
- 5 courts (configurable via `maxCourts`)
- 25 demo players
- 10 training sessions (last 10 days)
- 15 check-ins for the active session

### Step 4: Access Demo

Navigate to: `http://127.0.0.1:5173/#/demo/check-in`

## Default Tenant

The default tenant (`default.json`) represents the current Herlev/Hjorten setup. It:
- Uses the root path (no tenant prefix): `/#/check-in`
- Maintains backward compatibility with existing URLs
- Can be configured with your production Neon database connection string

## Environment Variables

For backward compatibility, the application still supports environment variables:
- `VITE_SUPABASE_URL` - Used by default tenant if not set in config
- `VITE_SUPABASE_ANON_KEY` - Used by default tenant if not set in config

**Note:** It's recommended to use tenant config files instead of environment variables for multi-tenant setups.

## Build and Deployment

### Development

The tenant config files are loaded dynamically in development. No special build steps required.

### Production

When building for production, tenant config files are copied to the `dist` directory automatically. Make sure to:

1. Build the app: `pnpm build`
2. Verify config files are in `packages/webapp/dist/config/tenants/`
3. Deploy the entire `dist` directory

## Troubleshooting

### Tenant Not Loading

1. **Check config file exists**: Verify `packages/webapp/src/config/tenants/{tenant-id}.json` exists
2. **Check Neon credentials**: Verify `postgresUrl` is correct
3. **Check browser console**: Look for error messages about missing config or database connection

### Wrong Tenant Loading

1. **Check URL path**: Make sure the tenant ID in the URL matches the config file name
2. **Check tenant ID**: Verify the `id` field in the config matches the URL path

### Neon Database Connection Errors

1. **Check credentials**: Verify Neon database connection string is correct
2. **Check database permissions**: Make sure the database user has proper permissions
3. **Check network**: Verify you can access the Neon database

### Courts Not Showing Correctly

1. **Check maxCourts**: Verify `maxCourts` in config matches the number of courts in your database
2. **Check database**: Verify courts are seeded in your Neon database
3. **Check migration**: Make sure the database migration ran successfully

## Best Practices

1. **Separate Neon Databases**: Each tenant can have their own Neon database for complete isolation (or use tenant_id for multi-tenant)
2. **Version Control**: Keep tenant config files in version control (but never commit database connection strings to public repos)
3. **Naming Convention**: Use lowercase, alphanumeric tenant IDs (e.g., `customer1`, `demo`, `tenant-abc`)
4. **Logo Management**: Store tenant logos in `packages/webapp/public/` with unique names if needed
5. **Testing**: Test each tenant thoroughly before deploying to production

## Future Enhancements

- Subdomain-based tenant identification (requires hosting change)
- Runtime tenant configuration UI
- Custom domain support per tenant
- Shared database with Row Level Security (for larger scale)


