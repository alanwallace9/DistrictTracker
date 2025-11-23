# Multi-Incident Architecture Plan

## Current Issue
The system stores each incident as a separate row in `trespass_records` table. When a person has multiple incidents:
- Dashboard needs to show only most recent incident (not duplicates)
- Existing duplicate records need manual one-time cleanup
- "Add New Incident" should pre-fill shared fields from previous incident
- Each incident must remain completely independent (no cross-sync)

## Proposed Solution: Hybrid Approach

### Database Structure (NO CHANGES)
Keep current structure: one row per incident, linked by `school_id`.

**Why?** This maintains data isolation, simplifies RLS policies, and allows incident-specific auditing.

### Field Categories

#### Shared Fields (Person Identity)
These should be consistent across all incidents for the same person:
- `first_name` ✓
- `last_name` ✓
- `school_id` ✓ (primary linkage key)
- `date_of_birth` ✓
- `photo` ✓
- `guardian_first_name` ✓
- `guardian_last_name` ✓
- `guardian_phone` ✓
- `aka` ✓

#### Incident-Specific Fields
These vary per incident:
- `campus_id` (can change if student transfers)
- `is_daep` (incident type)
- `daep_expiration_date` or `expiration_date`
- `trespassed_from`
- `notes`
- `status`
- `created_at` (incident timestamp)

### UI Behavior

#### Dashboard View
**Show most recent incident only** (IMPLEMENTED)
- Group records by `school_id`
- Display only the most recent incident (latest `created_at`)
- Show each incident's own data (NO merging across incidents)
- Show badge: "X incidents" to indicate multiple
- Click card → Opens detail dialog with incident switcher

**IMPORTANT**: Dashboard does NOT merge data from multiple incidents. Each card shows only the data from that specific incident record. Photo and guardian info are NOT shared between incidents on the dashboard view.

#### Detail Dialog - View Mode
**Incident Switcher** (ALREADY IMPLEMENTED)
- Dropdown + Previous/Next buttons
- Shows: "Viewing Incident X of Y"
- Each incident displays its own data
- "Add New Incident" button pre-fills shared fields

#### Detail Dialog - Edit Mode
**Field Inheritance (New Incident):**
- When creating new incident: Pre-fill ALL fields from most recent incident
- Photo, guardian info, DOB, aka carry over
- If DAEP is checked: Auto-set `trespassed_from = "All District Properties"`
- User can override any field for this specific incident
- Campus can be changed (student may have transferred)

**Photo/Document Management:**
- Primary photo field: Copies from previous incident to new incident
- Photo Gallery (additional photos): Copies all photos from previous incident
- User can upload new photos to current incident only
- Each incident maintains its own photo gallery

**Field Updates:**
- Editing ANY field updates ONLY the current incident
- No automatic syncing across incidents
- Each incident row is independent

### Implementation Steps

1. **Fix Dashboard Deduplication** ✓ Priority 1
   - Modify `DashboardClient.tsx` to group by `school_id`
   - Show only most recent incident per person
   - Add incident count badge

2. **Fix Incident Switcher Visibility** ✓ Priority 1
   - Ensure switcher appears when `relatedIncidents.length > 1`
   - Debug why it's disappearing

3. **Auto-fill DAEP "Trespassed From"** ✓ Priority 2
   - When `is_daep` checkbox is checked
   - Auto-set `trespassed_from = "All District Properties"`
   - User can still override if needed

4. **Copy Photo Gallery to New Incidents** ✓ Priority 2
   - When creating new incident, copy all photos from `record_photos` table
   - Insert new rows linked to new incident ID
   - Each incident maintains independent photo gallery

5. **Add Validation** ✓ Priority 3
   - Prevent `school_id` changes (immutable)
   - Warn if guardian info differs across incidents

6. **CSV Upload Enhancement** ✓ Priority 3
   - Detect existing `school_id` on upload
   - Ask: "Create new incident or update existing?"

### Database Queries

#### Get Most Recent Incident Per Person
```sql
SELECT DISTINCT ON (school_id)
  *,
  COUNT(*) OVER (PARTITION BY school_id) as incident_count
FROM trespass_records
WHERE tenant_id = $1
ORDER BY school_id, created_at DESC;
```

#### Copy Photos to New Incident
```sql
-- Copy all photos from previous incident to new incident
INSERT INTO record_photos (record_id, photo_url, caption, uploaded_by, tenant_id)
SELECT $1, photo_url, caption, $2, tenant_id
FROM record_photos
WHERE record_id = $3;
```

### Migration Path
1. No database schema changes needed
2. Update UI components only
3. Add new server actions for bulk updates
4. Update audit logging to track "applied to X incidents"

### Open Questions
1. Should `school_id` be editable? **NO** - it's the linkage key
2. What if guardian info differs between incidents? **Show warning, let user decide**
3. Should old incidents be archived? **Status field handles this**

## Key Decisions
1. **No cross-incident syncing** - Each incident is completely independent, editing one never affects another
2. **No dashboard data merging** - Dashboard shows only the most recent incident's own data (no merging)
3. **Field inheritance on creation only** - When "Add New Incident" is clicked, pre-fill shared fields from previous incident
4. **Photo gallery copies** - New incident gets copy of all photos from previous incident
5. **DAEP auto-fills trespassed_from** - When DAEP checked, auto-set to "All District Properties"
6. **Manual cleanup of existing duplicates** - Current duplicate records (like Kash) need one-time manual cleanup

## Status
- [x] Documented architecture
- [x] Updated with corrected no-merge approach (2025-11-15)
- [x] Dashboard deduplication (shows only most recent incident)
- [x] Incident switcher working
- [x] Fixed date display timezone issue
- [x] Fixed incident update bug (using currentRecord.id)
- [x] Remove dashboard data merging logic (completed 2025-11-15)
- [x] Implement "Add New Incident" pre-fill from previous incident (already working)
- [x] DAEP auto-fill "Trespassed From" (already implemented - lines 658-676)
- [x] Photo gallery copy on new incident creation (completed 2025-11-15)
- [x] Image storage migration (converted all 205 photos to Supabase Storage - completed 2025-11-15)
- [ ] Manual cleanup of existing duplicate records
- [ ] CSV upload enhancement
