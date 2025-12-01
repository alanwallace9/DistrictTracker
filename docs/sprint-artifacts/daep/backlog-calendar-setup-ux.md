# Backlog Item: Calendar Setup UX Improvements

**Type:** UX Enhancement
**Priority:** MEDIUM
**Date Added:** 2025-11-30
**Source:** User feedback during Story 1.8 review

---

## Problem Statement

The calendar setup workflow has two actions (Generate Calendar, Import CSV) but users don't understand:
1. That these are **alternative starting points**, not both required
2. What "Generate Calendar" actually produces
3. How to customize individual days **after** the initial setup

## Current State

- Two buttons at top of calendar page: "Generate" and "Import"
- No explanation of workflow or relationship between actions
- Users may try both, not realizing Generate overwrites everything
- No guidance on next steps after initial setup

## Proposed Solutions

### Idea 1: Guided Setup Wizard
Replace separate buttons with single "Set Up Calendar" button opening a wizard:
- Step 1: Choose method (Auto-Generate vs Import CSV)
- Visual cards explaining each option's purpose
- Footer note: "After setup, click any day to customize"

### Idea 2: Visual "Before & After" in Generate Dialog
Show what Generate produces:
```
What you'll get:
Mon-Fri  →  School Day (Regular)
Sat-Sun  →  Non-School Day

Then customize by clicking any day to change its type
```

### Idea 3: Empty State with Clear Path
When calendar has no entries, show explanatory empty state:
- Heading: "No Calendar Set Up Yet"
- Two option cards with descriptions:
  - Generate: "Auto-create weekdays as school days. Best for: Starting fresh"
  - Import: "Upload district-provided calendar. Best for: TEA/district templates"
- Help text: "Either way, you can edit individual days by clicking them"

### Idea 4: Inline Help Banner
Persistent help text at top of calendar page:
```
Quick Start: Generate a baseline calendar, then click any day to mark holidays, workdays, or early releases.
```

### Idea 5: Contextual Tooltips
Add descriptions under/near each button:
- Generate: "Create weekday entries automatically"
- Import CSV: "Upload district calendar file"

## Recommended Implementation

Combine **Idea 3** (Empty State) + **Idea 4** (Inline Help):
- Empty state guides first-time users through the choice
- Inline help reminds returning users of the workflow
- Minimal UI changes, maximum clarity

## Acceptance Criteria (Draft)

- [ ] Empty state shown when no calendar entries exist for selected school year
- [ ] Empty state clearly explains both setup options
- [ ] Empty state indicates that days can be edited after setup
- [ ] Inline help banner visible on calendar page (collapsible?)
- [ ] Generate dialog explains what will be created

## Technical Considerations

- Check if `school_calendar` table has entries for current school year
- Conditionally render empty state vs calendar grid
- Consider localStorage flag to hide inline help after first use

## Related

- Story 1.8: School Calendar Configuration
- `app/daep/settings/calendar/page.tsx`
- `app/daep/settings/calendar/GenerateCalendarDialog.tsx`
- `app/daep/settings/calendar/CSVUploadDialog.tsx`
