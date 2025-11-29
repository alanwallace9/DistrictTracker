# Documentation Workflow

**Purpose:** Systematic process for documenting changes as you develop, then converting them to customer-facing communication.

**Last Updated:** 2025-11-29

---

## Overview

This workflow integrates into your development process:

```
Tech Spec → Story → Code → Review → Git Commit → Documentation → Done
                                         ↑
                                    YOU ARE HERE
```

There are two documentation outputs:
1. **Internal (Technical)** — For acquisition, debugging, decision history
2. **External (Customer-Facing)** — For feedback page changelog, roadmap updates

---

## Quick Reference: When to Do What

| After... | Do This | Agent to Call |
|----------|---------|---------------|
| Story complete + tests pass | Git commit with conventional message | Dev agent or manual |
| Epic complete | Create release notes draft | Tech Writer (Paige) |
| Release ready | Bump version + update changelog | Manual (npm command) |
| Version bumped | Update feedback page | Manual (admin panel) |

---

## Step-by-Step Process

### Step 1: Conventional Commits (During Development)

Every commit message should follow this format:

```
type(scope): short description

[optional body with more details]
```

**Types:**
| Type | Use When | Example |
|------|----------|---------|
| `feat` | New feature | `feat(daep): Add room assignment dialog` |
| `fix` | Bug fix | `fix(placement): Correct days remaining calculation` |
| `docs` | Documentation only | `docs: Update README with setup instructions` |
| `style` | Formatting, no code change | `style: Fix linting errors` |
| `refactor` | Code change that doesn't fix bug or add feature | `refactor(auth): Simplify role checking logic` |
| `test` | Adding or updating tests | `test(placements): Add unit tests for point calculation` |
| `chore` | Build process, dependencies | `chore: Update Next.js to 14.2` |

**Scope** (optional): The module or area affected (daep, trespass, admin, auth, etc.)

**Example commit flow:**
```bash
git add .
git commit -m "feat(daep): Add student profile demographics card

- Display student photo, name, grade, home campus
- Show placement status badge
- Link to TrespassTracker history

Story: 2-2
FR: FR15, FR16"
```

---

### Step 2: After Story Complete — Create Release Notes Entry

**When:** After each story is marked `done` in sprint-status.yaml

**What to do:**
1. Open or create: `docs/releases/draft-next.md`
2. Add an entry for the completed story

**Agent Call:**
> "Hey Paige, I just finished story 2-2. Please add an entry to `docs/releases/draft-next.md` with both technical and customer-friendly descriptions."

**Entry Format:**
```markdown
### Story 2-2: Student Profile Header

**Technical Notes:**
- Created StudentProfileHeader component at components/daep/StudentProfileHeader.tsx
- Integrated with TrespassTracker via shared student lookup
- Uses existing profile data from Clerk + database merge
- FR: FR15, FR16

**Customer Language:**
Student profiles now show a clean header with photo, name, and current DAEP status at a glance. Staff can quickly see if a student has previous trespass history.

**Screenshot:** (add if UI change)
```

---

### Step 3: After Epic Complete — Compile Release Notes

**When:** All stories in an epic are `done`

**What to do:**
1. Review all entries in `docs/releases/draft-next.md`
2. Determine version type (see below)
3. Create versioned release file

**Version Types:**
| Type | When to Use | Version Bump |
|------|-------------|--------------|
| **Major (X.0.0)** | Breaking changes, major redesign, new module | 1.8.0 → 2.0.0 |
| **Minor (0.X.0)** | New features, enhancements, non-breaking | 1.8.0 → 1.9.0 |
| **Patch (0.0.X)** | Bug fixes, small tweaks, security patches | 1.8.0 → 1.8.1 |

**Agent Call:**
> "Hey Paige, Epic 2 is complete. Please compile `docs/releases/draft-next.md` into a release notes document for version 1.9.0 (minor release). Create both internal and customer-facing versions."

**Output Files:**
- `docs/releases/v1.9.0-internal.md` — Full technical details
- `docs/releases/v1.9.0-changelog.md` — Customer-friendly version

---

### Step 4: Bump Version Number

**When:** Release notes are ready

**What to do:** Run the version bump command

```bash
# For patch release (bug fixes)
npm version patch

# For minor release (new features)
npm version minor

# For major release (breaking changes)
npm version major
```

This automatically:
- Updates `package.json` version
- Creates a git tag (e.g., `v1.9.0`)
- Can trigger CI/CD if configured

**Current version location:** Check `package.json` → `"version": "1.8.0"`

---

### Step 5: Update Feedback Page (Admin Panel)

**When:** After version bump

**Where:** Your admin panel at `/admin/feedback` (as super_admin)

**For each completed feature:**

1. Find the feature request in the feedback list
2. Click to edit
3. Update fields:
   - **Status:** → `Completed`
   - **Version Type:** Select Major/Minor/Patch
   - **Version Number:** e.g., `1.9.0`
   - **Release Month & Year:** e.g., `November 2025`
   - **Admin Response:** Customer-friendly description of what was delivered

**Example Admin Response:**
> "Student profiles now display a comprehensive header showing the student's photo, current DAEP status, and quick links to their history. You can see at a glance if a student is on track or needs attention."

This automatically:
- Moves the item to "Completed" on the Roadmap
- Adds it to the Changelog with the version number
- Shows the release date to customers

---

### Step 6: Update Roadmap (If Applicable)

**When:** After major releases or when planning shifts

**Where:** Admin panel → Roadmap management

**What to update:**
- Move "In Progress" items that shipped to "Done"
- Move "Planned" items to "In Progress" if starting soon
- Add new items from future-backlog.md if they're being prioritized

---

## File Locations Reference

| File | Purpose |
|------|---------|
| `docs/releases/draft-next.md` | Working draft for current development cycle |
| `docs/releases/v1.X.X-internal.md` | Technical release notes (for internal/acquisition) |
| `docs/releases/v1.X.X-changelog.md` | Customer-friendly changelog text |
| `docs/sprint-artifacts/future-backlog.md` | Backlog items and future features |
| `docs/sprint-artifacts/sprint-status.yaml` | Current sprint tracking |
| `package.json` | Version number source of truth |

---

## Integration with Development Workflow

Here's how this fits with your existing process:

```
┌─────────────────────────────────────────────────────────────────┐
│ TECH SPEC PHASE                                                  │
│ Agent: Architect or Dev                                          │
│ Output: docs/sprint-artifacts/tech-spec-epic-X.md               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ STORY CREATION                                                   │
│ Agent: SM or Dev                                                 │
│ Output: docs/sprint-artifacts/daep/X-X-story-name.md            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ CODE + REVIEW                                                    │
│ Agent: Dev                                                       │
│ Output: Working code, passing tests                              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ GIT COMMIT (per story)                                           │
│ Agent: Dev or manual                                             │
│ Command: git commit -m "feat(scope): description"               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ DOCUMENTATION (per story)                          ← NEW STEP   │
│ Agent: Tech Writer (Paige)                                       │
│ Output: Entry in docs/releases/draft-next.md                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ MARK STORY DONE                                                  │
│ Update: sprint-status.yaml                                       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    (repeat for each story)
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ EPIC COMPLETE — RELEASE                                          │
│ 1. Compile release notes (Paige)                                │
│ 2. npm version minor (manual)                                   │
│ 3. Update feedback page (manual, admin panel)                   │
│ 4. Git push + tag                                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Agent Quick Reference

| Task | Agent | Slash Command |
|------|-------|---------------|
| Create tech spec | Architect | `/bmad:bmm:agents:architect` |
| Create story | SM | `/bmad:bmm:agents:sm` |
| Write code | Dev | `/bmad:bmm:agents:dev` |
| Code review | Dev | `/bmad:bmm:workflows:code-review` |
| Add release notes entry | Tech Writer | `/bmad:bmm:agents:tech-writer` |
| Compile release notes | Tech Writer | `/bmad:bmm:agents:tech-writer` |

---

## Example: Complete Flow for Story 2-3

```
1. DEV COMPLETES CODE
   - Story 2-3 implemented
   - Tests passing

2. GIT COMMIT
   $ git add .
   $ git commit -m "feat(daep): Display TrespassTracker status on student profile

   - Show active trespass alerts with expiration dates
   - Link to full trespass history
   - Color-coded status badges

   Story: 2-3
   FR: FR17"

3. CALL TECH WRITER
   "Hey Paige, I finished story 2-3 (TrespassTracker Status Display).
   Please add an entry to docs/releases/draft-next.md."

4. MARK DONE
   - Update sprint-status.yaml: 2-3 status → done

5. (LATER, AFTER EPIC) RELEASE
   $ npm version minor
   - Update feedback page with completed features
   - Git push --tags
```

---

## Checklist: Before Marking Epic Done

- [ ] All stories have conventional commit messages
- [ ] All stories have entries in `docs/releases/draft-next.md`
- [ ] Release notes compiled (internal + customer versions)
- [ ] Version bumped in package.json
- [ ] Feedback page updated (completed features marked with version)
- [ ] Roadmap updated (items moved to correct columns)
- [ ] Git tagged and pushed

---

## Future Enhancements

Once this process is stable, consider adding:

1. **Automated changelog generation** — `standard-version` npm package can auto-generate CHANGELOG.md from conventional commits

2. **Commit linting** — `commitlint` + `husky` to enforce conventional commit format

3. **CI/CD integration** — Auto-bump version on merge to main

4. **Changelog RSS feed** — Let customers subscribe to updates

---

*Created by Paige (Tech Writer) — 2025-11-29*
