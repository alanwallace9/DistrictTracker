# Migration Plan: Demo + DAEP Module
**Date**: 2025-11-09
**Target**: Multi-module architecture with demo environment

---

## 🎯 Recommended Architecture

**Choice**: Monorepo with Turborepo
**Reason**: Scalability for future modules (attendance, gradebook, etc.)

---

## 📊 Final Structure

```
district-tracker/
├── apps/
│   ├── trespass/                   # Trespass Tracker (current app)
│   │   ├── app/
│   │   ├── components/
│   │   ├── lib/
│   │   ├── package.json
│   │   └── next.config.js
│   └── daep/                       # DAEP Dashboard (new)
│       ├── app/
│       ├── components/
│       ├── lib/
│       ├── package.json
│       └── next.config.js
├── packages/
│   ├── ui/                         # Shared UI components
│   │   ├── src/
│   │   │   ├── button.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── table.tsx
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── database/                   # Shared Supabase client
│   │   ├── src/
│   │   │   ├── client.ts
│   │   │   ├── types.ts
│   │   │   └── server.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── auth/                       # Shared auth utilities
│   │   ├── src/
│   │   │   ├── AuthContext.tsx
│   │   │   ├── middleware.ts
│   │   │   └── utils.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── config/                     # Shared config & types
│       ├── src/
│       │   ├── constants.ts
│       │   └── types.ts
│       ├── package.json
│       └── tsconfig.json
├── package.json                    # Root workspace
├── turbo.json                      # Turborepo config
├── tsconfig.json                   # Base TypeScript config
└── .github/
    └── workflows/
        └── deploy.yml              # Multi-app CI/CD
```

---

## 🚀 Migration Steps

### Week 1: Security Fixes + Demo Setup
**Priority**: Critical security issues from audit

#### Day 1-2: Security Audit Corrections
- [ ] Verify .env files not in git history
- [ ] Add webhook payload validation
- [ ] Replace localStorage with sessionStorage for feedback
- [ ] Add input validation with Zod
- [ ] Add CSP headers

#### Day 3-4: Demo Environment
- [ ] Create demo tenant in Supabase
  ```sql
  INSERT INTO tenants (id, name, display_name, subdomain)
  VALUES ('demo-tenant', 'Demo District', 'Demo District', 'demo');
  ```
- [ ] Add demo banner component
  ```tsx
  // components/DemoBanner.tsx
  export function DemoBanner() {
    return (
      <div className="bg-blue-600 text-white py-2 text-center">
        This is a demo environment. Data resets nightly.
      </div>
    );
  }
  ```
- [ ] Configure Vercel domain: `demo.districttracker.com`
- [ ] Update middleware for demo mode
- [ ] Enable public signups for demo subdomain
- [ ] Create reset demo data cron job

#### Day 5: Testing
- [ ] Test demo signup flow
- [ ] Test data isolation
- [ ] Verify nightly reset works

---

### Week 2: Monorepo Migration
**Goal**: Restructure for multi-module architecture

#### Day 1: Setup Turborepo
```bash
# Install Turborepo
npm install turbo --save-dev

# Initialize
npx turbo init

# Create folder structure
mkdir -p apps packages
mkdir -p apps/trespass apps/daep
mkdir -p packages/ui packages/database packages/auth packages/config
```

#### Day 2-3: Move Current App
```bash
# Move current app to apps/trespass
mv app apps/trespass/
mv components apps/trespass/
mv lib apps/trespass/
mv contexts apps/trespass/
mv public apps/trespass/
mv next.config.js apps/trespass/

# Create root package.json
```

**Root package.json**:
```json
{
  "name": "district-tracker",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck"
  },
  "devDependencies": {
    "turbo": "latest"
  }
}
```

**turbo.json**:
```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {},
    "typecheck": {}
  }
}
```

#### Day 4: Extract Shared Components
```bash
# packages/ui/package.json
{
  "name": "@district/ui",
  "version": "0.0.0",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "dependencies": {
    "react": "^18.2.0",
    "@radix-ui/react-dialog": "^1.0.5"
  }
}

# Move components
cp -r apps/trespass/components/ui/* packages/ui/src/

# Update imports in trespass app
# FROM: import { Button } from '@/components/ui/button'
# TO:   import { Button } from '@district/ui'
```

#### Day 5: Extract Database & Auth
```bash
# packages/database/
mv apps/trespass/lib/supabase packages/database/src/

# packages/auth/
mv apps/trespass/contexts/AuthContext.tsx packages/auth/src/
```

---

### Week 3: DAEP Dashboard Scaffold
**Goal**: Build initial DAEP module structure

#### Day 1-2: Setup DAEP App
```bash
# Create Next.js app in apps/daep
cd apps/daep
npm init -y
npm install next react react-dom

# Copy base config from trespass
cp ../trespass/next.config.js .
cp ../trespass/tsconfig.json .
cp ../trespass/tailwind.config.ts .
```

**apps/daep/package.json**:
```json
{
  "name": "@district/daep",
  "version": "0.0.0",
  "scripts": {
    "dev": "next dev --port 3003",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "15.0.0",
    "react": "18.2.0",
    "@district/ui": "*",
    "@district/database": "*",
    "@district/auth": "*"
  }
}
```

#### Day 3-4: Build DAEP Pages
```typescript
// apps/daep/app/page.tsx
import { Button } from '@district/ui';
import { createServerClient } from '@district/database';

export default function DAEPDashboard() {
  return (
    <div>
      <h1>DAEP Dashboard</h1>
      {/* Build your DAEP-specific UI */}
    </div>
  );
}
```

#### Day 5: Configure Deployment
**vercel.json** (root):
```json
{
  "buildCommand": "turbo run build",
  "outputDirectory": ".next",
  "projects": [
    {
      "name": "trespass-tracker",
      "source": "apps/trespass",
      "framework": "nextjs",
      "domains": ["trespass.districttracker.com", "demo.districttracker.com"]
    },
    {
      "name": "daep-dashboard",
      "source": "apps/daep",
      "framework": "nextjs",
      "domains": ["daep.districttracker.com"]
    }
  ]
}
```

---

## 🔒 Demo Data Reset Strategy

### Cron Job (Already exists!)
**Location**: `apps/trespass/app/api/cron/reset-demo/route.ts`

**Enhancement Needed**:
```typescript
import { createClient } from '@supabase/supabase-js';

export async function GET(req: Request) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Delete demo tenant data
  await supabaseAdmin
    .from('trespass_records')
    .delete()
    .eq('tenant_id', 'demo-tenant');

  // Re-insert seed data
  const seedData = [
    {
      tenant_id: 'demo-tenant',
      first_name: 'John',
      last_name: 'Doe',
      school_id: 'DEMO001',
      // ... rest of demo data
    }
  ];

  await supabaseAdmin
    .from('trespass_records')
    .insert(seedData);

  return new Response('Demo data reset successfully', { status: 200 });
}
```

**Vercel Cron** (vercel.json):
```json
{
  "crons": [
    {
      "path": "/api/cron/reset-demo",
      "schedule": "0 0 * * *"
    }
  ]
}
```

---

## 🌐 Deployment Strategy

### Domains
- `districttracker.com` → Marketing site
- `app.districttracker.com` → Trespass Tracker (production)
- `demo.districttracker.com` → Trespass Tracker (demo mode)
- `daep.districttracker.com` → DAEP Dashboard
- `admin.districttracker.com` → Admin portal (future)

### Environment Variables Per App

**apps/trespass/.env.production** (for demo):
```bash
NEXT_PUBLIC_IS_DEMO=true
NEXT_PUBLIC_DEMO_TENANT_ID=demo-tenant
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

**apps/trespass/.env.production** (for production):
```bash
NEXT_PUBLIC_IS_DEMO=false
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

---

## 📦 Package Dependencies

### Shared Packages (`packages/`)

**packages/ui**:
- React
- Radix UI
- Tailwind CSS
- Lucide React

**packages/database**:
- @supabase/supabase-js

**packages/auth**:
- @clerk/nextjs

**packages/config**:
- TypeScript only (types & constants)

### Apps (`apps/`)

**apps/trespass**:
- All packages/*
- Next.js
- App-specific dependencies

**apps/daep**:
- All packages/*
- Next.js
- DAEP-specific dependencies

---

## 🧪 Testing Strategy

### Shared Package Testing
```json
// packages/ui/package.json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui"
  }
}
```

### Integration Testing
- Test cross-app component usage
- Test shared database client
- Test auth flow in both apps

---

## 📈 Benefits of This Architecture

1. **Code Reuse**: 60-70% code sharing between modules
2. **Independent Deployment**: Each app deploys separately
3. **Type Safety**: Shared types across all apps
4. **Build Optimization**: Turborepo caches builds
5. **Scalability**: Easy to add new modules
6. **Maintenance**: Single repo, multiple products
7. **Team Productivity**: Clear boundaries, shared components

---

## 🎯 Success Metrics

- [ ] Demo site accessible at demo.districttracker.com
- [ ] Public signup works for demo users
- [ ] Demo data resets nightly
- [ ] Monorepo builds successfully
- [ ] DAEP app deploys independently
- [ ] Shared components work in both apps
- [ ] Security audit issues resolved

---

## 📚 Resources

- [Turborepo Docs](https://turbo.build/repo/docs)
- [Vercel Monorepo Guide](https://vercel.com/docs/monorepos)
- [Next.js Multi-Zone](https://nextjs.org/docs/advanced-features/multi-zones)

---

**Created**: 2025-11-09
**Last Updated**: 2025-11-09
**Status**: Ready for implementation
