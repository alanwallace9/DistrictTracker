# DAEP UX Improvements Backlog

Captured from user feedback on 2025-12-07.

---

## 1. Placement History Chevron Collapse

**Priority:** Medium
**Related To:** Student Profile Page, Placement Cards
**Screenshots:** User provided showing collapsible placement history

### Current Behavior
- All placement history cards are always visible/expanded
- Takes up significant vertical space with multiple placements

### Proposed Behavior
- Current placement always fully expanded (Active status)
- Historical placements collapsed by default with chevron toggle
- Collapsed state shows: Badge (#1, #2), Code, Date, Days (e.g., "20/20 days")
- Click chevron or card to expand full details
- Smooth animation on expand/collapse

### UI Mockup

**Collapsed State:**
```
┌─────────────────────────────────────────────────────────────────┐
│ #1  Code 04 - Fighting/Physical Altercation          [▼]       │
│     9/14/2023 · 20/20 days                                      │
└─────────────────────────────────────────────────────────────────┘
```

**Expanded State:**
```
┌─────────────────────────────────────────────────────────────────┐
│ #1  Code 04 - Fighting/Physical Altercation          [▲]       │
│     9/14/2023 · 20/20 days                                      │
├─────────────────────────────────────────────────────────────────┤
│ Start Date        End Date                                      │
│ 9/14/2023         10/4/2023                                     │
│                                                                 │
│ Offense Code      Days Served       Final Status                │
│ 04                20 / 20           Complete                    │
│                                                                 │
│ Placement Reason                                                │
│ Physical altercation with another student                       │
│                                                                 │
│ Home Campus                                                     │
│ Lincoln High School                                             │
└─────────────────────────────────────────────────────────────────┘
```

### Implementation Notes
- Store expand/collapse state in component (not persisted)
- Current placement (Active/Pending) always expanded
- Completed placements default to collapsed
- Animate height transition (200ms ease)

### Files to Modify
- `components/daep/PlacementHistoryCard.tsx` - Add collapse logic
- `app/daep/(main)/students/[school_id]/page.tsx` - Manage state

---

## 2. Placement Reason Visibility Settings

**Priority:** High
**Related To:** DAEP Settings, Privacy/Access Control
**FR Reference:** New requirement (FR109 candidate)

### Requirement
The "Placement Reason" field should have configurable visibility per tenant:
- **Default:** Only visible to `daep_admin_l1` and `district_admin`
- **Configurable:** Admin can allow visibility for other roles

### Proposed Settings

Add to `/daep/settings` (General tab) or new "Privacy" tab:

```
┌─────────────────────────────────────────────────────────────────┐
│ Privacy Settings                                                │
├─────────────────────────────────────────────────────────────────┤
│ Placement Reason Visibility                                     │
│                                                                 │
│ Who can see the "Placement Reason" field on student profiles?   │
│                                                                 │
│ ☑ District Admin                    (always checked, disabled)  │
│ ☑ DAEP Admin L1                     (always checked, disabled)  │
│ ☐ DAEP Admin L2                                                 │
│ ☐ DAEP Staff                                                    │
│                                                                 │
│ Note: Placement reason may contain sensitive disciplinary       │
│ information. Only grant access to roles that need it.           │
│                                                                 │
│                                               [Save Changes]    │
└─────────────────────────────────────────────────────────────────┘
```

### Data Model

Add to `daep_district_settings` JSONB config:

```typescript
interface DAEPDistrictSettings {
  // Existing fields...
  timezone: string;
  default_points_per_period: number;
  attendance_threshold: number;

  // New privacy settings
  privacy: {
    placement_reason_visible_to: string[];  // Default: ['district_admin', 'daep_admin_l1']
  };
}
```

### Implementation Notes

1. **Server-side filtering:**
   ```typescript
   // In getPlacement() or similar
   const canSeeReason = settings.privacy.placement_reason_visible_to.includes(userRole);
   return {
     ...placement,
     placement_reason: canSeeReason ? placement.placement_reason : null,
   };
   ```

2. **UI conditional render:**
   ```tsx
   {placement.placement_reason && (
     <div>
       <Label>Placement Reason</Label>
       <p>{placement.placement_reason}</p>
     </div>
   )}
   ```

3. **Form handling:**
   - Placement reason can always be entered by anyone creating placement
   - Visibility is controlled on read, not write

### Files to Modify
- `app/daep/settings/page.tsx` - Add privacy settings section
- `app/actions/daep/settings.ts` - Add privacy settings CRUD
- `app/actions/daep/placements.ts` - Filter placement_reason by role
- `components/daep/PlacementCard.tsx` - Conditional render
- `components/daep/PlacementHistoryCard.tsx` - Conditional render
- `lib/validation/schemas.ts` - Update settings schema

### Migration

```sql
-- Update existing settings to include privacy defaults
UPDATE daep_district_settings
SET config = jsonb_set(
  config,
  '{privacy}',
  '{"placement_reason_visible_to": ["district_admin", "daep_admin_l1"]}'::jsonb
)
WHERE NOT config ? 'privacy';
```

---

## 3. Room Roster UX Improvements

**Priority:** Low (polish)
**Related To:** Room Roster Page
**Screenshots:** User provided showing room roster with student cards

### Takeaways from Reference Design

The reference design shows several nice UX patterns we could adopt:

#### 3a. Performance Badge on Student Card
Current roster shows metrics but no quick visual indicator. Add a badge:

```
┌──────────────────────────────────────────────────────────────────────┐
│ Jordan Mitchell                      Days    Days      Current       │
│ ID: STU-0001                        Served  Remaining  Points        │
│                                      45      135        85     [Excellent] │
└──────────────────────────────────────────────────────────────────────┘
```

Badge logic:
- **Excellent** (green): ≥90% points
- **Good** (blue): 80-89% points
- **Needs Improvement** (amber): 70-79% points
- **At Risk** (red): <70% points

#### 3b. Inline Behavior Note Preview
Show most recent behavior note directly on the card (already partially implemented):

```
Behavior Note
[Add Note]
+5 pts - On Task
Positive Recognition
```

#### 3c. Search Students in Room
Add search box to filter students within the selected room (quick find).

---

## 4. Behavior Note Visibility Checkbox

**Priority:** High
**Related To:** Add Behavior Note Dialog, Point Entry
**FR Reference:** Enhances FR36 (Point Notes)

### Current State
The "Add Behavior Note" dialog currently has:
- Points dropdown
- Student Action dropdown
- Teacher Action dropdown
- Notes field

### Enhancement: "Make visible to students and parents" Checkbox

Add checkbox to control whether the note appears on student/parent portal:

```
┌─────────────────────────────────────────────────────────────────┐
│ Add Behavior Note                                          [X]  │
├─────────────────────────────────────────────────────────────────┤
│ Points                                                          │
│ [0 ▼]                                                           │
│                                                                 │
│ Student Action                                                  │
│ [Select action... ▼]                                            │
│                                                                 │
│ Teacher Action                                                  │
│ [Select action... ▼]                                            │
│                                                                 │
│ Notes (optional)                                                │
│ [                                                             ] │
│                                                                 │
│ ☐ Make visible to students and parents                          │
│                                                                 │
│ ℹ️ Note: ALL behavior notes are part of the official student    │
│    record and may be requested by parents under FERPA.          │
│    This checkbox only controls immediate visibility to          │
│    students/parents (like a post-it note for the teacher).      │
│                                                                 │
│                              [Cancel]  [Save Note]              │
└─────────────────────────────────────────────────────────────────┘
```

### Use Cases
1. **Positive reinforcement:** Teacher wants to share "Great job staying on task!" with parents
2. **Redirection notes:** Document what strategies worked for the student
3. **Private staff notes:** Keep internal observations private (unchecked)

### Implementation Notes

1. **Data Model:**
   ```sql
   -- Already exists in daep_daily_points
   ALTER TABLE daep_daily_points
   ADD COLUMN IF NOT EXISTS public BOOLEAN DEFAULT false;
   ```

   Note: The `public` column already exists from Story 3.5/3.6 approval workflow.
   This checkbox gives **manual control** over visibility, separate from approval status.

2. **Logic:**
   - If `public = true`: Visible on student/parent portal
   - If `public = false`: Only visible to DAEP staff
   - Approved teacher can set `public = true` directly
   - Non-approved staff: Note goes to approval queue, admin decides visibility

3. **Warning text:**
   - Display FERPA caution when checkbox is checked
   - Remind staff these become part of official record

### Files to Modify
- `components/daep/AddPointAdjustmentDialog.tsx` - Add checkbox + warning
- `app/actions/daep/points.ts` - Already handles `public` field
- Parent portal (future) - Display public notes

---

## 5. Streak Indicator on Room Roster

**Priority:** Medium
**Related To:** Story 3-7 (Milestones), Room Roster

### Enhancement
Show current streak on room roster student cards:

```
┌──────────────────────────────────────────────────────────────────────┐
│ 🔥 4-day streak                                                      │
│ Jordan Mitchell                      Days    Days      Current       │
│ ID: STU-0001                        Served  Remaining  Points        │
│                                      45      135        85     [Excellent] │
└──────────────────────────────────────────────────────────────────────┘
```

Only shown when streak ≥ 2 days. Helps teachers recognize and reinforce good behavior.

---

## Implementation Priority

| Item | Priority | Story Points | Depends On |
|------|----------|--------------|------------|
| Placement Reason Visibility | High | 3 | None |
| Behavior Note Visibility Checkbox | High | 2 | None |
| Placement History Chevron | Medium | 2 | None |
| Streak Indicator on Roster | Medium | 1 | Story 3-7 |
| Performance Badge on Card | Low | 1 | None |
| Search Students in Room | Low | 1 | None |

---

_Backlog Created: 2025-12-07_
_Updated: 2025-12-07 - Added Room Roster UX, Behavior Note Visibility_
_Source: User feedback session_
