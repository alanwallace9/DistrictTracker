# Development Guide

**Project:** DistrictTracker
**Framework:** Next.js 15 + React 19 + TypeScript
**Last Updated:** 2025-11-23

---

## Prerequisites

- **Node.js:** v18+ (v20 recommended)
- **Package Manager:** npm (comes with Node.js)
- **Database:** Supabase account (or local Supabase CLI)
- **Authentication:** Clerk account
- **Rate Limiting:** Upstash Redis account

---

## Environment Setup

### 1. Clone Repository

```bash
git clone <repository-url>
cd DistrictTracker
```

### 2. Install Dependencies

```bash
npm install
```

**Total Dependencies:** 80+ packages (~500MB node_modules)

### 3. Environment Variables

Create `.env.local` file:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Clerk
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
CLERK_WEBHOOK_SECRET=whsec_...

# Upstash Redis
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Note:** Never commit `.env.local` to version control

---

## Development Workflow

### Start Development Server

```bash
npm run dev
```

**Access:** http://localhost:3000

**Features:**
- Hot module replacement (HMR)
- Fast refresh for React components
- TypeScript type checking in IDE
- Server Actions reload on save

---

### Type Checking

```bash
npm run typecheck
```

Runs TypeScript compiler without emitting files. Useful for catching type errors before build.

---

### Linting

```bash
npm run lint
```

Runs ESLint to check code quality and style.

**Note:** ESLint is currently disabled during builds (`next.config.js`)

---

### Build for Production

```bash
npm run build
```

Creates optimized production build in `.next/` directory.

**Build Output:**
- Client-side bundles
- Server-side bundles
- Static assets
- Build manifest

---

### Start Production Server

```bash
npm run start
```

Starts Next.js production server (requires `npm run build` first).

---

## Database Management

### Supabase Migrations

**Create New Migration:**

```bash
supabase migration new <migration_name>
```

**Apply Migrations:**

```bash
supabase db push
```

**Reset Database (Local):**

```bash
supabase db reset
```

**Migrations Location:** `supabase/migrations/`

---

### Seed Demo Data

```bash
npm run seed:demo
```

**Script:** `scripts/seed-demo-data.ts`

Populates demo tenant with sample data:
- 2 campuses
- 10 users
- 50 trespass records
- Sample feedback submissions

---

## Module Development

### Adding a New Module

1. Create module route: `app/{module-name}/page.tsx`
2. Create component directory: `components/{module-name}/`
3. Add server actions: `app/actions/{module-actions}.ts`
4. Create documentation: `modules/{ModuleName}/`
5. Add database tables (if needed): `supabase/migrations/`

**Example:** DAEPManagement module structure

---

### Module Integration

**Shared Resources:**
- Database: Access via `lib/supabase/server.ts` or `lib/supabase/client.ts`
- Authentication: Use Clerk hooks (`useAuth()`, `useUser()`)
- Tenant Context: Use `contexts/SubdomainTenantContext.tsx`
- UI Components: Import from `components/ui/` or `components/shared/`

---

## Testing

**Current State:** No automated tests configured

**Recommended Setup:**

```bash
# Install testing dependencies
npm install -D vitest @testing-library/react @testing-library/jest-dom

# Install E2E testing
npm install -D playwright
```

**Test Structure:**
```
__tests__/
├── unit/                   # Unit tests (Vitest)
├── integration/            # Integration tests
└── e2e/                    # End-to-end tests (Playwright)
```

---

## Deployment

### Vercel (Recommended)

**Automatic Deployments:**
1. Connect GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Push to `main` branch → automatic production deployment
4. Push to other branches → automatic preview deployments

**Environment Variables:**
- Copy all `.env.production` variables to Vercel dashboard
- Set `VERCEL=1` (automatically set by Vercel)

**Build Settings:**
- Framework: Next.js
- Build Command: `npm run build`
- Output Directory: `.next`
- Install Command: `npm install`

---

### Manual Deployment

```bash
# Build application
npm run build

# Start production server
npm run start
```

**Requirements:**
- Node.js 18+ on server
- Environment variables configured
- Port 3000 available (or customize via PORT env var)

---

## Project Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `NODE_OPTIONS='--max-old-space-size=8192' next dev` | Start development server with increased memory |
| `build` | `next build` | Build for production |
| `start` | `next start` | Start production server |
| `lint` | `next lint` | Run ESLint |
| `typecheck` | `tsc --noEmit` | Type check without building |
| `seed:demo` | `ts-node scripts/seed-demo-data.ts` | Seed demo tenant with sample data |

---

## Common Tasks

### Adding a New Page

1. Create file: `app/{route-name}/page.tsx`
2. Export React component as default
3. Add to navigation (if needed)

```typescript
// app/my-page/page.tsx
export default function MyPage() {
  return <div>My Page Content</div>;
}
```

---

### Adding a Server Action

1. Create file: `app/actions/{action-name}.ts`
2. Add `'use server'` directive
3. Implement action with Clerk auth

```typescript
'use server';

import { auth } from '@clerk/nextjs/server';
import { createServerClient } from '@/lib/supabase/server';

export async function myAction(data: any) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  const supabase = await createServerClient();

  // Perform database operations
  const { data: result, error } = await supabase
    .from('table_name')
    .insert(data)
    .select()
    .single();

  if (error) throw new Error(error.message);

  return result;
}
```

---

### Adding a UI Component

1. Check if component exists in `components/ui/`
2. If not, add via shadcn/ui CLI or create custom

```bash
# Add shadcn/ui component
npx shadcn-ui@latest add button
```

---

### Adding a Database Table

1. Create migration:

```bash
supabase migration new create_my_table
```

2. Write SQL in `supabase/migrations/{timestamp}_create_my_table.sql`:

```sql
CREATE TABLE my_table (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE my_table ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Tenant isolation" ON my_table
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::text);
```

3. Apply migration:

```bash
supabase db push
```

---

## Troubleshooting

### Port Already in Use

```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 npm run dev
```

---

### Type Errors After npm install

```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

---

### Supabase Connection Issues

1. Check environment variables
2. Verify Supabase project is active
3. Check RLS policies are not blocking queries
4. Use service role key for admin operations

---

### Clerk Authentication Issues

1. Verify Clerk environment variables
2. Check webhook secret matches Clerk dashboard
3. Ensure user has proper metadata (tenant_id, role)
4. Check middleware is not blocking route

---

## Code Style Guidelines

### TypeScript

- Use strict mode (`"strict": true`)
- Prefer interfaces over types for object shapes
- Use `type` for unions and utility types
- Always type function parameters and return values

### React

- Use function components (no class components)
- Prefer Server Components over Client Components
- Use Server Actions for mutations
- Keep components focused and small (<300 lines)

### File Naming

- Components: PascalCase (`MyComponent.tsx`)
- Utilities: camelCase (`myUtil.ts`)
- Server Actions: camelCase (`myAction.ts`)
- Routes: lowercase with hyphens (`my-route/page.tsx`)

### Imports

- Use path aliases: `@/` for root imports
- Group imports: external → internal → relative
- Sort imports alphabetically

---

## Performance Tips

### Server Components

- Default to Server Components
- Only use Client Components when needed (interactivity, hooks)
- Mark Client Components with `'use client'` directive

### Data Fetching

- Fetch data in Server Components
- Use parallel fetching with `Promise.all()`
- Cache with React `cache()` function

### Images

- Use Next.js `<Image>` component
- Provide `width` and `height` props
- Use appropriate image formats (WebP, AVIF)

---

## Resources

- **Next.js Docs:** https://nextjs.org/docs
- **Supabase Docs:** https://supabase.com/docs
- **Clerk Docs:** https://clerk.com/docs
- **Tailwind CSS:** https://tailwindcss.com/docs
- **shadcn/ui:** https://ui.shadcn.com

---

## Support

- **Issues:** Check `modules/TrespassTracker/TODO.md` for known issues
- **Security:** See `modules/TrespassTracker/docs/security/` for security documentation
- **Features:** See `modules/TrespassTracker/docs/features/` for feature documentation

---

## Summary

DistrictTracker follows modern Next.js 15 development practices with TypeScript, Server Components, and Server Actions. The development workflow is streamlined with hot reload, type checking, and comprehensive tooling.

**Quick Start:**
1. Install dependencies: `npm install`
2. Configure environment: Copy `.env.example` to `.env.local`
3. Start dev server: `npm run dev`
4. Access: http://localhost:3000
