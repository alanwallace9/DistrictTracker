# Project Instructions for Claude

## External Service IDs

**IMPORTANT: Before using MCP tools, check `.env.local` or `.env` for correct project IDs:**

- **Supabase**: Extract project ID from `NEXT_PUBLIC_SUPABASE_URL` (the subdomain before `.supabase.co`)
- **Vercel**: Check `vercel.json` or use `mcp__vercel__list_projects`

**Never hardcode or assume project IDs - always verify from environment files first.**

## Large Document Handling

**CRITICAL: Do NOT read these files in full - they are split into parts:**

| Instead of reading... | Load this instead |
|----------------------|-------------------|
| `docs/epics.md` | `docs/epics-part1.md` OR `docs/epics-part2.md` |
| `docs/architecture.md` | `docs/architecture-part1.md` OR `docs/architecture-part2.md` |

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

**Epic 1a: Core Schema & Security** - COMPLETE
- All stories (1-0 through 1-4): `done`

**Epic 1b: Configuration UI** - COMPLETE
- All stories (1-5 through 1-10): `done`
- Key bugs resolved: composite PK migration, tenant column naming

**Epic 2: Placement Management** - IN PROGRESS
- Status: `contexted`
- Story 2-1 (Student Search List View): `done`
- Stories 2-2 through 2-13: `backlog`
- 13 stories, 34 points
- FRs: FR9-FR26, FR73-FR77

**Tech Specs Available:**
- `docs/sprint-artifacts/tech-spec-epic-1a.md` (completed)
- `docs/sprint-artifacts/tech-spec-epic-1b.md` (completed)

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
For master_admin tenant switching, always use:
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
2. {story-key}.md → read story details
3. {story-key}.context.xml → load if exists (skip step 4 if it does)
4. tech-spec-epic-{N}.md → load only if needed
5. Implement tasks sequentially
6. Update checkboxes as you go
7. Mark story done in sprint-status.yaml when complete
```
