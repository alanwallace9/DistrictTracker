# Demo Environment Setup Guide

This guide will help you set up the demo environment for TrespassTracker at `demo.districttracker.com`.

## Overview

The demo environment allows potential customers to try TrespassTracker with:
- Pre-filled login credentials (no signup required)
- Sample trespass records
- Full CRUD functionality
- Automatic hourly data resets

---

## Step 1: Create Demo Users in Clerk

Go to [Clerk Dashboard](https://dashboard.clerk.com) → Users → Create User

### User 1: Demo Admin

- **Email**: `demo-admin@districttracker.com`
- **Password**: `Default1`
- **Public Metadata**:
```json
{
  "role": "district_admin",
  "tenant_id": "demo"
}
```

### User 2: Demo Viewer

- **Email**: `demo-viewer@districttracker.com`
- **Password**: `Default2`
- **Public Metadata**:
```json
{
  "role": "viewer",
  "tenant_id": "demo"
}
```

**Important**: After creating these users, copy their Clerk User IDs (format: `user_2abc...`)

---

## Step 2: Update User IDs in Code

Open these two files and replace the placeholder IDs with actual Clerk User IDs:

### File 1: `app/api/cron/reset-demo/route.ts`

Find this section (around line 67):
```typescript
function getDemoSeedData() {
  const demoAdminUserId = 'demo-admin-user-id'; // TODO: Replace
  const demoViewerUserId = 'demo-viewer-user-id'; // TODO: Replace
```

Replace with:
```typescript
function getDemoSeedData() {
  const demoAdminUserId = 'user_YOUR_ADMIN_ID_HERE';
  const demoViewerUserId = 'user_YOUR_VIEWER_ID_HERE';
```

### File 2: `scripts/seed-demo-data.ts`

Find this section (around line 30):
```typescript
const DEMO_ADMIN_USER_ID = 'user_REPLACE_WITH_ADMIN_ID';
const DEMO_VIEWER_USER_ID = 'user_REPLACE_WITH_VIEWER_ID';
```

Replace with:
```typescript
const DEMO_ADMIN_USER_ID = 'user_YOUR_ADMIN_ID_HERE';
const DEMO_VIEWER_USER_ID = 'user_YOUR_VIEWER_ID_HERE';
```

---

## Step 3: Install Dependencies

```bash
npm install
```

This will install `ts-node` which is needed for the seed script.

---

## Step 4: Seed Initial Demo Data

Run the seed script to populate demo tenant with sample records:

```bash
npm run seed:demo
```

Expected output:
```
🌱 Starting demo data seed...
✓ Demo tenant found: Demo District
🗑️  Deleting existing demo records...
✓ Existing demo records deleted
📝 Inserting 6 demo records...
✓ Successfully inserted 6 records
✅ Demo data seeded successfully!
```

---

## Step 5: Configure Environment Variables

Add to your `.env` or Vercel environment variables:

```bash
# Generate a random secret: openssl rand -base64 32
CRON_SECRET=your-random-secret-here
```

This protects the reset endpoint from unauthorized access.

---

## Step 6: Deploy to Vercel

The `vercel.json` file is already configured with the hourly cron job:

```json
{
  "crons": [
    {
      "path": "/api/cron/reset-demo",
      "schedule": "0 * * * *"
    }
  ]
}
```

Deploy to Vercel:
```bash
vercel --prod
```

Vercel will automatically set up the cron job.

---

## Step 7: Test the Demo

### Access Demo Login Page

Visit: `https://demo.districttracker.com/demo-login`

You should see two large buttons:
- **Try as Admin** - Full access
- **Try as Viewer** - Read-only access

### Test Admin Login

1. Click "Try as Admin"
2. Wait for auto-login
3. You should be redirected to dashboard
4. Try creating, editing, and deleting records
5. All changes will be reset within the hour

### Test Viewer Login

1. Logout (or use incognito)
2. Visit demo login page again
3. Click "Try as Viewer"
4. Verify you can only view records (no edit/delete buttons)

---

## Monitoring & Maintenance

### Check Cron Job Logs

In Vercel Dashboard:
1. Go to your project
2. Click "Deployments"
3. Select latest deployment
4. Click "Functions"
5. Find `api/cron/reset-demo`
6. View logs

### Manual Reset (if needed)

```bash
curl -X GET https://demo.districttracker.com/api/cron/reset-demo \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Check Demo Records

```sql
-- In Supabase SQL Editor
SELECT COUNT(*) as total,
       COUNT(*) FILTER (WHERE status = 'active') as active
FROM trespass_records
WHERE tenant_id = 'demo';
```

---

## Architecture

### Multi-Tenancy

- Demo tenant ID: `demo`
- Isolated from production tenants
- RLS policies enforce tenant isolation

### Data Flow

```
User clicks "Try as Admin"
    ↓
Auto-login with demo-admin@districttracker.com
    ↓
Clerk authenticates with tenant_id='demo' in metadata
    ↓
User sees only demo tenant records (RLS policies)
    ↓
User creates/edits/deletes records
    ↓
Changes persist until next hourly reset
    ↓
Cron job runs (every hour at :00)
    ↓
Demo records deleted and reseeded
```

### Security

- Demo users can only access `tenant_id='demo'` data
- RLS policies prevent cross-tenant access
- Cron endpoint protected by bearer token
- No production data exposure

---

## Troubleshooting

### Demo login not working

**Check:**
1. Clerk users created correctly
2. Public metadata set with `tenant_id: 'demo'`
3. Passwords are exactly `Default1` and `Default2`

### No records showing

**Check:**
1. Run seed script: `npm run seed:demo`
2. Verify in Supabase: `SELECT * FROM trespass_records WHERE tenant_id = 'demo'`
3. Check user's `tenant_id` in Clerk metadata

### Cron job not running

**Check:**
1. `CRON_SECRET` environment variable set in Vercel
2. Cron job configured in Vercel dashboard
3. Check function logs in Vercel

### CSV Upload Test (from localhost)

To test CSV upload:

1. **Verify localhost is using production Supabase:**
   ```bash
   # Check .env.local
   cat .env.local | grep SUPABASE_URL
   ```

2. **Create a test CSV:**
   ```csv
   first_name,last_name,school_id,expiration_date,trespassed_from
   Test,Person,STU999,2026-12-31,Demo Campus
   ```

3. **Login as demo-admin locally:**
   - Visit `localhost:3000/demo-login`
   - Click "Try as Admin"

4. **Upload CSV:**
   - Go to dashboard
   - Click "Upload CSV"
   - Records should get `tenant_id='demo'` automatically

5. **Verify:**
   ```sql
   SELECT * FROM trespass_records
   WHERE tenant_id = 'demo'
   AND first_name = 'Test';
   ```

---

## Next Steps

After demo is working:

1. Add subdomain routing logic (optional)
2. Add analytics to track demo usage
3. Add "Request Full Access" button
4. Customize demo data for your use case
5. Add demo walkthrough/tutorial
