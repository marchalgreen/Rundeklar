# Vercel Demo Setup Guide

## Overview

This guide explains how to set up a separate Vercel deployment for the demo tenant, so you can test and share the demo without affecting production.

## Current Tenants

You currently have **2 tenants**:
- `default` - Production tenant (Herlev/Hjorten)
- `demo` - Demo tenant for testing and sharing

**Note:** The old `rundemanager` tenant has been removed as it was a working title.

## Demo Tenant Detection

The demo tenant is automatically detected based on the hostname:
- Any domain containing `demo`, `demo.`, or `-demo` will use the `demo` tenant
- Examples: `demo.rundeklar.vercel.app`, `rundeklar-demo.vercel.app`, `demo.yourdomain.com`

## Setting Up Demo Deployment in Vercel

### Option 1: Separate Vercel Project (Recommended)

1. **Create a new Vercel project:**
   - Go to Vercel Dashboard → Add New Project
   - Import the same GitHub repository
   - Name it something like `rundeklar-demo` or `rundeklar-demo-tenant`

2. **Configure the project:**
   - **Root Directory:** `packages/webapp` (same as production)
   - **Build Command:** `pnpm build`
   - **Output Directory:** `dist`
   - **Install Command:** `pnpm install`

3. **Set up a custom domain with "demo" in it:**
   - Go to Project Settings → Domains
   - Add a domain like `demo.rundeklar.vercel.app` or `rundeklar-demo.vercel.app`
   - Or use a custom domain: `demo.yourdomain.com`

4. **Configure environment variables:**
   - Go to Project Settings → Environment Variables
   - Add `DATABASE_URL` pointing to your demo database (separate from production!)
   - Add any other required environment variables

5. **Deploy:**
   - Push to a branch (e.g., `demo` or `main`)
   - Vercel will automatically deploy
   - The demo tenant will be automatically detected based on the domain

### Option 2: Preview Deployments with Branch

1. **Create a demo branch:**
   ```bash
   git checkout -b demo
   git push origin demo
   ```

2. **Configure Vercel:**
   - Go to Project Settings → Git
   - Enable "Production Branch" and set it to `main`
   - Preview deployments will use the `demo` branch

3. **Use preview URLs:**
   - Each preview deployment gets a unique URL
   - You can share these URLs for demo purposes
   - Note: Preview URLs don't automatically detect demo tenant, so you may need to manually add `/demo/` to the path

## Demo Tenant Configuration

The demo tenant configuration is in `packages/webapp/src/config/tenants/demo.json`:

```json
{
  "id": "demo",
  "name": "DEMO",
  "logo": "fulllogo_transparent_nobuffer_horizontal.png",
  "maxCourts": 5,
  "features": {}
}
```

## Database Setup

**IMPORTANT:** Use a **separate database** for the demo tenant!

1. Create a new Neon database (or Supabase project) for demo
2. Run migrations on the demo database
3. Seed with demo data if needed
4. Update `demo.json` with database connection details, OR
5. Set `DATABASE_URL` environment variable in Vercel for the demo project

## Accessing Demo Tenant

Once deployed, access the demo tenant via:
- `https://demo.rundeklar.vercel.app` (or your custom demo domain)
- The tenant will be automatically detected based on the hostname
- No need to add `/demo/` to the URL path

## Production vs Demo

| Aspect | Production | Demo |
|--------|-----------|------|
| Domain | `rundeklar.vercel.app` | `demo.rundeklar.vercel.app` |
| Tenant ID | `default` | `demo` |
| Database | Production DB | Demo DB (separate) |
| Purpose | Live app | Testing/sharing |

## Troubleshooting

### Demo tenant not loading
- Check that the domain contains `demo`, `demo.`, or `-demo`
- Verify `demo.json` exists in `packages/webapp/src/config/tenants/`
- Check browser console for errors

### Wrong tenant loading
- Verify the hostname detection logic in `packages/webapp/src/lib/tenant.ts`
- Check that you're accessing the correct domain

### Database connection issues
- Verify `DATABASE_URL` is set in Vercel environment variables
- Check that the demo database is accessible
- Ensure RLS policies allow access (if using Supabase)

