# Backlog Item: Room Grouping for Separation Logic

**Type:** Feature Request / Improvement
**Priority:** HIGH
**Date Added:** 2025-11-30
**Source:** Course correction session (Story 2-8b planning)

---

## Description

Current separation logic only prevents two separated students from being in the same room. However, real-world separation requirements are broader — students may need to be separated across an entire wing, hallway, or lunch schedule group.

## User Need

When students have a separation order:
- They cannot be in the same **room**
- They also cannot be in rooms that share:
  - Same side of hallway
  - Same lunch period
  - Same schedule block
  - Same building wing

If Student A is assigned to Room 101 (East Wing), and Student B has a separation from Student A, then ALL East Wing rooms should be grayed out and unavailable for Student B.

## Proposed Solution (TBD)

1. **Room Groups in Settings**
   - Settings page to create room groups (e.g., "East Wing", "A Lunch Rooms", "Morning Block")
   - Assign rooms to one or more groups

2. **Enhanced Separation Logic**
   - When checking room availability, also check group membership
   - If separated student is in any room in a group, entire group is unavailable

3. **UI Updates**
   - Room dropdown shows group name when hovering disabled rooms
   - Tooltip: "Unavailable - separated student in East Wing (Room 101)"

## Acceptance Criteria (Draft)

- [ ] Settings page allows creating room groups
- [ ] Rooms can be assigned to multiple groups
- [ ] Separation logic checks group membership, not just individual room
- [ ] Room dropdown grays out entire group when separation conflict exists
- [ ] Tooltip explains which group and why

## Technical Considerations

- New table: `daep_room_groups` (id, tenant_id, name, description)
- Junction table: `daep_room_group_assignments` (room_id, group_id)
- Update `getAvailableRoomsForStudent()` to check group conflicts

## Related

- Story 2-5 (Room Assignment & Separation Logic) - current implementation
- Story 2-8b (Inline Editing) - will use existing separation logic
- Epic 1b Story 1-5 (Room Management) - settings page exists

---

## Notes

Multiple campuses have this requirement. Current room-level separation is insufficient for maintaining physical separation throughout the school day (hallways, lunch, etc.).

This is a HIGH PRIORITY enhancement to be scheduled after Epic 2 core functionality is complete.
