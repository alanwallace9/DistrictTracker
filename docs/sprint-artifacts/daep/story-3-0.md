# Story 3-0: Room Groups for Separation Logic

**Epic:** 3 - Daily Operations
**Points:** 2
**Priority:** P0 - Prerequisite for Story 3-1
**Status:** done

---

## User Story

**As a** DAEP administrator
**I want** to define room groups (e.g., "Up", "Down") and assign rooms to groups
**So that** separation logic correctly prevents students from being in the same building section

---

## Background

The current separation logic uses a free-text `building_section` field on rooms. This needs to be formalized into a proper room groups system where:
- Groups are defined once per tenant (e.g., "Up", "Down")
- Rooms are assigned to a group via dropdown
- Separation logic checks group membership, not string matching

---

## Acceptance Criteria

### Database
- [x] **AC 3.0.1:** Create `daep_room_groups` table with: id, tenant_id, group_name, description, sort_order, active
- [x] **AC 3.0.2:** Add `room_group_id` FK column to `daep_rooms` table
- [x] **AC 3.0.3:** RLS policies on `daep_room_groups` matching other DAEP tables

### Settings UI
- [x] **AC 3.0.4:** "Add Group" button on `/daep/settings/rooms` page (near existing "Add Room" button)
- [x] **AC 3.0.5:** Dialog to create/edit room groups (name, description)
- [x] **AC 3.0.6:** Room groups displayed in a list/section above rooms list
- [x] **AC 3.0.7:** Room edit dialog: "Building Section" field becomes a dropdown of available groups
- [x] **AC 3.0.8:** Dropdown shows group names, stores `room_group_id`

### Separation Logic Update
- [x] **AC 3.0.9:** `getAvailableRoomsForStudent()` uses `room_group_id` instead of `building_section` string
- [x] **AC 3.0.10:** If separated student is in a room with a group, all rooms in that group are blocked
- [x] **AC 3.0.11:** Rooms without a group assignment are treated as their own isolated group

### Migration
- [x] **AC 3.0.12:** Existing `building_section` values are preserved (field kept for backwards compatibility)
- [x] **AC 3.0.13:** No data loss - existing separation logic continues to work until groups are configured

---

## Tasks

### Task 1: Database Migration
- [x] Create `daep_room_groups` table
- [x] Add `room_group_id` column to `daep_rooms`
- [x] Create RLS policies for `daep_room_groups`
- [x] Add validation schema for room groups

### Task 2: Server Actions for Room Groups
- [x] Create `app/actions/daep/room-groups.ts`
- [x] `getRoomGroups()` - list all groups for tenant
- [x] `createRoomGroup()` - create new group
- [x] `updateRoomGroup()` - edit group
- [x] `deleteRoomGroup()` - soft delete (set active=false)

### Task 3: Settings UI - Room Groups
- [x] Add "Room Groups" section to rooms settings page
- [x] Create `AddGroupDialog.tsx` component
- [x] Create `EditGroupDialog.tsx` component
- [x] Display groups in a simple list with edit/delete actions

### Task 4: Update Room Form
- [x] Fetch room groups for dropdown
- [x] Replace free-text "Building Section" with group dropdown
- [x] Update `createDAEPRoom()` to accept `room_group_id`
- [x] Update `updateDAEPRoom()` to accept `room_group_id`

### Task 5: Refactor Separation Logic
- [x] Update `getAvailableRoomsForStudent()` in `rooms.ts`
- [x] Change from `building_section` string match to `room_group_id` match
- [x] Handle rooms with no group (treat as isolated)
- [x] Test separation blocking works correctly

---

## Technical Notes

### Database Schema

```sql
CREATE TABLE daep_room_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  group_name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, group_name)
);

ALTER TABLE daep_rooms
ADD COLUMN room_group_id UUID REFERENCES daep_room_groups(id);
```

### UI Label
Keep "Building Section" as the user-facing label in the dropdown - it's familiar terminology.

### Backwards Compatibility
- Keep `building_section` text field in database (don't remove)
- New logic uses `room_group_id` when present
- Fallback to `building_section` string match if no groups configured

---

## Definition of Done

- [x] All acceptance criteria met
- [x] Room groups can be created/edited in settings
- [x] Rooms can be assigned to groups via dropdown
- [x] Separation logic uses group membership
- [x] Existing separations continue to work
- [x] No console errors
- [x] Tested with Playwright MCP

---

## Files to Modify/Create

**Create:**
- `app/actions/daep/room-groups.ts`
- `app/daep/settings/rooms/AddGroupDialog.tsx`
- `app/daep/settings/rooms/EditGroupDialog.tsx`

**Modify:**
- `app/daep/settings/rooms/page.tsx` - add groups section
- `app/daep/settings/rooms/AddRoomDialog.tsx` - group dropdown
- `app/daep/settings/rooms/EditRoomDialog.tsx` - group dropdown
- `app/actions/daep/rooms.ts` - separation logic refactor
- `lib/validation/schemas.ts` - add RoomGroupSchema
