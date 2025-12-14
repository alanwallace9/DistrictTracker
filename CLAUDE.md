# Project Instructions for Claude

---
## ⚠️ MANDATORY PRE-FLIGHT CHECKLIST

**STOP! Before ANY task, complete this checklist:**

### 1. Project IDs (DO THIS FIRST)
```bash
# Get Supabase project ID from .env.local
grep NEXT_PUBLIC_SUPABASE_URL .env.local
# Extract subdomain: gnbxdjiibwjaurybohak (example)
```
**NEVER hardcode project IDs. ALWAYS read from .env.local first.**

### 2. Story Development Workflow (FOLLOW THIS EXACT ORDER)

| Step | Action | Wait for User? |
|------|--------|----------------|
| 1 | **Tech Spec** - Write technical specification | No |
| 2 | **Story File** - Create story markdown | No |
| 3 | **Executive Plan** - Present summary for review | **YES - WAIT** |
| 4 | **Approval/Updates** - Get user feedback, iterate | **YES - WAIT** |
| 5 | **Context File** - Create .context.xml if needed | No |
| 6 | **Implement** - Write the code | No |
| 7 | **Test with Playwright** - Verify UI works | No |
| 8 | **Confirm** - Show user the results | **YES - WAIT** |
| 9 | **Ready to Commit?** - Ask user before committing | **YES - WAIT** |
| 10 | **Commit** - Use `/bmad:bmm:agents:tech-writer`, update changelog | No |

**DO NOT skip steps. DO NOT proceed past "WAIT" steps without user approval.**

### 3. Commit Workflow (WAIT FOR USER APPROVAL)
After story completion:
1. **ASK USER**: "Story complete - ready to commit?" - **YES - WAIT**
2. Invoke `/bmad:bmm:agents:tech-writer` to draft commit message AND changelog entry
3. Update `docs/sprint-artifacts/daep/epic-{N}-changelog.md` with new entry
4. Update `sprint-status.yaml` to mark story as `done`
5. Bump version in `package.json`
6. Stage, commit, and push to staging branch

**DO NOT commit without user approval. The tech-writer agent ensures consistent formatting.**

---

## CRITICAL: Follow Existing Patterns First

**BEFORE writing ANY new code, you MUST:**

1. **Check existing patterns in the codebase** - Read similar files in the same module to understand established patterns
2. **Never create custom helpers/abstractions** that duplicate what RLS or existing utilities already handle
3. **Match the security model** - This is a multi-tenant, multi-module codebase:
   - **RLS (Row-Level Security)** handles access control at the database level
   - **Server actions** use the simple pattern: `createServerClient()`, `getTenantId()`, `currentUser()`
   - Do NOT create redundant server-side auth helpers that duplicate RLS
4. **New tables MUST have role-based RLS** matching existing tables (e.g., `daep_placements`)
   - Never use tenant-only RLS for sensitive data
   - Check existing RLS policies with: `SELECT * FROM pg_policies WHERE tablename = 'daep_placements'`

5. **RLS policies MUST use helper functions** (see `docs/sprint-artifacts/daep/dec-12-rls-update.md`):
   ```sql
   -- CORRECT: Use get_my_tenant_id() helper which looks up tenant from user_profiles
   USING (tenant_id = get_my_tenant_id())

   -- WRONG: Direct JWT access or Supabase auth patterns
   USING (tenant_id = (auth.jwt() ->> 'sub'))  -- This is user ID, not tenant ID!
   USING (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id'))  -- Supabase auth pattern
   ```
   **Reference tables with correct RLS:** `daep_placements`, `daep_attendance`, `daep_daily_points`

**Example - WRONG approach:**
```typescript
// DON'T create custom auth helpers
async function checkRolloverViewAuth() { ... }  // WRONG
const { userId, role } = await checkRolloverViewAuth();  // WRONG
```

**Example - CORRECT approach:**
```typescript
// DO follow existing pattern
const supabase = await createServerClient();
const tenantId = await getTenantId();
const user = await currentUser();
// RLS handles role-based access at DB level
```

**If you're unsure about a pattern:**
1. Read 2-3 existing files in the same module
2. Ask the user before creating new patterns
3. Never assume - verify first

---

## Debugging Approach: Least Destructive First

**When encountering bugs, check in this order BEFORE hitting database/MCP tools repeatedly:**

1. **Field/column names** - Typos in SELECT statements, wrong column names (e.g., `photo_url` vs `cached_image_url`)
2. **Data types** - String vs number mismatches, null handling
3. **Query structure** - Missing JOINs, wrong table aliases
4. **Application logic** - Fallback chains, conditional rendering
5. **THEN** database queries to verify data exists

**Example - WRONG approach:**
```bash
# Running 8 Supabase queries trying different RLS policies
mcp__supabase__execute_sql "SELECT ..." # Query 1
mcp__supabase__execute_sql "SELECT ..." # Query 2
# ... repeatedly hitting the database
```

**Example - CORRECT approach:**
```typescript
// First: Check if the column name is correct
// The error "column trespass_records.photo_url does not exist"
// tells you the column name is wrong - fix it first!
.select('school_id, first_name, last_name, cached_image_url') // Not photo_url
```

**Rule:** One well-placed console.log or reading the error message carefully often solves it faster than multiple database queries.

---

## Performance Best Practices (Bundle Size)

**CRITICAL: Large libraries must use dynamic imports to avoid bloating initial page load.**

### Heavy Libraries - ALWAYS Dynamic Import

These libraries are 7-30MB+ and should NEVER be statically imported:

| Library | Size | Use Case |
|---------|------|----------|
| `xlsx` | ~7MB | Excel export |
| `jspdf` | ~29MB | PDF generation |
| `jspdf-autotable` | ~1MB | PDF tables |

**WRONG - Static import (loads on page load):**
```typescript
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const exportToExcel = () => {
  const ws = XLSX.utils.json_to_sheet(data);
  // ...
};
```

**CORRECT - Dynamic import (loads on demand):**
```typescript
// No static imports at top of file

const exportToExcel = async () => {
  // Dynamic import - only loads when user clicks export
  const XLSX = await import('xlsx');

  const ws = XLSX.utils.json_to_sheet(data);
  // ...
};

const exportToPDF = async () => {
  // Dynamic imports for PDF generation
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF('landscape');
  autoTable(doc, { /* ... */ });
  // ...
};
```

### Bundle Analysis

Run bundle analysis to identify large dependencies:
```bash
npm run build:analyze
```

This opens an interactive visualization showing:
- Which packages are bundled into which pages
- The size contribution of each dependency
- Opportunities for code splitting

### Performance Checklist for New Features

Before implementing export/report features:

1. **Check if library is already used** - Search for existing patterns
2. **Use dynamic imports** for any library > 100KB
3. **Verify bundle size** after implementation with `npm run build`
4. **Watch for First Load JS** - Keep pages under 200KB when possible

### Current Bundle Targets

| Page Type | Target First Load JS |
|-----------|---------------------|
| Dashboard pages | < 200KB |
| Settings pages | < 150KB |
| Admin pages | < 300KB (export features allowed) |

---

## External Service IDs

**IMPORTANT: Before using MCP tools, check `.env.local` or `.env` for correct project IDs:**

- **Supabase**: Extract project ID from `NEXT_PUBLIC_SUPABASE_URL` (the subdomain before `.supabase.co`)
- **Vercel**: Check `vercel.json` or use `mcp__vercel__list_projects`

**Never hardcode or assume project IDs - always verify from environment files first.**

---

## Supabase MCP Token Optimization

**CRITICAL: `mcp__supabase__list_tables` returns ~22k tokens. AVOID using it.**

### Use Targeted SQL Instead

| Need | Use This | Tokens |
|------|----------|--------|
| All table names | `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'` | ~100 |
| DAEP tables only | `SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'daep_%'` | ~50 |
| Specific table schema | `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'daep_placements'` | ~200 |
| Check if table exists | `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'foo')` | ~10 |

### Alternative: Read Existing Code

Instead of querying schema, learn from existing patterns:
1. **Read server actions** - `app/actions/daep/*.ts` shows table/column usage
2. **Read data-models.md** - `docs/reference/data-models.md` documents schema
3. **Use `list_migrations`** - Shows table creation without full column details

### When `list_tables` IS Acceptable

Only use `list_tables` when you need:
- Complete schema dump for documentation
- User explicitly requests full table listing
- Initial project exploration (first conversation only)

**Default approach:** Use `execute_sql` with targeted information_schema queries.

## Playwright MCP for UI/UX Verification

**Playwright MCP is active.** Use it to view pages during UI/UX development:

- **When to use:** Any story involving visible UI changes
- **How:** Use `mcp__playwright__browser_navigate` to open pages, `mcp__playwright__browser_snapshot` to capture state
- **Purpose:** Verify UI renders correctly, check responsive behavior, validate user flows
- **Workflow:** Navigate → Snapshot → Verify → Iterate

This provides shared visibility between Claude and the user during development.

## Pre-Story Research (Required)

**BEFORE drafting or implementing ANY story, check these sources for context:**

1. **Session documents** (`docs/sessions/`)
   - `brainstorming-*.md` - Product philosophy, workflow decisions, "seamless UX" principles
   - `ux-*.md` - User journeys, experience patterns, UI decisions
   - `product-brief-*.md` - Core product vision and constraints

2. **Previous conversation context** about this feature area
   - What did we decide in earlier discussions?
   - What's the intended user experience?

3. **Design philosophy check**: Does this implementation support "How did they ever do their job without this?"
   - Minimize manual data entry
   - Fit natural workflow of the day
   - Free up teacher time for students

**Reference key decisions in the story's Dev Notes section.**

---

## Tech Spec & Story Workflow (Required)

**When asked to create a tech spec or story, follow this workflow:**

### Step 1: Write Tech Spec & Story
Create the technical specification and story file first. These document:
- Acceptance criteria, tasks, and subtasks
- Database changes, server actions, UI components
- Edge cases and out-of-scope items

### Step 2: Present Executive Plan for Review
**AFTER writing the tech spec and story**, present an executive plan summary for user feedback:

```
## Executive Plan: Story X-Y - [Title]

### What We're Building
[2-3 sentence summary of what we're building and why it matters to users]

### UI/UX Placement
- Where new components will appear in the UI
- How they integrate with existing pages
- Visual mockup description if helpful

### Key Deliverables
| Component | Description |
|-----------|-------------|
| [Component 1] | [What it does] |
| [Component 2] | [What it does] |

### Order of Operations
1. [First task] - why this order
2. [Second task] - dependencies on #1
...

### Database Changes
- [Table/column changes if any]

### Key Decisions (Need Your Input)
- [Decision 1]: [Options and recommendation]
- [Decision 2]: [Options and recommendation]

### Scope Boundaries
| In Scope | Out of Scope |
|----------|--------------|
| [Item] | [Item] |

### Effort Estimate
- Story Points: X
- Tasks: N
- New Files: N
- Modified Files: N

### Recommendations (Quick Wins)
- [Recommendation] - [Why it helps] - [Effort: Low/Medium]

### Questions for You
- [Any clarifying questions about requirements or preferences]
```

### Step 3: Get Approval Before Implementation
Wait for user feedback on the executive plan. User may:
- Approve as-is
- Request changes to placement, scope, or approach
- Add requirements or clarifications

**Only proceed to implementation after user approves the plan.**

## Documentation Folder Structure

```
docs/
├── index.md                    # Master index (auto-generated)
├── todo.md                     # Quick task tracking
├── reference/                  # Stable reference docs
│   ├── architecture*.md        # System architecture
│   ├── epics*.md              # Epic definitions
│   ├── prd.md                 # Product requirements
│   ├── data-models.md         # Database schemas
│   └── api-contracts.md       # API specifications
├── sprint-artifacts/           # Active development
│   ├── sprint-status.yaml     # Sprint tracking (source of truth)
│   ├── tech-spec-epic-*.md    # Technical specifications
│   ├── {story-key}.md         # Story files
│   ├── bug-*.md               # Bug reports
│   └── *-retro-*.md           # Retrospectives
├── workflows/                  # Process documentation
│   ├── user-auth-workflow.md  # Auth/authorization flow
│   ├── development-guide.md   # Dev setup & patterns
│   └── GetStarted.md          # Onboarding guide
└── sessions/                   # Research & planning
    ├── brainstorming-*.md     # Brainstorming sessions
    ├── research-*.md          # Market/technical research
    ├── product-brief-*.md     # Product briefs
    └── ux-*.md/html           # UX explorations
```

**Where to put new docs:**
- Bug reports → `sprint-artifacts/bug-{name}.md`
- Tech specs → `sprint-artifacts/tech-spec-epic-{N}.md`
- Story files → `sprint-artifacts/{story-key}.md`
- Process docs → `workflows/`
- Research/brainstorming → `sessions/`

## Reference Documentation Paths

**All stable reference docs are in `docs/reference/`:**

| Document | Path | Description |
|----------|------|-------------|
| PRD | `docs/reference/prd.md` | Product Requirements Document |
| Architecture | `docs/reference/architecture-part1.md`, `architecture-part2.md` | System architecture (sharded) |
| Epics | `docs/reference/epics-part1.md`, `epics-part2.md` | Epic definitions (sharded) |
| Data Models | `docs/reference/data-models.md` | Database schemas |
| API Contracts | `docs/reference/api-contracts.md` | REST API + Server Actions |
| UX Design | `docs/sessions/ux-design-specification.md` | Visual design system |

## Large Document Handling

**CRITICAL: Do NOT read these files in full - they are split into parts:**

| Instead of reading... | Load this instead |
|----------------------|-------------------|
| `docs/reference/epics.md` | `docs/reference/epics-part1.md` OR `docs/reference/epics-part2.md` |
| `docs/reference/architecture.md` | `docs/reference/architecture-part1.md` OR `docs/reference/architecture-part2.md` |

**Epic Part Reference:**
- **Part 1**: Overview, FR Inventory, Epics 1a, 1b, 2
- **Part 2**: Epics 3, 4, 5, 6, 7 and FR Coverage Matrix

**Architecture Part Reference:**
- **Part 1**: Overview, Tech Stack, Database Schema, Security
- **Part 2**: API Design, UI Components, Integration Patterns

## Context Window Optimization

### Use Pre-Built Context Files
When implementing stories, **ALWAYS check for a context file first**:
```
docs/sprint-artifacts/{story-key}.context.xml
```
Context files contain pre-assembled relevant docs, code snippets, and dependencies. Load the context file instead of multiple source documents.

### Sprint Status is Source of Truth
```
docs/sprint-artifacts/sprint-status.yaml
```
- Check this FIRST to find the next story to work on
- Don't search through epic files to find what's next
- Status values: `drafted`, `ready-for-dev`, `in-progress`, `review`, `done`

### Story Files Are Self-Contained
Each story file in `docs/sprint-artifacts/{story-key}.md` contains:
- All acceptance criteria
- Task breakdown with subtasks
- Dev notes with implementation guidance
- Referenced source documents

**Don't re-read PRD/Architecture/Epics if the story file already has the info you need.**

### Tech Specs by Epic
Tech specs for specific epics are pre-built:
```
docs/sprint-artifacts/tech-spec-epic-{N}.md
```
Load the specific epic's tech spec, not the full architecture.

## Workflow Efficiency

### Before Starting Any Story
1. Read `sprint-status.yaml` to find next `ready-for-dev` story
2. Read the story file (`{story-key}.md`)
3. Check for context file (`{story-key}.context.xml`) - load if exists
4. Only load additional docs if story file references them AND info is missing

### During Implementation
- Don't stop to summarize progress mid-task
- Don't ask for confirmation on obvious next steps
- Complete all subtasks in a task before moving to next task
- Update story file checkboxes as you complete items

### Avoid Re-Reading
- If you just read a file, don't read it again in the same conversation
- If context file was loaded, don't separately load PRD/Architecture/Epics
- Trust the story file's task breakdown - it was validated during creation

## Current Project State

**Current Version:** `0.3.3`

**Epic 1a: Core Schema & Security** - COMPLETE
- All stories (1-0 through 1-4): `done`

**Epic 1b: Configuration UI** - COMPLETE
- All stories (1-5 through 1-10): `done`
- Key bugs resolved: composite PK migration, tenant column naming

**Epic 2: Placement Management** - COMPLETE (v0.3.0)
- All stories (2-1 through 2-13): `done`
- 13 stories, 34 points total
- FRs: FR9-FR26, FR73-FR77
- Backlog item: Story 2-8b (UX improvement) - `drafted`

**Epic 3: Daily Operations** - IN PROGRESS (v0.3.3)
- Story 3-0: Room Groups - `done`
- Story 3-1: Room Roster View - `done`
- Story 3-2: Point Entry Grid - `done`
- Stories 3-3 through 3-12: `backlog`
- 12 stories, 29 points
- FRs: FR27-FR44

**Tech Specs Available:**
- `docs/sprint-artifacts/daep/tech-spec-epic-3-batch-1.md` (Story 3-1: Room Roster)
- `docs/sprint-artifacts/daep/tech-spec-epic-2-part1.md` (Stories 2.1-2.6)
- `docs/sprint-artifacts/daep/tech-spec-epic-2-part2.md` (Stories 2.7-2.13)
- `docs/sprint-artifacts/daep/tech-spec-stories-2-2-2-3-2-10.md` (Profile batch)
- `docs/sprint-artifacts/daep/tech-spec-story-2-4.md` (Placement creation)
- `docs/sprint-artifacts/daep/tech-spec-story-2-5.md` (Room assignment)
- `docs/sprint-artifacts/daep/tech-spec-stories-2-6-2-7.md` (Lifecycle + days calc)

## Key Patterns Learned (Epic 1b)

### Composite Primary Keys for Multi-Tenant
When business identifiers (like PEIMS campus codes) should be unique per tenant but not globally:
```sql
-- Use composite PK
PRIMARY KEY (tenant_id, id)

-- FKs must also be composite
FOREIGN KEY (tenant_id, campus_id) REFERENCES campuses(tenant_id, id)
```
See: `bug-campus-tenant-isolation.md`

### active_tenant_id Pattern
For super_admin tenant switching, always use:
```typescript
const effectiveTenantId = profile.active_tenant_id || profile.tenant_id;
```

## File Patterns to Avoid Loading

These files are large and should only be loaded via their sharded parts:
- `docs/epics.md` (~1200 lines, 26k tokens)
- `docs/architecture.md` (similarly large)
- Any `*-combined*.md` files

## Quick Reference: Story Development Flow

```
1. sprint-status.yaml → find story key
2. docs/sessions/ → check brainstorming/UX docs for product philosophy
3. {story-key}.md → read story details
4. {story-key}.context.xml → load if exists (skip step 5 if it does)
5. tech-spec-epic-{N}.md → load only if needed
6. Implement tasks sequentially
7. Update checkboxes as you go
8. Mark story done in sprint-status.yaml when complete
9. Suggest commit when story is complete (see Commit Conventions below)
```

## Commit & Changelog Conventions

### ⚠️ MANDATORY: Ask Before Committing

**STOP!** After completing a story, you MUST ask: **"Story complete - ready to commit?"**

**DO NOT commit without explicit user approval.** Wait for user to say yes.

### Commit Workflow

When user accepts the commit prompt, follow this workflow:

1. **Use Tech Writer Agent** - Invoke `/bmad:bmm:agents:tech-writer` to draft:
   - Commit message with conventional format
   - Changelog entry content for feedback page
   - Appropriate version bump recommendation

2. **Update sprint-status.yaml** - Mark story as `done`

3. **Update Epic Changelog** - Add entry to `docs/sprint-artifacts/daep/epic-{N}-changelog.md`:
   - Add version section with Title, Description, Key Features, FRs
   - Update Summary Table
   - Update Remaining Stories section
   - Update story count in header

4. **Update package.json** - Bump version according to:
   - Patch (`0.x.Y`) for stories/fixes
   - Minor (`0.X.0`) for epic completion

5. **Stage and Commit** - Use the drafted message from tech-writer:
   ```bash
   git add -A
   git commit -m "$(cat <<'EOF'
   [drafted commit message from tech-writer]
   EOF
   )"
   ```

6. **Push to staging** - Always push to staging branch:
   ```bash
   git push origin staging
   ```

7. **Remind about Changelog** - Tell user they can batch-add feedback entries when Epic is complete

### Versioning (Semantic Versioning)

| Version | When to Use |
|---------|-------------|
| `0.x.0` | Epic complete (major feature set) |
| `0.x.y` | Individual story, bug fix, or patch |
| `1.0.0` | MVP launch (production-ready) |

**Current mapping:**
- Epic 1a → 0.1.0
- Epic 1b → 0.2.0
- Epic 2 → 0.3.0
- Epic 3 → 0.4.0 (and so on)

### Commit Message Format

Use **conventional commits** with this structure:

```
feat(module): Short description (vX.Y.Z)

Customer-facing summary of what's new.

## What's New
- Feature 1
- Feature 2

## Stories Completed
- X-Y: Story title

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

**Commit types:**
- `feat(daep):` - New feature
- `fix(daep):` - Bug fix
- `chore(db):` - Database/infrastructure
- `docs:` - Documentation only

### When to Commit

| Scenario | Version Bump | Commit Type |
|----------|--------------|-------------|
| Single story complete | Patch (0.3.1) | `feat` or `fix` |
| Multiple stories batched | Patch (0.3.1) | `feat` |
| Full epic complete | Minor (0.4.0) | `feat` |
| Bug fix only | Patch (0.3.1) | `fix` |

### Changelog Integration

The `/feedback/changelog` page pulls from completed feedback items. After committing:

1. Create feedback item in admin panel
2. Set category (DAEP Management, Trespass Tracker, etc.)
3. Set status: Completed
4. Add release notes to `admin_response` field

**Full process doc:** `docs/workflows/release-process.md`
