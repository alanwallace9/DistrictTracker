# Auth Setup for Public Feedback System

## Overview

The feedback system supports **two types of users** while maintaining strict tenant isolation for dashboards:

1. **Tenant Users** - Invited to specific tenant, can access both dashboards AND feedback
2. **Feedback Users** - Self-signup, can ONLY access feedback board (not dashboards)

## Database Changes ✅ COMPLETE

The following migrations have been applied:

### 1. Updated `user_profiles` table
- `tenant_id` - Now **nullable** (required for tenant users, null for feedback users)
- `user_type` - New field: `'tenant_user'` or `'feedback_user'`
- `display_organization` - Org name shown publicly on feedback (user-controlled)
- `show_organization` - Privacy toggle (default: true)
- `display_name` - Auto-generated as "FirstName L." from first/last name

### 2. New `feedback_categories` table
- Stores software products (TrespassTracker, DAEP Dashboard, etc.)
- Master admin can activate/deactivate categories
- Seeded with 4 initial categories

### 3. New `feedback_submissions` table
- All feedback items submitted by users
- Public by default (`is_public: true`)
- Tracks upvotes, status, admin notes, roadmap info

### 4. New `feedback_upvotes` table
- Tracks who upvoted what
- Unique constraint prevents duplicate votes

## URL Structure

```
tenant1.districttracker.com/trespass     → TrespassTracker (tenant users only)
tenant1.districttracker.com/daep         → DAEP Dashboard (tenant users only)
tenant1.districttracker.com/admin        → Admin Panel (admins only)

districttracker.com/feedback             → Public Feedback Board (everyone can VIEW)
districttracker.com/feedback/roadmap     → Roadmap (everyone can VIEW)
districttracker.com/feedback/changelog   → Changelog (everyone can VIEW)
```

## Clerk Configuration (TODO - You'll need to do this)

### Step 1: Allow Sign-Ups

In Clerk Dashboard (https://clerk.com):

1. Go to **User & Authentication → Email, Phone, Username**
2. Enable **Allow sign-ups**: ✅ YES
3. **Verification**: Require email verification (prevents spam)
4. Save changes

### Step 2: Configure Session Settings

1. Go to **Sessions**
2. Enable **Multi-session applications**: ✅ YES
3. This allows auth to work across `*.districttracker.com`

### Step 3: Update Webhook (if needed)

Your Clerk webhook at `/api/webhooks/clerk/route.ts` currently creates `user_profiles` with required `tenant_id`.

You'll need to update it to:
- Allow `tenant_id` to be null for feedback signups
- Set `user_type` to 'feedback_user' for non-tenant signups
- Set `user_type` to 'tenant_user' for invited users

## Auth Flow

### Scenario 1: Tenant User (Already Logged In)
```
User at: tenant1.districttracker.com/trespass (logged in)
  ↓
Clicks "Feedback" in menu
  ↓
Goes to: districttracker.com/feedback
  ↓
Clerk session still valid (same root domain)
  ↓
✅ Can immediately submit/upvote feedback
```

### Scenario 2: Anonymous Visitor
```
Anonymous at: districttracker.com/feedback
  ↓
Can VIEW all feedback, roadmap, changelog
  ↓
Clicks "Upvote" or "Submit Idea"
  ↓
Redirected to: districttracker.com/login
  ↓
Options:
  - Sign in (if existing user)
  - Sign up (new feedback user)
  ↓
After auth:
  ↓
Redirect back to: districttracker.com/feedback
  ↓
✅ Can now upvote/submit
```

### Scenario 3: Feedback User Tries to Access Dashboard
```
Feedback user (tenant_id = null, user_type = 'feedback_user')
  ↓
Tries to visit: tenant1.districttracker.com/trespass
  ↓
Middleware checks:
  - User is authenticated ✅
  - User has tenant_id? ❌ NO (null)
  ↓
Middleware redirects to: /feedback?error=no_access
  ↓
Shows message: "This area requires a tenant account. Contact your administrator for access."
```

### Scenario 4: Tenant User Switches Tenants (Blocked)
```
User belongs to: tenant1 (Pine Valley ISD)
  ↓
Tries to access: tenant2.districttracker.com/trespass
  ↓
Middleware checks:
  - User tenant_id: tenant1
  - Requested tenant: tenant2
  - User role: district_admin (not master_admin)
  ↓
Middleware redirects: /feedback?error=wrong_tenant
  ↓
Shows message: "You don't have access to this tenant's data."
```

## Middleware Logic (Next Steps)

The middleware needs to implement these rules:

### Public Routes (No Auth Required)
- `/` - Landing page
- `/login` - Login page
- `/feedback` - View feedback (read-only)
- `/feedback/roadmap` - View roadmap
- `/feedback/changelog` - View changelog

### Feedback Interaction Routes (Auth Required, No Tenant Needed)
- `/feedback/submit` - Submit new feedback
- `/feedback/api/*` - API routes for upvoting, etc.
- User must be logged in (tenant OR feedback user)

### Dashboard Routes (Auth + Tenant Required)
- `/trespass/*` - TrespassTracker dashboard
- `/daep/*` - DAEP dashboard
- `/attendance/*` - Attendance dashboard
- `/admin/*` - Admin panel
- User must:
  - Be authenticated
  - Have `user_type = 'tenant_user'`
  - Have matching `tenant_id` (unless master_admin)

## RLS Policies ✅ COMPLETE

All feedback tables have RLS enabled:

### feedback_categories
- Everyone can read active categories
- Master admin can view all (including inactive)
- Master admin can create/update/delete

### feedback_submissions
- Everyone can read public feedback
- Authenticated users can create feedback
- Users can update/delete their own
- Master admin can update/delete any

### feedback_upvotes
- Everyone can read upvotes
- Authenticated users can upvote
- Users can remove their own upvotes

## Testing Checklist

After implementing middleware and Clerk webhook:

### Test as Tenant User
- [ ] Can log into tenant dashboard
- [ ] Can access feedback board without re-login
- [ ] Can submit feedback
- [ ] Can upvote feedback
- [ ] Cannot access other tenant's dashboard

### Test as Feedback User
- [ ] Can sign up on feedback board
- [ ] Can submit feedback
- [ ] Can upvote feedback
- [ ] CANNOT access any tenant dashboard
- [ ] Get clear error message when trying to access dashboard

### Test as Anonymous
- [ ] Can view all feedback
- [ ] Can view roadmap
- [ ] Can view changelog
- [ ] Must login to upvote
- [ ] Must login to submit
- [ ] After login, redirected back correctly

### Test as Master Admin
- [ ] Can access any tenant's dashboard
- [ ] Can manage feedback categories
- [ ] Can update any feedback item
- [ ] Can change feedback status

## Next Steps

1. ✅ Database schema updated
2. ✅ TypeScript types added
3. **TODO**: Update middleware (see middleware.ts)
4. **TODO**: Update Clerk webhook (see app/api/webhooks/clerk/route.ts)
5. **TODO**: Configure Clerk dashboard settings
6. **TODO**: Test auth flows
7. **TODO**: Build feedback UI components

## Clerk Metadata Structure

### Tenant User (Invited)
```json
{
  "publicMetadata": {
    "role": "district_admin",
    "tenant_id": "tenant-uuid-123",
    "campus_id": null
  }
}
```

### Feedback User (Self-Signup)
```json
{
  "publicMetadata": {
    "role": "viewer",
    "tenant_id": null,
    "campus_id": null
  }
}
```

### Database Record (Tenant User)
```sql
INSERT INTO user_profiles (
  id, email, tenant_id, user_type, role
) VALUES (
  'user_clerk123', 'user@district.com', 'tenant-uuid-123', 'tenant_user', 'district_admin'
);
```

### Database Record (Feedback User)
```sql
INSERT INTO user_profiles (
  id, email, tenant_id, user_type, role, display_organization
) VALUES (
  'user_clerk456', 'feedback@example.com', NULL, 'feedback_user', 'viewer', 'Independent Educator'
);
```

## Important Notes

- **NEVER** let feedback users access dashboard routes
- **NEVER** let tenant users access other tenants' data (unless master_admin)
- **ALWAYS** validate `user_type` and `tenant_id` in middleware
- **ALWAYS** check Clerk `publicMetadata` matches database `user_profiles`
- Feedback board is **cross-tenant** by design (no tenant filtering on public view)
- Admin panel shows feedback from **all tenants** (master admin only)
