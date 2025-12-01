# Release & Changelog Process

**Purpose:** Standardize how commits, version bumps, and changelog entries are handled for DistrictTracker.

---

## Overview

This project uses a two-part release process:

1. **Git Commits** - Technical record with conventional commit format
2. **Changelog Entries** - Customer-facing release notes in the feedback system

Both should be created after completing stories or fixing bugs.

---

## Versioning Strategy

We use **Semantic Versioning** (`MAJOR.MINOR.PATCH`) during pre-release:

| Version | Meaning | Example |
|---------|---------|---------|
| `0.x.0` | Epic/major feature set complete | Epic 2 done → 0.3.0 |
| `0.x.y` | Story, bug fix, or small change | Story 3-1 done → 0.4.1 |
| `1.0.0` | MVP complete, production-ready | All 7 epics done |

### Epic-to-Version Mapping

| Epic | Version | Status |
|------|---------|--------|
| Epic 1a: Core Schema | 0.1.0 | Complete |
| Epic 1b: Configuration UI | 0.2.0 | Complete |
| Epic 2: Placement Management | 0.3.0 | Complete |
| Epic 3: Daily Operations | 0.4.0 | Next |
| Epic 4: Behavior Documentation | 0.5.0 | Backlog |
| Epic 5: CSV Reconciliation | 0.6.0 | Backlog |
| Epic 6: Dashboard & Reporting | 0.7.0 | Backlog |
| Epic 7: Notifications | 0.8.0 | Backlog |
| MVP Launch | 1.0.0 | Target |

### When to Bump What

| Scenario | Version Change | Example |
|----------|----------------|---------|
| Single story complete | Patch +1 | 0.3.0 → 0.3.1 |
| Multiple stories in one session | Patch +1 | 0.3.0 → 0.3.1 |
| Full epic complete | Minor +1 | 0.3.x → 0.4.0 |
| Bug fix only | Patch +1 | 0.3.1 → 0.3.2 |
| Breaking change (rare) | Major +1 | 0.x.x → 1.0.0 |

---

## Git Commit Process

### Step 1: Update Version in package.json

```json
{
  "version": "0.3.1"  // Bump appropriately
}
```

### Step 2: Stage All Changes

```bash
git add -A
```

### Step 3: Create Commit with Conventional Format

```bash
git commit -m "$(cat <<'EOF'
feat(daep): Short description (v0.3.1)

Customer-facing summary paragraph.

## What's New
- Feature or fix 1
- Feature or fix 2
- Feature or fix 3

## Stories Completed
- 3-1: Story title here

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

### Commit Type Reference

| Type | Use For | Module Examples |
|------|---------|-----------------|
| `feat(daep):` | New DAEP features | Placements, students, rooms |
| `feat(trespass):` | New TrespassTracker features | Records, alerts |
| `fix(daep):` | DAEP bug fixes | |
| `fix(trespass):` | TrespassTracker bug fixes | |
| `chore(db):` | Database migrations, RLS | |
| `chore(deps):` | Dependency updates | |
| `docs:` | Documentation only | |
| `refactor(module):` | Code cleanup, no new features | |

### Step 4: Push to Remote

```bash
git push
```

---

## Changelog Entry Process

The `/feedback/changelog` page displays completed feedback items. After committing code changes, create a changelog entry.

### Step 1: Go to Admin Panel

Navigate to: `/admin/feedback`

### Step 2: Create New Feedback Item

| Field | Value |
|-------|-------|
| Title | Short feature name (e.g., "DAEP: Placement Status Tracking") |
| Type | Feature Request or Bug Report |
| Category | DAEP Management, Trespass Tracker, or General |
| Status | **Completed** |

### Step 3: Add Release Notes

In the **Admin Response** field, write customer-friendly release notes:

```
What's New:

- Track placements through their full lifecycle (Pending → Active → Transition → Complete)
- Schedule transition meetings with home campus
- Handle no-shows and early terminations
- Manage year-end rollover students

This update completes the placement workflow, making it easier to track student progress through DAEP.
```

**Writing Tips:**
- Use plain language (no technical jargon)
- Focus on what users can DO, not how it works
- Start bullet points with action verbs
- Keep it concise (3-6 bullets is ideal)

### Step 4: Save

The item will appear on `/feedback/changelog` immediately.

---

## Changelog Entry Examples

### Epic-Level Entry (Major Release)

**Title:** DAEP Module: Complete Placement Management System
**Category:** DAEP Management
**Status:** Completed

**Admin Response:**
```
What's New in DAEP Management (v0.3.0)

Student Management:
- Search and filter students by name, ID, status, or room
- View detailed profiles with demographics and contact info
- See placement history and TrespassTracker records together

Placement Workflow:
- Create placements with offense codes and automatic day calculation
- Assign rooms with student separation enforcement
- Track full lifecycle: Pending → Active → Transition → Complete

Day Tracking:
- Days remaining calculated from actual school days
- Transition meetings and first-day-back confirmation
- Year-end rollover management

This release delivers the complete placement management system for DAEP administrators.
```

### Story-Level Entry (Minor Release)

**Title:** DAEP: Room Assignment with Separation Logic
**Category:** DAEP Management
**Status:** Completed

**Admin Response:**
```
You can now assign students to DAEP rooms with automatic separation enforcement.

- See room capacity and current occupancy at a glance
- System prevents assigning conflicting students to the same building section
- Add separation flags between students with expiration dates
```

### Bug Fix Entry

**Title:** Fixed: Room dropdown not loading on placement form
**Category:** DAEP Management
**Status:** Completed

**Admin Response:**
```
Fixed an issue where the room selection dropdown wouldn't load when creating a new placement. Room assignment now works correctly.
```

---

## Agent Workflow Integration

### For Dev Agent

After completing a story:

1. Check `sprint-status.yaml` - mark story as `done`
2. Prompt user: **"Story complete - ready to commit?"**
3. If yes:
   - Bump version in `package.json`
   - Create commit with conventional format
   - Push to remote
   - Remind user to create changelog entry

### For Tech Writer Agent (Paige)

When asked to help with changelog:

1. Review completed stories/work
2. Draft customer-friendly release notes
3. Suggest appropriate version bump
4. Either write the commit OR hand off to Dev agent

---

## Quick Checklist

After completing work:

- [ ] Version bumped in `package.json`
- [ ] `sprint-status.yaml` updated (story marked `done`)
- [ ] Git commit with conventional format
- [ ] Pushed to remote
- [ ] Changelog entry created in admin panel (for user-facing changes)

---

## Reference Files

| File | Purpose |
|------|---------|
| `package.json` | Current version number |
| `CLAUDE.md` | Quick reference for agents |
| `docs/sprint-artifacts/sprint-status.yaml` | Story status tracking |
| `/admin/feedback` | Create changelog entries |
| `/feedback/changelog` | Public changelog page |

---

_Last Updated: 2025-11-30_
_Version: 0.3.0_
