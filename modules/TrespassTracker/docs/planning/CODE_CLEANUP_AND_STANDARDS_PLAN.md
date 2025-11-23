# Code Cleanup & Standards Plan

## Purpose

Establish consistent industry standards and best practices so experienced developers can quickly understand the codebase and contribute effectively to future development.

**Status**: 📋 PLANNING (No code changes made yet)
**Target Date**: December 2025
**Effort**: 2-3 weeks (part-time)

---

## 1. File & Folder Organization

### Current State Assessment
✅ **Good**:
- Next.js App Router structure (`app/`, `components/`, `lib/`, `contexts/`)
- Documentation now organized in `docs/` folder
- SQL migrations in `supabase/migrations/`
- shadcn/ui components in `components/ui/`

⚠️ **Needs Improvement**:
- Some feature logic mixed in `app/actions/` (auth, records, admin, feedback)
- Utility functions scattered across `lib/` with no subcategories
- Component organization inconsistent (some features have dedicated folders, others don't)

### Recommended Structure
```
/TrespassTracker
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth group route
│   │   ├── login/
│   │   └── sign-up/
│   ├── (demo)/                   # Demo group route
│   │   └── demo-guide/
│   ├── (dashboard)/              # Main dashboard routes
│   │   ├── dashboard/
│   │   ├── trespass/
│   │   └── admin/
│   ├── api/                      # API routes
│   │   ├── cron/
│   │   └── webhooks/
│   ├── actions/                  # Server actions (organized by domain)
│   │   ├── records/              # Record CRUD operations
│   │   ├── users/                # User management
│   │   ├── campuses/             # Campus management
│   │   ├── feedback/             # Feedback system
│   │   └── admin/                # Admin operations
│   ├── feedback/                 # Feedback public routes
│   └── layout.tsx, page.tsx, etc.
│
├── components/                   # React components
│   ├── ui/                       # shadcn/ui primitives
│   ├── features/                 # Feature-specific components
│   │   ├── records/              # Record-related components
│   │   │   ├── AddRecordDialog.tsx
│   │   │   ├── RecordDetailDialog.tsx
│   │   │   ├── RecordCard.tsx
│   │   │   └── RecordsTable.tsx
│   │   ├── users/                # User-related components
│   │   │   ├── InviteUserDialog.tsx
│   │   │   └── BulkUserUploadDialog.tsx
│   │   ├── feedback/             # Feedback components
│   │   │   ├── FeedbackCard.tsx
│   │   │   ├── FeedbackDialog.tsx
│   │   │   └── UpvoteButton.tsx
│   │   └── admin/                # Admin panel components
│   │       ├── AdminAuditLog.tsx
│   │       └── StatsDropdown.tsx
│   ├── layout/                   # Layout components
│   │   ├── DashboardLayout.tsx
│   │   ├── AdminLayout.tsx
│   │   └── FeedbackNavBar.tsx
│   └── shared/                   # Shared/common components
│       ├── SettingsDialog.tsx
│       ├── ThemeToggle.tsx
│       └── LoadingSpinner.tsx
│
├── lib/                          # Utilities and helpers
│   ├── db/                       # Database utilities
│   │   ├── supabase.ts           # Supabase client
│   │   ├── types.ts              # Database types
│   │   └── queries/              # Reusable query helpers
│   ├── auth/                     # Authentication utilities
│   │   ├── clerk.ts              # Clerk helpers
│   │   └── permissions.ts        # Permission checks
│   ├── validation/               # Input validation
│   │   └── schemas.ts            # Zod schemas
│   ├── security/                 # Security utilities
│   │   ├── rate-limit.ts         # Rate limiting
│   │   ├── csrf.ts               # CSRF protection
│   │   └── audit-logger.ts       # Audit logging
│   ├── utils/                    # General utilities
│   │   ├── date.ts               # Date formatting
│   │   ├── string.ts             # String helpers
│   │   └── file.ts               # File upload helpers
│   └── constants.ts              # App-wide constants
│
├── contexts/                     # React contexts
│   ├── AuthContext.tsx
│   ├── DemoRoleContext.tsx
│   └── AdminTenantContext.tsx
│
├── hooks/                        # Custom React hooks
│   ├── useAuth.ts
│   ├── useExpiringWarnings.ts
│   └── useDebounce.ts
│
├── supabase/
│   ├── migrations/               # Database migrations (keep here)
│   └── seed/                     # Seed data (NEW)
│       ├── demo-data.ts
│       └── production-seed.ts
│
├── docs/                         # Documentation
│   ├── planning/                 # Architecture & planning
│   ├── features/                 # Feature specifications
│   ├── sessions/                 # Session notes (gitignored)
│   └── security/                 # Security audits
│
├── public/                       # Static assets
│   └── assets/
│
├── tests/                        # Test files (NEW)
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── .claude/                      # Claude Code commands
├── .github/                      # GitHub workflows (NEW)
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
│
└── Root config files
    ├── package.json
    ├── tsconfig.json
    ├── next.config.js
    ├── tailwind.config.ts
    ├── .eslintrc.json
    ├── .prettierrc
    ├── README.md
    ├── CLAUDE.md
    ├── CHANGELOG.md
    └── TODO.md
```

---

## 2. Naming Conventions

### File Naming
```typescript
// Components: PascalCase
AddRecordDialog.tsx
DashboardLayout.tsx
FeedbackCard.tsx

// Utilities/Hooks: camelCase
supabase.ts
useDebounce.ts
audit-logger.ts (exception: hyphenated for lib files)

// Server Actions: camelCase with domain prefix
records.ts          // Record-related actions
users.ts            // User-related actions
campuses.ts         // Campus-related actions

// Constants: UPPER_SNAKE_CASE or camelCase file
constants.ts
DB_CONSTANTS.ts
```

### Variable Naming
```typescript
// Boolean: is/has/can prefix
const isActive = true;
const hasPermission = false;
const canEdit = user.role === 'admin';

// Arrays: Plural nouns
const records = [];
const campuses = [];
const users = [];

// Functions: Verb prefix
function fetchRecords() {}
function createCampus() {}
function validateInput() {}
async function getUserProfile() {}

// Event handlers: handle prefix
const handleSubmit = () => {};
const handleChange = (e) => {};
const handleDelete = async (id) => {};

// React Components: PascalCase
function RecordCard({ record }) {}
export function DashboardLayout({ children }) {}

// Types/Interfaces: PascalCase
interface UserProfile {}
type TrespassRecord = {};
type AdminRole = 'viewer' | 'campus_admin' | 'district_admin';
```

### Database Naming
```sql
-- Tables: snake_case, plural
trespass_records
user_profiles
feedback_items

-- Columns: snake_case
created_at
tenant_id
is_daep
school_id

-- Foreign Keys: {table}_id
tenant_id (references tenants.id)
campus_id (references campuses.id)

-- Boolean columns: is_/has_ prefix
is_active
is_daep
has_photo
```

---

## 3. TypeScript Standards

### Current State
✅ **Good**:
- TypeScript enabled project-wide
- Type definitions in `lib/supabase.ts`
- Strict mode enabled in `tsconfig.json`

⚠️ **Needs Improvement**:
- Some `any` types still in use
- Missing types for some API responses
- Inconsistent use of interfaces vs types

### Standards

```typescript
// ❌ AVOID: any types
function processData(data: any) {
  return data.map((item: any) => item.name);
}

// ✅ PREFER: Explicit types
interface DataItem {
  id: string;
  name: string;
  createdAt: Date;
}

function processData(data: DataItem[]): string[] {
  return data.map(item => item.name);
}

// ❌ AVOID: Type assertions without checks
const user = response.data as User;

// ✅ PREFER: Type guards
function isUser(data: unknown): data is User {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'email' in data
  );
}

const data = response.data;
if (isUser(data)) {
  // TypeScript knows data is User here
  console.log(data.email);
}

// Use interfaces for object shapes
interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
}

// Use types for unions, primitives, and compositions
type UserRole = 'viewer' | 'campus_admin' | 'district_admin' | 'master_admin';
type Status = 'active' | 'inactive' | 'expired';

// Use generics for reusable patterns
interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  status: number;
}

async function fetchData<T>(url: string): Promise<ApiResponse<T>> {
  // ...
}
```

### Type Organization
```typescript
// lib/db/types.ts - Database types (auto-generated from Supabase)
export type TrespassRecord = Database['public']['Tables']['trespass_records']['Row'];
export type UserProfile = Database['public']['Tables']['user_profiles']['Row'];

// app/types/index.ts - Application-specific types
export interface RecordFormData {
  firstName: string;
  lastName: string;
  schoolId: string;
  // ... other form fields
}

export type SortDirection = 'asc' | 'desc';
export type ViewMode = 'card' | 'list';

// Component prop types in same file as component
interface RecordCardProps {
  record: TrespassRecord;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function RecordCard({ record, onEdit, onDelete }: RecordCardProps) {
  // ...
}
```

---

## 4. Component Patterns & Best Practices

### Component Structure
```typescript
'use client'; // Only if needed (client component)

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import type { TrespassRecord } from '@/lib/db/types';

// 1. Type definitions
interface RecordCardProps {
  record: TrespassRecord;
  onEdit?: (id: string) => void;
  className?: string;
}

// 2. Component definition
export function RecordCard({ record, onEdit, className }: RecordCardProps) {
  // 3. Hooks (useState, useEffect, custom hooks)
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);

  // 4. Effects
  useEffect(() => {
    // Side effects here
  }, [record.id]);

  // 5. Event handlers
  const handleEdit = () => {
    onEdit?.(record.id);
  };

  const handleToggle = () => {
    setIsExpanded(prev => !prev);
  };

  // 6. Early returns / guards
  if (!record) {
    return <div>No record found</div>;
  }

  // 7. Render logic
  const isExpired = new Date(record.expiration_date) < new Date();

  // 8. JSX return
  return (
    <div className={className}>
      <h3>{record.first_name} {record.last_name}</h3>
      {/* ... */}
    </div>
  );
}

// 9. Optional: Sub-components (if small and only used here)
function RecordStatus({ status }: { status: string }) {
  return <span className="badge">{status}</span>;
}
```

### Server Components vs Client Components

```typescript
// app/dashboard/page.tsx - Server Component (default)
// ✅ Can directly fetch data
// ✅ Better performance (less JavaScript to client)
// ❌ Cannot use hooks, event handlers, browser APIs

export default async function DashboardPage() {
  const records = await fetchRecords(); // Direct server call

  return (
    <div>
      <h1>Dashboard</h1>
      <RecordsList records={records} />
    </div>
  );
}

// components/RecordsList.tsx - Client Component
// ✅ Can use useState, useEffect, event handlers
// ✅ Interactive features
// ❌ Adds JavaScript bundle to client

'use client';

import { useState } from 'react';

interface RecordsListProps {
  records: TrespassRecord[];
}

export function RecordsList({ records: initialRecords }: RecordsListProps) {
  const [records, setRecords] = useState(initialRecords);

  const handleDelete = (id: string) => {
    // Interactive logic here
  };

  return (
    <div>
      {records.map(record => (
        <RecordCard key={record.id} record={record} onDelete={handleDelete} />
      ))}
    </div>
  );
}
```

### Error Handling Pattern
```typescript
// Server Action Pattern
export async function createRecord(data: RecordFormData) {
  try {
    // 1. Validate input
    const validated = recordSchema.parse(data);

    // 2. Authenticate & authorize
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Unauthorized' };
    }

    // 3. Check permissions
    const userProfile = await getUserProfile(userId);
    if (!canCreateRecords(userProfile.role)) {
      return { success: false, error: 'Insufficient permissions' };
    }

    // 4. Perform operation
    const { data: record, error } = await supabase
      .from('trespass_records')
      .insert(validated)
      .select()
      .single();

    if (error) {
      logger.error('[createRecord] Database error:', error);
      return { success: false, error: 'Failed to create record' };
    }

    // 5. Audit log
    await logAuditEvent({
      event_type: 'record.created',
      actor_id: userId,
      details: { record_id: record.id }
    });

    return { success: true, data: record };
  } catch (error) {
    if (error instanceof ZodError) {
      return { success: false, error: 'Invalid input data' };
    }

    logger.error('[createRecord] Unexpected error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
```

---

## 5. Code Style & Formatting

### ESLint & Prettier Configuration

```json
// .eslintrc.json (Enhanced)
{
  "extends": [
    "next/core-web-vitals",
    "plugin:@typescript-eslint/recommended",
    "plugin:react-hooks/recommended",
    "prettier"
  ],
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",
    "no-console": ["warn", { "allow": ["error", "warn"] }],
    "prefer-const": "error",
    "no-var": "error"
  }
}

// .prettierrc (NEW FILE)
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "avoid",
  "endOfLine": "lf"
}
```

### Code Style Guidelines

```typescript
// ✅ PREFER: Single responsibility functions
function calculateExpirationDate(startDate: Date, duration: number): Date {
  const expiration = new Date(startDate);
  expiration.setDate(expiration.getDate() + duration);
  return expiration;
}

function isRecordExpired(expirationDate: Date): boolean {
  return expirationDate < new Date();
}

// ❌ AVOID: Functions doing multiple unrelated things
function processRecord(record: TrespassRecord) {
  // Calculating expiration
  const expiration = new Date(record.incident_date);
  expiration.setDate(expiration.getDate() + 365);

  // Formatting display name
  const displayName = `${record.last_name}, ${record.first_name}`;

  // Sending notification
  sendEmail(record.guardian_email, 'Trespass Notice', '...');

  // Logging
  console.log('Record processed');

  return { expiration, displayName };
}

// ✅ PREFER: Early returns for guard clauses
function formatRecordName(record: TrespassRecord | null): string {
  if (!record) return 'Unknown';
  if (!record.first_name || !record.last_name) return 'Incomplete Name';

  return `${record.last_name}, ${record.first_name}`;
}

// ❌ AVOID: Nested if statements
function formatRecordName(record: TrespassRecord | null): string {
  if (record) {
    if (record.first_name && record.last_name) {
      return `${record.last_name}, ${record.first_name}`;
    } else {
      return 'Incomplete Name';
    }
  } else {
    return 'Unknown';
  }
}

// ✅ PREFER: Descriptive variable names
const activeRecordsWithExpirationInNext7Days = records.filter(
  record =>
    record.status === 'active' &&
    isWithinDays(record.expiration_date, 7)
);

// ❌ AVOID: Abbreviations and unclear names
const actRecs7d = records.filter(r => r.status === 'active' && isDiff(r.exp, 7));

// ✅ PREFER: Extracting magic numbers to constants
const TRESPASS_DURATION_DAYS = 365;
const WARNING_THRESHOLD_DAYS = 7;
const MAX_UPLOAD_SIZE_MB = 5;

// ❌ AVOID: Magic numbers inline
if (daysDiff > 365) {
  // What is 365?
}
```

---

## 6. Testing Standards (Currently Missing)

### Recommended Testing Stack
- **Unit Tests**: Vitest
- **Integration Tests**: Vitest + Testing Library
- **E2E Tests**: Playwright
- **Component Tests**: React Testing Library

### Test File Organization
```
tests/
├── unit/
│   ├── lib/
│   │   ├── utils/date.test.ts
│   │   └── validation/schemas.test.ts
│   └── hooks/
│       └── useExpiringWarnings.test.ts
│
├── integration/
│   ├── actions/
│   │   ├── records.test.ts
│   │   └── users.test.ts
│   └── api/
│       └── webhooks.test.ts
│
└── e2e/
    ├── auth.spec.ts
    ├── dashboard.spec.ts
    └── admin-panel.spec.ts
```

### Testing Patterns
```typescript
// tests/unit/lib/utils/date.test.ts
import { describe, it, expect } from 'vitest';
import { calculateExpirationDate, isRecordExpired } from '@/lib/utils/date';

describe('calculateExpirationDate', () => {
  it('should add specified days to start date', () => {
    const start = new Date('2025-01-01');
    const result = calculateExpirationDate(start, 30);

    expect(result.toISOString().split('T')[0]).toBe('2025-01-31');
  });

  it('should handle leap years correctly', () => {
    const start = new Date('2024-02-28');
    const result = calculateExpirationDate(start, 2);

    expect(result.toISOString().split('T')[0]).toBe('2024-03-01');
  });
});

// tests/integration/actions/records.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createRecord, getRecordById } from '@/app/actions/records';

describe('Record Actions', () => {
  beforeEach(async () => {
    // Setup test database state
  });

  it('should create record and return success', async () => {
    const data = {
      firstName: 'John',
      lastName: 'Doe',
      schoolId: '12345',
      // ...
    };

    const result = await createRecord(data);

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('id');
  });

  it('should reject invalid input', async () => {
    const data = {
      firstName: '',
      lastName: 'Doe',
      // Missing required fields
    };

    const result = await createRecord(data);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid input data');
  });
});
```

---

## 7. Documentation Standards

### Code Comments
```typescript
// ✅ PREFER: Comments explaining WHY, not WHAT
// Using service role here because RLS policies don't apply to system-level
// operations like auto-switching user tenants in middleware
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ❌ AVOID: Comments stating the obvious
// Create a Supabase client
const supabaseAdmin = createClient(...);

// ✅ PREFER: JSDoc for public APIs
/**
 * Calculates the expiration date for a trespass record
 *
 * @param startDate - The incident date
 * @param durationDays - Number of days until expiration (default: 365)
 * @returns The calculated expiration date
 *
 * @example
 * const expiration = calculateExpirationDate(new Date('2025-01-01'), 365);
 * // Returns: Date('2026-01-01')
 */
export function calculateExpirationDate(
  startDate: Date,
  durationDays: number = 365
): Date {
  // ...
}

// ✅ PREFER: TODO comments with issue numbers
// TODO(#123): Refactor this to use React Query for caching
// FIXME(#456): Memory leak when component unmounts during fetch

// ❌ AVOID: Vague TODOs
// TODO: Fix this later
// HACK: Temporary solution
```

### README Files
```markdown
# Component/Feature README Template

## RecordDetailDialog

### Purpose
Modal dialog for viewing and editing trespass record details. Provides full CRUD operations based on user role permissions.

### Usage
\`\`\`tsx
import { RecordDetailDialog } from '@/components/features/records/RecordDetailDialog';

function MyComponent() {
  const [selectedRecord, setSelectedRecord] = useState<TrespassRecord | null>(null);

  return (
    <RecordDetailDialog
      record={selectedRecord}
      open={Boolean(selectedRecord)}
      onOpenChange={(open) => !open && setSelectedRecord(null)}
      onSuccess={() => refetchRecords()}
    />
  );
}
\`\`\`

### Props
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| record | TrespassRecord | null | Yes | The record to display |
| open | boolean | Yes | Dialog visibility state |
| onOpenChange | (open: boolean) => void | Yes | Callback when dialog closes |
| onSuccess | () => void | No | Called after successful save/delete |

### Permissions
- **Viewer**: Read-only, no edit/delete buttons
- **Campus Admin**: Can edit/delete records
- **District Admin**: Can edit/delete all records + bulk operations

### Dependencies
- @/components/ui/dialog (shadcn)
- @/app/actions/records (server actions)
- @/contexts/AuthContext (for user role)

### Related Components
- RecordCard
- AddRecordDialog
- RecordsTable
```

---

## 8. Git Workflow & Commit Standards

### Branch Strategy
```
main              # Production (protected)
├── staging       # Pre-production testing (protected)
├── develop       # Integration branch
└── feature/*     # Feature branches
    ├── feature/bulk-select
    ├── feature/dark-mode
    └── bugfix/record-expiration
```

### Commit Message Convention
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code style (formatting, no logic change)
- `refactor`: Code restructuring (no feature change)
- `perf`: Performance improvement
- `test`: Adding/fixing tests
- `chore`: Build process, dependencies, tooling

**Examples**:
```bash
# Good
feat(records): add bulk select and delete functionality
fix(auth): resolve session timeout on demo subdomain
docs(readme): add setup instructions for local development
refactor(components): reorganize files into feature folders

# Bad
Update stuff
Fixed bug
WIP
asdf
```

### Pull Request Template
```markdown
## Description
Brief description of what this PR does

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manually tested on localhost
- [ ] Tested on staging environment

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review performed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No console.log() or debug code
- [ ] TypeScript errors resolved
- [ ] No new ESLint warnings

## Screenshots (if applicable)

## Related Issues
Closes #123
```

---

## 9. Dependency Management

### Current Dependencies Audit
```bash
# Run dependency audit
npm audit

# Update dependencies
npm update

# Check for outdated packages
npm outdated
```

### Dependency Policies

**✅ Always Update**:
- Security patches
- Next.js (stay within minor version of latest)
- React (stay current with Next.js requirements)

**⚠️ Review Before Updating**:
- Major version bumps (breaking changes)
- UI libraries (shadcn/ui, lucide-react)
- Database clients (Supabase)

**🔴 Pin Versions** (Do not auto-update):
- Authentication libraries (Clerk)
- Payment processing (if added)
- Any library with breaking changes in patch versions

### Package.json Organization
```json
{
  "dependencies": {
    // Framework
    "next": "15.5.4",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",

    // UI Libraries
    "@radix-ui/react-*": "...",
    "lucide-react": "^0.454.0",

    // Authentication
    "@clerk/nextjs": "...",

    // Database
    "@supabase/supabase-js": "...",

    // Validation
    "zod": "...",

    // Utilities
    "date-fns": "...",
    "clsx": "..."
  },
  "devDependencies": {
    // TypeScript
    "typescript": "...",
    "@types/node": "...",
    "@types/react": "...",

    // Linting
    "eslint": "...",
    "eslint-config-next": "...",

    // Testing (to be added)
    "vitest": "...",
    "@testing-library/react": "..."
  }
}
```

---

## 10. Performance & Optimization Standards

### Image Optimization
```typescript
// ✅ PREFER: Next.js Image component
import Image from 'next/image';

<Image
  src="/assets/logo.svg"
  alt="DistrictTracker"
  width={40}
  height={40}
  priority // For above-fold images
/>

// ❌ AVOID: Regular img tags
<img src="/assets/logo.svg" alt="DistrictTracker" />
```

### Code Splitting
```typescript
// ✅ PREFER: Dynamic imports for large components
import dynamic from 'next/dynamic';

const AdminAuditLog = dynamic(
  () => import('@/components/admin/AdminAuditLog'),
  {
    loading: () => <LoadingSpinner />,
    ssr: false // If component uses browser APIs
  }
);

// Use heavy components only when needed
{showAuditLog && <AdminAuditLog />}
```

### Database Query Optimization
```typescript
// ✅ PREFER: Select only needed columns
const { data } = await supabase
  .from('trespass_records')
  .select('id, first_name, last_name, status')
  .eq('tenant_id', tenantId);

// ❌ AVOID: Selecting all columns when unnecessary
const { data } = await supabase
  .from('trespass_records')
  .select('*') // Fetches all 30+ columns
  .eq('tenant_id', tenantId);

// ✅ PREFER: Pagination for large datasets
const { data, count } = await supabase
  .from('trespass_records')
  .select('*', { count: 'exact' })
  .range((page - 1) * pageSize, page * pageSize - 1);

// ✅ PREFER: Limit results even without pagination
const { data } = await supabase
  .from('trespass_records')
  .select('*')
  .limit(100); // Prevent accidentally fetching thousands of rows
```

---

## 11. Accessibility (a11y) Standards

### WCAG 2.1 Compliance Goals
- **Level AA** compliance minimum
- Keyboard navigation for all interactive elements
- Screen reader support
- Color contrast ratios (4.5:1 for text)

### Accessibility Patterns
```tsx
// ✅ PREFER: Semantic HTML
<button onClick={handleClick}>Submit</button>

// ❌ AVOID: Div/span as buttons
<div onClick={handleClick}>Submit</div>

// ✅ PREFER: ARIA labels for context
<button aria-label="Delete record for John Doe" onClick={handleDelete}>
  <TrashIcon />
</button>

// ✅ PREFER: Focus management
<dialog ref={dialogRef} onClose={handleClose}>
  <h2 ref={titleRef} tabIndex={-1}>Dialog Title</h2>
  {/* Focus title when dialog opens */}
</dialog>

// ✅ PREFER: Keyboard shortcuts with visible indicators
<kbd>Cmd</kbd> + <kbd>K</kbd> to search
```

---

## 12. Environment Variables Management

### Current State
✅ **Good**:
- `.env` files in `.gitignore`
- Environment variables documented in `.env.example`
- Vercel environment variables configured

### Recommended Structure
```bash
# .env.local (Local Development)
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...

# .env.production (Vercel Production)
# Same variables but production values
# Managed through Vercel dashboard

# .env.staging (Vercel Staging)
# Same variables but staging values
# Managed through Vercel dashboard
```

### Validation on Startup
```typescript
// lib/env.ts (NEW FILE)
import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().startsWith('pk_'),
  CLERK_SECRET_KEY: z.string().startsWith('sk_'),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
});

export const env = envSchema.parse(process.env);
```

---

## 13. Implementation Timeline

### Phase 1: Foundation (Week 1-2)
- [ ] Set up Prettier and update ESLint config
- [ ] Reorganize file structure (move components to feature folders)
- [ ] Add testing framework (Vitest + Testing Library)
- [ ] Create environment variable validation
- [ ] Document naming conventions

**Effort**: 12-16 hours

### Phase 2: Code Quality (Week 2-3)
- [ ] Remove all `any` types, add proper TypeScript types
- [ ] Implement error message sanitization
- [ ] Add missing audit logging
- [ ] Create utility functions for common patterns
- [ ] Extract constants from magic numbers

**Effort**: 16-20 hours

### Phase 3: Testing & Documentation (Week 3-4)
- [ ] Write unit tests for utilities
- [ ] Write integration tests for server actions
- [ ] Add README files for major features
- [ ] Create component documentation
- [ ] Document API endpoints

**Effort**: 20-24 hours

### Phase 4: Optimization (Week 4-5)
- [ ] Implement code splitting for large components
- [ ] Optimize database queries (pagination, column selection)
- [ ] Add image optimization
- [ ] Performance audit with Lighthouse
- [ ] Accessibility audit with axe DevTools

**Effort**: 12-16 hours

---

## 14. Maintenance Plan

### Daily
- Run `npm run typecheck` before commits
- Review console for warnings/errors
- Check Vercel deployment logs

### Weekly
- Review and merge dependabot PRs
- Run `npm audit` for security vulnerabilities
- Review and close/update GitHub issues

### Monthly
- Update dependencies (minor versions)
- Run Lighthouse performance audit
- Review and update documentation
- Security audit review

### Quarterly
- Review and refactor old code
- Update major dependencies (with testing)
- Third-party security audit
- User feedback review and prioritization

---

## 15. Developer Onboarding Checklist

### For New Developers
```markdown
## Getting Started

1. **Environment Setup**
   - [ ] Clone repository
   - [ ] Copy .env.example to .env.local
   - [ ] Fill in environment variables
   - [ ] Run `npm install`
   - [ ] Run `npm run dev`

2. **Read Documentation**
   - [ ] README.md (project overview)
   - [ ] CLAUDE.md (AI assistant guidance)
   - [ ] docs/planning/* (architecture docs)
   - [ ] This file (CODE_CLEANUP_AND_STANDARDS_PLAN.md)

3. **Understand Tech Stack**
   - [ ] Next.js 15 App Router
   - [ ] TypeScript
   - [ ] Supabase (PostgreSQL)
   - [ ] Clerk (Authentication)
   - [ ] Tailwind CSS + shadcn/ui

4. **Run Tests**
   - [ ] `npm run test` (when implemented)
   - [ ] `npm run typecheck`
   - [ ] `npm run lint`

5. **Make First Commit**
   - [ ] Fix a "good first issue"
   - [ ] Follow commit message conventions
   - [ ] Create PR using template
   - [ ] Address code review feedback

Estimated Time: 4-8 hours
```

---

## 16. Success Metrics

### Code Quality Metrics
- TypeScript strict mode: 100% (no `any` types)
- ESLint warnings: 0
- Test coverage: >80% (when tests implemented)
- Bundle size: <500KB (First Load JS)
- Lighthouse score: >90 (Performance, Accessibility, Best Practices)

### Developer Experience Metrics
- Time to first contribution: <8 hours
- Build time: <2 minutes
- Hot reload time: <1 second
- Type checking time: <10 seconds

### Maintenance Metrics
- Dependency freshness: No packages >6 months old
- Security vulnerabilities: 0 high/critical
- Documentation coverage: 100% of public APIs
- Code review turnaround: <24 hours

---

**Status**: 📋 PLANNING DOCUMENT
**No code changes have been made yet**
**Next Step**: Review with team and prioritize implementation phases

