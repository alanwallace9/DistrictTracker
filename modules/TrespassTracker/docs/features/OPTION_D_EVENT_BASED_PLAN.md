# Option D: Event-Based Tenant Switching (Production Plan)

**Date**: 2025-11-16
**Status**: Ready for Implementation
**Goal**: Fix UI sync issues without server polling overhead

---

## 🎯 PROBLEMS TO SOLVE

### Problem 1: UI State Out of Sync
**Symptom**:
- staging.districttracker.com shows "BISD" header when in demo mode
- localhost:3003 shows "DEMO" header when in birdville mode
- Role switcher appears/disappears incorrectly

**Root Cause**:
- DemoRoleContext only checks workspace on mount and pathname change
- When admin uses tenant switcher, pathname doesn't change
- UI never re-checks server state

### Problem 2: Demo Domain Shows Wrong Records
**Symptom**:
- demo.districttracker.com shows Birdville records instead of demo records

**Root Cause**:
- Middleware auto-switch logic might not be triggering on production
- OR active_tenant_id isn't being set correctly

### Problem 3: Missing Images
**Symptom**:
- Images not loading on any domain

**Root Cause**:
- Field name changed from `photo_url` to `photo` earlier in session
- Frontend still looking for old field name

---

## ✅ SOLUTION: Event-Based Updates (Zero Polling)

### Architecture

**Instead of polling every 2 seconds:**
```
❌ BAD: Poll server every 2s
- 30 requests/min per user
- 3,000 requests/min if 100 users online
- Unnecessary server load
```

**Use event broadcasting:**
```
✅ GOOD: Event-based updates
- Admin switches tenant → Broadcast event → DemoRoleContext updates
- Middleware auto-switches → Page load → Check once on mount
- Zero polling overhead
- Instant UI updates
```

---

## 📋 IMPLEMENTATION STEPS

### **Step 1: Create Shared Event Emitter**

**File**: `lib/tenant-events.ts` (NEW)

```typescript
/**
 * Shared event bus for tenant switching
 * Allows AdminTenantContext to notify DemoRoleContext of changes
 */

type TenantChangeEvent = {
  tenantId: string | null;
  isDemo: boolean;
};

type EventCallback = (data: TenantChangeEvent) => void;

class TenantEventEmitter {
  private listeners: EventCallback[] = [];

  on(callback: EventCallback) {
    this.listeners.push(callback);
  }

  off(callback: EventCallback) {
    this.listeners = this.listeners.filter(cb => cb !== callback);
  }

  emit(data: TenantChangeEvent) {
    this.listeners.forEach(callback => callback(data));
  }
}

export const tenantEvents = new TenantEventEmitter();
```

**Why**:
- Lightweight event system (no external dependencies)
- Works entirely client-side
- TypeScript type-safe

---

### **Step 2: Update AdminTenantContext to Broadcast Events**

**File**: `contexts/AdminTenantContext.tsx`

**Find the function that updates active_tenant_id and add:**

```typescript
import { tenantEvents } from '@/lib/tenant-events';

async function setActiveTenant(tenantId: string | null) {
  // Existing code to update database...
  await supabase
    .from('user_profiles')
    .update({ active_tenant_id: tenantId })
    .eq('id', userId);

  // NEW: Broadcast the change
  tenantEvents.emit({
    tenantId: tenantId,
    isDemo: tenantId === 'demo'
  });

  // Existing refresh logic...
  router.refresh();
}
```

**Why**:
- Notifies DemoRoleContext immediately
- No waiting, no polling
- Works with existing admin switcher

---

### **Step 3: Update DemoRoleContext to Listen for Events**

**File**: `contexts/DemoRoleContext.tsx`

```typescript
import { tenantEvents } from '@/lib/tenant-events';

export function DemoRoleProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [demoRole, setDemoRoleState] = useState<DemoRole>('campus_admin');
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Check workspace status from server
  async function checkWorkspace() {
    const workspace = await getCurrentWorkspace();
    if (workspace) {
      setIsDemoMode(workspace.isDemo);
      if (workspace.isDemo) {
        setDemoRoleState(workspace.demoRole || 'campus_admin');
      }
    }
  }

  useEffect(() => {
    // Check once on mount or pathname change
    checkWorkspace();

    // Listen for tenant switch events (from AdminTenantContext)
    const handleTenantChange = (data: { tenantId: string | null; isDemo: boolean }) => {
      setIsDemoMode(data.isDemo);
      if (data.isDemo) {
        checkWorkspace(); // Refresh to get demo_role
      }
    };

    tenantEvents.on(handleTenantChange);

    // Cleanup listener on unmount
    return () => {
      tenantEvents.off(handleTenantChange);
    };
  }, [pathname]);

  // Rest of component...
}
```

**Why**:
- Only 1 server request on mount
- Only 1 server request when admin switches tenant
- Instant UI updates via events
- Zero polling overhead

---

### **Step 4: Fix Image Field Name**

**Problem**: Code is looking for `photo_url` but database field is `photo`

**Files to Update**:

1. **components/RecordCard.tsx** (or wherever images are displayed)
```typescript
// BEFORE:
<img src={record.photo_url} />

// AFTER:
<img src={record.photo} />
```

2. **Search all files for `photo_url`**:
```bash
grep -r "photo_url" --include="*.tsx" --include="*.ts"
```

3. **Replace with `photo`** in:
- Any component displaying images
- Any form creating/editing records
- Any type definitions (should already be updated in lib/supabase.ts)

**Why**:
- Database migration changed field name from `photo_url` to `photo`
- Frontend code still using old name
- Simple find/replace fix

---

### **Step 5: Debug Why Demo Domain Shows Birdville Records**

**Investigation Steps**:

1. **Check middleware logs** (add console.log temporarily):
```typescript
// In middleware.ts
export default clerkMiddleware(async (auth, request) => {
  const hostname = request.headers.get('host') || '';
  const subdomain = getSubdomainFromHostname(hostname);

  console.log('[MIDDLEWARE] hostname:', hostname);
  console.log('[MIDDLEWARE] subdomain:', subdomain);

  if (subdomain === 'demo') {
    console.log('[MIDDLEWARE] Demo subdomain detected, should auto-switch');
    // ... existing auto-switch logic
  }
});
```

2. **Check user profile in database**:
```sql
SELECT id, email, tenant_id, active_tenant_id
FROM user_profiles
WHERE email = 'alan.wallace@birdvilleschools.net';
```

**Expected**:
- When visiting demo.districttracker.com, middleware should set `active_tenant_id = 'demo'`
- RLS should return demo records

**If NOT working**:
- Middleware might not be running on production (check Vercel logs)
- Supabase client in middleware might not have permissions
- Need to use `supabaseAdmin` client instead of `supabase` in middleware

**Potential Fix**:
```typescript
// In middleware.ts, change:
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!  // ← Has limited permissions
);

// To:
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!  // ← Has full permissions
);
```

**Why**:
- Middleware runs server-side
- Needs admin permissions to update user profiles
- Anon key might not have write access

---

## 🧪 TESTING PLAN

### Test 1: Local Development (localhost:3003)
1. ✅ Login → Should show "DEMO Trespass Tracker" header
2. ✅ Should see demo records (not Birdville)
3. ✅ Images should load
4. ✅ Role switcher should appear
5. ✅ Switch to viewer → Can't edit
6. ✅ Switch to campus_admin → Can edit

### Test 2: Admin Tenant Switcher (localhost:3003)
1. ✅ Click admin dropdown → Switch to Birdville
2. ✅ UI should immediately update to "BISD Trespass Management"
3. ✅ Should see Birdville records
4. ✅ Role switcher should disappear
5. ✅ Images should load

### Test 3: Demo Domain (demo.districttracker.com)
1. ✅ Login → Should show "DEMO Trespass Tracker" header
2. ✅ Should see demo records (NOT Birdville) ← Currently broken
3. ✅ Images should load ← Currently broken
4. ✅ Role switcher should appear
5. ✅ Middleware should auto-set active_tenant_id = 'demo'

### Test 4: Staging Domain (staging.districttracker.com)
1. ✅ Login → Should show "DEMO Trespass Tracker" header
2. ✅ Should see demo records
3. ✅ Images should load
4. ✅ Use admin switcher → Switch to Birdville
5. ✅ Should show "BISD Trespass Management"
6. ✅ Should see Birdville records

---

## 📊 DEPLOYMENT ORDER

### Phase 1: Fix Current Issues (Staging)
1. ✅ Implement event emitter (Step 1)
2. ✅ Update AdminTenantContext (Step 2)
3. ✅ Update DemoRoleContext (Step 3)
4. ✅ Fix image field name (Step 4)
5. ✅ Fix middleware to use supabaseAdmin (Step 5)
6. ✅ Test locally on port 3003
7. ✅ Push to staging branch
8. ✅ Test on staging.districttracker.com

### Phase 2: Deploy to Production
1. ✅ Create backup branch: `backup-main-2025-11-16`
2. ✅ Merge staging → main
3. ✅ Push to production
4. ✅ Test on demo.districttracker.com
5. ✅ Verify images load
6. ✅ Verify demo records show (not Birdville)
7. ✅ Test admin tenant switcher

### Phase 3: Monitor and Rollback Plan
**If anything breaks:**
```bash
# Rollback to backup
git checkout main
git reset --hard backup-main-2025-11-16
git push origin main --force
```

**Monitor Vercel logs:**
- Check for middleware errors
- Check for Supabase permission errors
- Check for image loading errors

---

## 🔍 KNOWN ISSUES TO FIX

### Issue 1: Demo Domain Shows Birdville Records ❌
**Status**: Needs investigation
**Likely Cause**: Middleware not using admin client
**Fix**: Change middleware to use `SUPABASE_SERVICE_ROLE_KEY`

### Issue 2: Missing Images ❌
**Status**: Needs find/replace
**Cause**: Field renamed from `photo_url` to `photo`
**Fix**: Search and replace `photo_url` → `photo` in all components

### Issue 3: UI Header Out of Sync ❌
**Status**: Will be fixed by event system
**Cause**: DemoRoleContext not listening for tenant changes
**Fix**: Implement Steps 1-3

---

## 📈 PERFORMANCE COMPARISON

### Old Approach (Polling):
```
Server Requests per Hour (1 user):
- Poll every 2s = 30/min = 1,800/hour

Server Requests per Hour (100 users):
- 180,000 requests/hour
- Unnecessary load ❌
```

### New Approach (Event-Based):
```
Server Requests per Hour (1 user):
- 1 on page load
- 1 when switching tenant manually
- ~2-5 total per hour ✅

Server Requests per Hour (100 users):
- 200-500 requests/hour
- 99.7% reduction in load ✅
```

---

## ✅ SUCCESS CRITERIA

After implementation, the following should work:

1. ✅ **localhost:3003** → Shows "DEMO" header, demo records, images
2. ✅ **Admin switcher** → Instantly updates UI (no refresh needed)
3. ✅ **demo.districttracker.com** → Shows demo records (not Birdville)
4. ✅ **staging.districttracker.com** → Shows demo records, can switch to Birdville
5. ✅ **Images load** on all domains
6. ✅ **Zero polling** overhead (no unnecessary server requests)
7. ✅ **Role switcher** works with actual permissions (viewer can't edit)

---

**End of Plan**
