# Implementation Plan: Demo Tenant Isolation with Role Simulation

**Date**: 2025-11-16
**Goal**: Allow any authenticated user to access demo.districttracker.com sandbox while keeping production tenants isolated
**Approach**: Option A (Virtual Tenant Switching) + Option 2 (Special RLS for Demo Role Simulation)

---

## 🎯 OBJECTIVES

1. ✅ **Tenant Isolation**: Users can ONLY access their assigned tenant's production data
2. ✅ **Demo Exception**: ANY authenticated user can access demo sandbox
3. ✅ **Role Simulation**: Users can test different roles (viewer/campus_admin/district_admin) in demo
4. ✅ **Auto-Reset**: Demo resets every 6 hours via cron (already implemented)
5. ✅ **Security**: RLS enforces everything at database level

---

## 📋 IMPLEMENTATION STEPS

### **Step 1: Update RLS Policies - Remove Demo Exception**

**Current RLS (has data leakage):**
```sql
-- SELECT Policy
WHERE (tenant_id = get_my_tenant_id()) OR (tenant_id = 'demo') OR (tenant_id IS NULL)
```
Problem: Everyone sees demo records mixed with their tenant's records

**New RLS (secure isolation):**
```sql
-- SELECT Policy
WHERE (tenant_id = get_my_tenant_id()) OR (tenant_id IS NULL)
```
Result: Users only see records from their active tenant (set via `active_tenant_id`)

**Changes:**
- Drop existing SELECT policy for trespass_records
- Create new SELECT policy WITHOUT demo exception
- Same for INSERT, UPDATE, DELETE policies

**Supabase Migration:**
```sql
-- File: remove_demo_exception_from_rls.sql

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view records from their tenant or demo" ON trespass_records;
DROP POLICY IF EXISTS "Admins can create records for their tenant or demo" ON trespass_records;
DROP POLICY IF EXISTS "Admins can update records for their tenant or demo" ON trespass_records;
DROP POLICY IF EXISTS "Admins can delete records for their tenant or demo" ON trespass_records;

-- Create new policies without demo exception
CREATE POLICY "Users can view records from their tenant"
  ON trespass_records FOR SELECT TO authenticated
  USING (tenant_id = get_my_tenant_id() OR tenant_id IS NULL);

CREATE POLICY "Admins can create records for their tenant"
  ON trespass_records FOR INSERT TO authenticated
  WITH CHECK (
    get_my_role_from_db() = ANY (ARRAY['campus_admin'::text, 'district_admin'::text, 'master_admin'::text])
    AND (tenant_id = get_my_tenant_id() OR tenant_id IS NULL)
  );

CREATE POLICY "Admins can update records from their tenant"
  ON trespass_records FOR UPDATE TO authenticated
  USING (
    get_my_role_from_db() = ANY (ARRAY['campus_admin'::text, 'district_admin'::text, 'master_admin'::text])
    AND (tenant_id = get_my_tenant_id() OR tenant_id IS NULL)
  )
  WITH CHECK (
    get_my_role_from_db() = ANY (ARRAY['campus_admin'::text, 'district_admin'::text, 'master_admin'::text])
    AND (tenant_id = get_my_tenant_id() OR tenant_id IS NULL)
  );

CREATE POLICY "District and master admins can delete records from their tenant"
  ON trespass_records FOR DELETE TO authenticated
  USING (
    get_my_role_from_db() = ANY (ARRAY['district_admin'::text, 'master_admin'::text])
    AND (tenant_id = get_my_tenant_id() OR tenant_id IS NULL)
  );
```

---

### **Step 2: Add Special RLS for Demo Tenant Role Simulation**

**Goal**: Allow role simulation ONLY in demo tenant, keep production secure

**New Helper Function:**
```sql
-- Get demo role from session storage (passed via custom header)
CREATE OR REPLACE FUNCTION get_demo_role()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    current_setting('request.headers', true)::json->>'x-demo-role',
    get_my_role_from_db()  -- Fallback to real role
  );
$$;
```

**Demo-Specific RLS Policy:**
```sql
-- Demo tenant allows role simulation via session
CREATE POLICY "Demo tenant allows role simulation"
  ON trespass_records FOR ALL TO authenticated
  USING (
    CASE
      WHEN tenant_id = 'demo' THEN
        -- In demo, use simulated role from session
        CASE get_demo_role()
          WHEN 'viewer' THEN true  -- Can view
          WHEN 'campus_admin' THEN true  -- Can view/edit/create
          WHEN 'district_admin' THEN true  -- Full access
          ELSE false
        END
      ELSE
        -- In production, use actual role from database
        get_my_role_from_db() = ANY (ARRAY['campus_admin'::text, 'district_admin'::text, 'master_admin'::text])
    END
  )
  WITH CHECK (
    CASE
      WHEN tenant_id = 'demo' THEN
        -- In demo, check simulated role permissions
        CASE get_demo_role()
          WHEN 'viewer' THEN false  -- Viewers can't modify
          WHEN 'campus_admin' THEN true  -- Can create/edit
          WHEN 'district_admin' THEN true  -- Can create/edit/delete
          ELSE false
        END
      ELSE
        -- In production, use actual role
        get_my_role_from_db() = ANY (ARRAY['campus_admin'::text, 'district_admin'::text, 'master_admin'::text])
    END
  );
```

**Supabase Migration:**
```sql
-- File: add_demo_role_simulation_rls.sql
-- (SQL from above)
```

---

### **Step 3: Create Tenant Switching Server Actions**

**File**: `app/actions/tenant-switching.ts`

```typescript
'use server';

import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Switch user to demo workspace
 */
export async function switchToDemoWorkspace() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error('Unauthorized');
  }

  // Update user's active tenant to demo
  const { error } = await supabaseAdmin
    .from('user_profiles')
    .update({ active_tenant_id: 'demo' })
    .eq('id', userId);

  if (error) {
    throw new Error('Failed to switch to demo workspace');
  }

  revalidatePath('/');
  return { success: true };
}

/**
 * Switch user back to their assigned tenant
 */
export async function switchToProductionWorkspace() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error('Unauthorized');
  }

  // Clear active tenant (reverts to assigned tenant)
  const { error } = await supabaseAdmin
    .from('user_profiles')
    .update({ active_tenant_id: null })
    .eq('id', userId);

  if (error) {
    throw new Error('Failed to switch to production workspace');
  }

  revalidatePath('/');
  return { success: true };
}

/**
 * Get user's current workspace status
 */
export async function getCurrentWorkspace() {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('tenant_id, active_tenant_id')
    .eq('id', userId)
    .single();

  return {
    assignedTenant: profile?.tenant_id || null,
    activeTenant: profile?.active_tenant_id || profile?.tenant_id || null,
    isDemo: profile?.active_tenant_id === 'demo'
  };
}
```

---

### **Step 4: Update Middleware for Tenant Access Control**

**File**: `middleware.ts`

```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Public routes (no auth needed)
const isPublicRoute = createRouteMatcher([
  '/',
  '/login(.*)',
  '/demo-guide',
  '/feedback',
  '/feedback/features',
  '/feedback/bugs',
  '/feedback/[slug]',
  '/feedback/roadmap',
  '/feedback/changelog',
]);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function getSubdomainFromHostname(hostname: string): string | null {
  // Development: default to demo
  if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
    return 'demo';
  }

  const parts = hostname.split('.');
  if (parts.length < 3 || parts[0] === 'www') {
    return null;
  }

  const subdomain = parts[0];
  if (subdomain === 'staging') {
    return 'demo';
  }

  return subdomain;
}

export default clerkMiddleware(async (auth, request) => {
  // Extract subdomain
  const hostname = request.headers.get('host') || '';
  const subdomain = getSubdomainFromHostname(hostname);

  // Public routes - allow everyone
  if (isPublicRoute(request)) {
    return NextResponse.next();
  }

  // All other routes require authentication
  const { userId } = await auth.protect();

  // If authenticated, check tenant access
  if (userId && subdomain) {
    // Get user's assigned tenant
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('tenant_id, active_tenant_id')
      .eq('id', userId)
      .single();

    const userAssignedTenant = userProfile?.tenant_id;
    const userActiveTenant = userProfile?.active_tenant_id || userAssignedTenant;

    // Check access rules
    if (subdomain === 'demo') {
      // Demo is accessible to all - auto-switch if needed
      if (userActiveTenant !== 'demo') {
        // Update active_tenant_id to demo
        await supabase
          .from('user_profiles')
          .update({ active_tenant_id: 'demo' })
          .eq('id', userId);
      }
    } else if (subdomain === userAssignedTenant) {
      // Accessing their own tenant - auto-switch if needed
      if (userActiveTenant !== userAssignedTenant) {
        // Clear active tenant override
        await supabase
          .from('user_profiles')
          .update({ active_tenant_id: null })
          .eq('id', userId);
      }
    } else {
      // Trying to access another tenant's production data - BLOCK
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
```

---

### **Step 5: Add Workspace Switcher UI**

**File**: `components/WorkspaceSwitcher.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Building2, TestTube } from 'lucide-react';
import { switchToDemoWorkspace, switchToProductionWorkspace, getCurrentWorkspace } from '@/app/actions/tenant-switching';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export function WorkspaceSwitcher() {
  const router = useRouter();
  const [workspace, setWorkspace] = useState<{
    assignedTenant: string | null;
    activeTenant: string | null;
    isDemo: boolean;
  } | null>(null);

  useEffect(() => {
    async function loadWorkspace() {
      const data = await getCurrentWorkspace();
      setWorkspace(data);
    }
    loadWorkspace();
  }, []);

  const handleSwitchToDemo = async () => {
    try {
      await switchToDemoWorkspace();
      toast.success('Switched to Demo Workspace');
      router.refresh();
    } catch (error: any) {
      toast.error('Failed to switch workspace', {
        description: error.message
      });
    }
  };

  const handleSwitchToProduction = async () => {
    try {
      await switchToProductionWorkspace();
      toast.success('Switched to Production');
      router.refresh();
    } catch (error: any) {
      toast.error('Failed to switch workspace', {
        description: error.message
      });
    }
  };

  if (!workspace) return null;

  return (
    <div className="flex items-center gap-2">
      {workspace.isDemo ? (
        <>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 text-amber-800 rounded-md text-sm">
            <TestTube className="w-4 h-4" />
            Demo Workspace
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSwitchToProduction}
          >
            <Building2 className="w-4 h-4 mr-2" />
            Back to Production
          </Button>
        </>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={handleSwitchToDemo}
        >
          <TestTube className="w-4 h-4 mr-2" />
          Try Demo
        </Button>
      )}
    </div>
  );
}
```

**Add to DashboardLayout:**
```typescript
import { WorkspaceSwitcher } from '@/components/WorkspaceSwitcher';

// In the header:
<WorkspaceSwitcher />
```

---

### **Step 6: Update DemoRoleContext to Set Custom Header**

**File**: `contexts/DemoRoleContext.tsx`

Update the context to pass demo role to server via custom request header (for RLS):

```typescript
// Add this utility function
async function setDemoRoleHeader(role: DemoRole) {
  // Set in cookie or use next/headers in server components
  // For now, store in session storage (client-side UI only)
  sessionStorage.setItem('demo_role', role);
}
```

**Note**: For full RLS integration, we'd need to pass this via a custom header in server requests. This is complex with Next.js App Router. **Alternative**: Store demo_role in user_profiles table temporarily while in demo mode.

---

### **Step 7: Remove Application-Layer Filtering**

Since RLS now handles everything, we can remove the `.eq('tenant_id', activeTenantId)` filters I added:

**File**: `app/trespass/page.tsx`

```typescript
// REMOVE these lines:
import { getActiveTenantId } from '@/lib/subdomain';
const activeTenantId = await getActiveTenantId();
.eq('tenant_id', activeTenantId)

// Keep it simple - RLS handles filtering:
const { data: records } = await supabase
  .from('trespass_records')
  .select('*')
  .order('incident_date', { ascending: false });
```

---

## 🧪 TESTING CHECKLIST

- [ ] Birdville user visits `birdville.districttracker.com` → sees ONLY Birdville records
- [ ] Birdville user visits `demo.districttracker.com` → sees ONLY demo records
- [ ] Birdville user visits `keller.districttracker.com` → BLOCKED (unauthorized)
- [ ] Demo role switcher: viewer → cannot create records
- [ ] Demo role switcher: campus_admin → can create/edit records
- [ ] Demo role switcher: district_admin → can create/edit/delete records
- [ ] Cron job resets demo tenant every 6 hours
- [ ] Localhost defaults to demo workspace
- [ ] "Switch to Demo" button works
- [ ] "Back to Production" button works
- [ ] No production/demo data mixing

---

## 🚀 DEPLOYMENT ORDER

1. Apply database migrations (RLS changes)
2. Deploy middleware and server actions
3. Deploy UI components
4. Test on staging.districttracker.com
5. Merge to production

---

**End of Implementation Plan**
