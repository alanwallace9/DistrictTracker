# Tech Spec: Story 2-5 - Room Assignment & Separation Logic

**Epic:** 2 - Placement Management
**Points:** 5
**Status:** Backlog
**FRs:** FR18, FR67

> ⚠️ **Theme Requirement:** All UI components must follow the [Theme & Styling Guidelines](./tech-spec-epic-2-part1.md#theme--styling-guidelines). Never hardcode colors.

---

## Purpose

This story implements room assignment functionality with student separation enforcement. Students who need to be kept apart (due to conflicts, gang affiliations, etc.) must be assigned to different building sections.

---

## Scope

### In Scope

- Room selection UI with availability filtering
- Room occupancy display (current count / capacity)
- Student separation enforcement at building section level
- Separation CRUD (create, read, deactivate)
- Separation expiration dates
- Audit logging for room assignments and separation changes

### Out of Scope

- Multiple DAEP campus room management (single campus per tenant for MVP)
- Real-time room updates via WebSocket (page refresh required)
- Automatic room suggestions/optimization
- Room scheduling by time slot (rooms are full-day assignments)
- Separation approval workflow (admin can create directly)
- Historical separation reporting (future Epic 6)

---

## Acceptance Criteria

| AC | Description | Implementation |
|----|-------------|----------------|
| 2.5.1 | Room selection dropdown filtered by capacity | Show only rooms with available spots |
| 2.5.2 | Display current room occupancy | Format: `X/15 students` |
| 2.5.3 | Student separation enforcement | Block rooms in same building section as separated students |
| 2.5.4 | Separation reason displayed | Show why room is blocked |
| 2.5.5 | Create new separation flags | Admin UI to add separations |
| 2.5.6 | Separation flags have expiration dates | Auto-deactivate expired separations |
| 2.5.7 | Audit log for room assignments | Log all room changes and separation flag changes |

---

## Database Tables

### `daep_rooms` (Existing)
```sql
CREATE TABLE daep_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  campus_id TEXT,  -- FK to campuses
  room_number TEXT NOT NULL,
  room_name TEXT,
  capacity INTEGER DEFAULT 15,
  building_section TEXT,  -- CRITICAL: Used for separation logic
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Key Field:** `building_section` - Groups rooms by physical location. Separation rules apply at building section level.

**Example Building Sections:**
- `A-Wing` (rooms 501-505)
- `B-Wing` (rooms 506-509)
- `Main Building`
- `Portable 1`

### `daep_student_separations` (Existing)
```sql
CREATE TABLE daep_student_separations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  student_a_id TEXT NOT NULL,  -- school_id of first student
  student_b_id TEXT NOT NULL,  -- school_id of second student
  reason TEXT NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_by TEXT NOT NULL,  -- Clerk user ID
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ  -- NULL = no expiration
);
```

**Separation Logic:**
- If Student A is in building section X, Student B cannot be assigned to any room in section X
- Separations are bidirectional (A separated from B = B separated from A)
- Expired separations are auto-deactivated (check `expires_at < NOW()`)

### `daep_placements` (Existing)
```sql
-- Relevant fields
assigned_room_id UUID REFERENCES daep_rooms(id),
status TEXT  -- 'pending', 'active', 'transition', 'complete'
```

---

## Server Actions

### 1. `getAvailableRoomsForStudent(school_id, placement_id?)`

**Purpose:** Return all rooms with availability and separation status for a specific student.

**Logic:**
```typescript
// app/actions/daep/rooms.ts

export interface RoomAvailability {
  id: string;
  room_number: string;
  room_name: string | null;
  building_section: string | null;
  capacity: number;
  current_count: number;
  available_spots: number;
  is_available: boolean;
  blocked_reason?: string;  // "Separation: John Smith in this section"
  blocked_students?: string[];  // Names of students causing block
}

export async function getAvailableRoomsForStudent(
  school_id: string,
  placement_id?: string  // Optional: exclude current placement from occupancy count
): Promise<RoomAvailability[]> {
  const tenantId = await getTenantId();
  const supabase = await createServerClient();

  // 1. Get all active rooms
  const { data: rooms } = await supabase
    .from('daep_rooms')
    .select('id, room_number, room_name, building_section, capacity')
    .eq('tenant_id', tenantId)
    .eq('active', true)
    .order('room_number');

  if (!rooms) return [];

  // 2. Get current room occupancy (active placements only)
  const { data: occupancy } = await supabase
    .from('daep_placements')
    .select('assigned_room_id, school_id')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .not('assigned_room_id', 'is', null);

  // Build room count map
  const roomCounts = new Map<string, number>();
  (occupancy || []).forEach(p => {
    if (p.assigned_room_id && p.school_id !== school_id) {
      const count = roomCounts.get(p.assigned_room_id) || 0;
      roomCounts.set(p.assigned_room_id, count + 1);
    }
  });

  // 3. Get active separations for this student
  const { data: separations } = await supabase
    .from('daep_student_separations')
    .select('student_a_id, student_b_id, reason')
    .eq('tenant_id', tenantId)
    .eq('active', true)
    .or(`student_a_id.eq.${school_id},student_b_id.eq.${school_id}`)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

  // Extract separated student IDs
  const separatedStudentIds = new Set<string>();
  const separationReasons = new Map<string, string>();

  (separations || []).forEach(sep => {
    const otherId = sep.student_a_id === school_id ? sep.student_b_id : sep.student_a_id;
    separatedStudentIds.add(otherId);
    separationReasons.set(otherId, sep.reason);
  });

  // 4. Find which building sections are blocked
  const blockedSections = new Map<string, { studentIds: string[], reason: string }>();

  (occupancy || []).forEach(p => {
    if (separatedStudentIds.has(p.school_id) && p.assigned_room_id) {
      const room = rooms.find(r => r.id === p.assigned_room_id);
      if (room?.building_section) {
        const existing = blockedSections.get(room.building_section) || { studentIds: [], reason: '' };
        existing.studentIds.push(p.school_id);
        existing.reason = separationReasons.get(p.school_id) || 'Student separation required';
        blockedSections.set(room.building_section, existing);
      }
    }
  });

  // 5. Get student names for blocked students
  const allBlockedIds = Array.from(blockedSections.values()).flatMap(b => b.studentIds);
  const { data: studentNames } = await supabase
    .from('trespass_records')
    .select('school_id, first_name, last_name')
    .eq('tenant_id', tenantId)
    .in('school_id', allBlockedIds);

  const nameMap = new Map(
    (studentNames || []).map(s => [s.school_id, `${s.first_name} ${s.last_name}`])
  );

  // 6. Build availability response
  return rooms.map(room => {
    const currentCount = roomCounts.get(room.id) || 0;
    const availableSpots = room.capacity - currentCount;

    // Check if blocked by separation
    const blockInfo = room.building_section ? blockedSections.get(room.building_section) : null;
    const isBlocked = !!blockInfo;

    let blockedReason: string | undefined;
    let blockedStudents: string[] | undefined;

    if (isBlocked && blockInfo) {
      blockedStudents = blockInfo.studentIds.map(id => nameMap.get(id) || id);
      blockedReason = `Separation: ${blockedStudents.join(', ')} in this section. Reason: ${blockInfo.reason}`;
    }

    return {
      id: room.id,
      room_number: room.room_number,
      room_name: room.room_name,
      building_section: room.building_section,
      capacity: room.capacity,
      current_count: currentCount,
      available_spots: availableSpots,
      is_available: availableSpots > 0 && !isBlocked,
      blocked_reason: blockedReason,
      blocked_students: blockedStudents,
    };
  });
}
```

### 2. `assignRoom(placement_id, room_id)`

**Purpose:** Assign a student to a room with separation validation.

```typescript
export async function assignRoom(
  placement_id: string,
  room_id: string
): Promise<{ success: boolean; error?: string }> {
  const tenantId = await getTenantId();
  const supabase = await createServerClient();
  const user = await currentUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  // 1. Get placement details
  const { data: placement } = await supabase
    .from('daep_placements')
    .select('school_id, assigned_room_id')
    .eq('id', placement_id)
    .eq('tenant_id', tenantId)
    .single();

  if (!placement) {
    return { success: false, error: 'Placement not found' };
  }

  // 2. Validate room assignment
  const availableRooms = await getAvailableRoomsForStudent(placement.school_id, placement_id);
  const selectedRoom = availableRooms.find(r => r.id === room_id);

  if (!selectedRoom) {
    return { success: false, error: 'Room not found' };
  }

  if (!selectedRoom.is_available) {
    return {
      success: false,
      error: selectedRoom.blocked_reason || 'Room not available'
    };
  }

  // 3. Get student name for audit log
  const { data: student } = await supabase
    .from('trespass_records')
    .select('first_name, last_name')
    .eq('tenant_id', tenantId)
    .eq('school_id', placement.school_id)
    .single();

  const studentName = student ? `${student.first_name} ${student.last_name}` : placement.school_id;
  const previousRoomId = placement.assigned_room_id;

  // 4. Update placement
  const { error } = await supabase
    .from('daep_placements')
    .update({ assigned_room_id: room_id })
    .eq('id', placement_id);

  if (error) {
    return { success: false, error: 'Failed to assign room' };
  }

  // 5. Audit log
  await logAuditEvent({
    eventType: 'room.assignment_changed',
    module: 'daep_management',
    actorId: user.id,
    targetId: placement_id,
    action: `Assigned ${studentName} to room ${selectedRoom.room_number}`,
    recordSubjectName: studentName,
    recordSchoolId: placement.school_id,
    tenantId,
    details: {
      previous_room_id: previousRoomId,
      new_room_id: room_id,
      room_number: selectedRoom.room_number,
    },
  });

  revalidatePath('/daep/students');
  revalidatePath('/daep/placements');

  return { success: true };
}
```

### 3. `getStudentSeparations(school_id)`

**Purpose:** Get all active separations for a student.

```typescript
export interface StudentSeparation {
  id: string;
  other_student_id: string;
  other_student_name: string;
  reason: string;
  expires_at: string | null;
  created_at: string;
  created_by_name: string;
}

export async function getStudentSeparations(
  school_id: string
): Promise<StudentSeparation[]> {
  const tenantId = await getTenantId();
  const supabase = await createServerClient();

  const { data: separations } = await supabase
    .from('daep_student_separations')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('active', true)
    .or(`student_a_id.eq.${school_id},student_b_id.eq.${school_id}`);

  if (!separations || separations.length === 0) return [];

  // Get names for other students and creators
  const otherIds = separations.map(s =>
    s.student_a_id === school_id ? s.student_b_id : s.student_a_id
  );
  const creatorIds = [...new Set(separations.map(s => s.created_by))];

  const [{ data: students }, { data: creators }] = await Promise.all([
    supabase
      .from('trespass_records')
      .select('school_id, first_name, last_name')
      .eq('tenant_id', tenantId)
      .in('school_id', otherIds),
    supabase
      .from('user_profiles')
      .select('id, first_name, last_name')
      .in('id', creatorIds),
  ]);

  const studentMap = new Map((students || []).map(s =>
    [s.school_id, `${s.first_name} ${s.last_name}`]
  ));
  const creatorMap = new Map((creators || []).map(c =>
    [c.id, `${c.first_name} ${c.last_name}`]
  ));

  return separations.map(sep => ({
    id: sep.id,
    other_student_id: sep.student_a_id === school_id ? sep.student_b_id : sep.student_a_id,
    other_student_name: studentMap.get(
      sep.student_a_id === school_id ? sep.student_b_id : sep.student_a_id
    ) || 'Unknown',
    reason: sep.reason,
    expires_at: sep.expires_at,
    created_at: sep.created_at,
    created_by_name: creatorMap.get(sep.created_by) || 'Unknown',
  }));
}
```

### 4. `createSeparation(input)`

**Purpose:** Create a new separation between two students.

```typescript
export interface CreateSeparationInput {
  student_a_id: string;
  student_b_id: string;
  reason: string;
  expires_at?: string;  // ISO date string, null = no expiration
}

export async function createSeparation(
  input: CreateSeparationInput
): Promise<{ success: boolean; error?: string }> {
  const tenantId = await getTenantId();
  const supabase = await createServerClient();
  const user = await currentUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  // Validate students exist
  const { data: students } = await supabase
    .from('trespass_records')
    .select('school_id, first_name, last_name')
    .eq('tenant_id', tenantId)
    .in('school_id', [input.student_a_id, input.student_b_id]);

  if (!students || students.length !== 2) {
    return { success: false, error: 'One or both students not found' };
  }

  // Check if separation already exists
  const { data: existing } = await supabase
    .from('daep_student_separations')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('active', true)
    .or(`and(student_a_id.eq.${input.student_a_id},student_b_id.eq.${input.student_b_id}),and(student_a_id.eq.${input.student_b_id},student_b_id.eq.${input.student_a_id})`)
    .single();

  if (existing) {
    return { success: false, error: 'Separation already exists between these students' };
  }

  // Create separation
  const { error } = await supabase
    .from('daep_student_separations')
    .insert({
      tenant_id: tenantId,
      student_a_id: input.student_a_id,
      student_b_id: input.student_b_id,
      reason: input.reason,
      expires_at: input.expires_at || null,
      created_by: user.id,
    });

  if (error) {
    return { success: false, error: 'Failed to create separation' };
  }

  // Get student names for audit
  const studentA = students.find(s => s.school_id === input.student_a_id);
  const studentB = students.find(s => s.school_id === input.student_b_id);

  await logAuditEvent({
    eventType: 'student.separation_added',
    module: 'daep_management',
    actorId: user.id,
    action: `Created separation between ${studentA?.first_name} ${studentA?.last_name} and ${studentB?.first_name} ${studentB?.last_name}`,
    tenantId,
    details: {
      student_a_id: input.student_a_id,
      student_b_id: input.student_b_id,
      reason: input.reason,
      expires_at: input.expires_at,
    },
  });

  revalidatePath('/daep/students');

  return { success: true };
}
```

### 5. `removeSeparation(separation_id)`

**Purpose:** Deactivate an existing separation.

```typescript
export async function removeSeparation(
  separation_id: string
): Promise<{ success: boolean; error?: string }> {
  const tenantId = await getTenantId();
  const supabase = await createServerClient();
  const user = await currentUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  // Get separation details for audit
  const { data: separation } = await supabase
    .from('daep_student_separations')
    .select('student_a_id, student_b_id, reason')
    .eq('id', separation_id)
    .eq('tenant_id', tenantId)
    .single();

  if (!separation) {
    return { success: false, error: 'Separation not found' };
  }

  // Deactivate (soft delete)
  const { error } = await supabase
    .from('daep_student_separations')
    .update({ active: false })
    .eq('id', separation_id);

  if (error) {
    return { success: false, error: 'Failed to remove separation' };
  }

  await logAuditEvent({
    eventType: 'student.separation_removed',
    module: 'daep_management',
    actorId: user.id,
    targetId: separation_id,
    action: `Removed separation between students`,
    tenantId,
    details: {
      student_a_id: separation.student_a_id,
      student_b_id: separation.student_b_id,
      reason: separation.reason,
    },
  });

  revalidatePath('/daep/students');

  return { success: true };
}
```

---

## Validation Schemas

```typescript
// lib/validation/schemas.ts

export const AssignRoomSchema = z.object({
  placement_id: z.string().uuid('Invalid placement ID'),
  room_id: z.string().uuid('Invalid room ID'),
});

export const CreateSeparationSchema = z.object({
  student_a_id: z.string().min(1, 'Student A is required'),
  student_b_id: z.string().min(1, 'Student B is required'),
  reason: z.string().min(5, 'Reason must be at least 5 characters').max(500),
  expires_at: z.string().datetime().nullable().optional(),
}).refine(data => data.student_a_id !== data.student_b_id, {
  message: 'Cannot create separation between same student',
});
```

---

## UI Components

### Room Assignment Dialog

```
/app/daep/components/
├── RoomAssignmentDialog.tsx    # Main dialog for room assignment
├── RoomAvailabilityList.tsx    # List of rooms with availability
└── SeparationWarning.tsx       # Warning banner for blocked rooms
```

**RoomAssignmentDialog Features:**
- Dropdown/list of available rooms
- Show occupancy: "Room 501 - A-Wing (8/15 students)"
- Blocked rooms shown but disabled with reason tooltip
- Separation warning banner if any rooms blocked
- Confirm button with loading state

### Student Separation Management

```
/app/daep/settings/separations/
├── page.tsx                    # List all separations
├── AddSeparationDialog.tsx     # Create new separation
└── SeparationCard.tsx          # Display single separation with remove action
```

Or integrated into student profile:
```
/app/daep/students/[school_id]/
└── SeparationsTab.tsx          # Tab showing student's separations
```

---

## UI Mockup: Room Assignment

```
┌─────────────────────────────────────────────────────┐
│ Assign Room for John Smith                      [X] │
├─────────────────────────────────────────────────────┤
│                                                     │
│ ⚠️ Student has separations with:                    │
│    - Jane Doe (in A-Wing)                          │
│    Reason: Previous altercation                     │
│                                                     │
│ Available Rooms:                                    │
│                                                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │ ○ Room 501 - A-Wing         8/15 students       │ │
│ │   🚫 Blocked: Separation with Jane Doe          │ │
│ └─────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────┐ │
│ │ ● Room 506 - B-Wing         5/15 students   ✓   │ │
│ │   Available                                     │ │
│ └─────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────┐ │
│ │ ○ Room 507 - B-Wing        15/15 students       │ │
│ │   🚫 At capacity                                │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│                      [Cancel]  [Assign to Room 506] │
└─────────────────────────────────────────────────────┘
```

---

## Audit Events

| Event | When | Details |
|-------|------|---------|
| `room.assignment_changed` | Room assigned/changed | previous_room_id, new_room_id, room_number |
| `student.separation_added` | New separation created | student_a_id, student_b_id, reason, expires_at |
| `student.separation_removed` | Separation deactivated | student_a_id, student_b_id, reason |

---

## Edge Cases

1. **Building section not configured:** Rooms without `building_section` don't participate in separation logic
2. **Both students not yet assigned:** Separation has no effect until one is assigned to a room
3. **Expired separations:** Query filters by `expires_at IS NULL OR expires_at > NOW()`
4. **Circular separations:** A→B, B→C, A→C - Each pair checked independently
5. **Room at capacity:** Show as unavailable regardless of separation status
6. **Same building section, different rooms:** Still blocked - separation is at section level

---

## Non-Functional Requirements

### Performance

| Operation | Target | Notes |
|-----------|--------|-------|
| `getAvailableRoomsForStudent` | < 500ms | Typical: 10-20 rooms, 50-100 active placements |
| `assignRoom` | < 300ms | Single update + audit log |
| `getStudentSeparations` | < 200ms | Typical: 0-5 separations per student |
| `createSeparation` | < 300ms | Insert + audit log |
| Room dialog render | < 100ms | After data fetch complete |

### Security

- All queries scoped by `tenant_id` (RLS enforced)
- Separation data visible only to DAEP admins (role check in server actions)
- Audit trail immutable (append-only `admin_audit_log`)

### Reliability

- Separation validation runs server-side (cannot be bypassed by client)
- Database constraints prevent orphaned separations
- Soft delete for separations preserves history

### Observability

- All room assignments logged to `admin_audit_log`
- All separation changes logged with actor, timestamp, before/after
- Failed assignment attempts logged with reason

---

## Risks & Assumptions

### Assumptions

1. Building sections are pre-configured in `daep_rooms` table (Story 1.5 complete)
2. Each room has a defined capacity (default 15)
3. Separations are created by DAEP admins manually (no automated flagging)
4. One student can have multiple active separations with different students

### Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Building sections not configured | Medium | High - separation logic ineffective | Show warning if rooms lack building_section; document in admin guide |
| Complex separation chains (A→B→C→D) | Low | Medium - confusing UX | Display all blocked sections with reasons; limit doesn't apply |
| Concurrent room assignments | Low | Medium - over-capacity | Optimistic locking via `updated_at`; re-validate on submit |
| Expired separations not cleaned up | Low | Low - minor data clutter | Filter by `expires_at` in all queries; background cleanup optional |

### Open Questions

1. **Resolved:** Should separations require approval? → No, admin creates directly
2. **Resolved:** What happens to separation when student completes placement? → Separation remains active (may return)

---

## Dependencies

- Story 2-4 (Create Placement): Room assignment happens after placement created
- `daep_rooms` table with `building_section` populated
- `daep_student_separations` table

---

## Implementation Checklist

### Server Actions (app/actions/daep/rooms.ts)
- [ ] `getAvailableRoomsForStudent` - Full availability check with separation logic
- [ ] `assignRoom` - Validate and assign with audit
- [ ] `getStudentSeparations` - List separations for a student
- [ ] `createSeparation` - Create new separation with validation
- [ ] `removeSeparation` - Soft delete separation

### Validation (lib/validation/schemas.ts)
- [ ] `AssignRoomSchema`
- [ ] `CreateSeparationSchema`

### UI Components
- [ ] `RoomAssignmentDialog` - Room selection with availability
- [ ] `RoomAvailabilityList` - Render room options
- [ ] `SeparationWarning` - Warning banner
- [ ] Separation management UI (settings or student profile)

### Integration Points
- [ ] Add room assignment to intake process (Story 2.5 in epic tech spec)
- [ ] Add separation tab to student profile
- [ ] Add separation management to settings

---

## Test Strategy

### Unit Tests (Server Actions)

| Test ID | AC | Test Case | Expected Result |
|---------|-----|-----------|-----------------|
| T-2.5.1a | 2.5.1 | `getAvailableRoomsForStudent` with rooms at various capacities | Returns rooms with correct `available_spots` |
| T-2.5.1b | 2.5.1 | `getAvailableRoomsForStudent` with room at capacity | `is_available = false` for full room |
| T-2.5.2a | 2.5.2 | `getAvailableRoomsForStudent` occupancy calculation | `current_count` matches active placements |
| T-2.5.3a | 2.5.3 | `getAvailableRoomsForStudent` with separation - other student assigned | Rooms in other student's section blocked |
| T-2.5.3b | 2.5.3 | `getAvailableRoomsForStudent` with separation - neither assigned | All rooms available |
| T-2.5.3c | 2.5.3 | `assignRoom` to blocked section | Returns `{ success: false }` with error |
| T-2.5.4a | 2.5.4 | Blocked room includes separation reason | `blocked_reason` contains student name and reason |
| T-2.5.5a | 2.5.5 | `createSeparation` with valid inputs | Separation created, audit logged |
| T-2.5.5b | 2.5.5 | `createSeparation` with same student IDs | Returns validation error |
| T-2.5.5c | 2.5.5 | `createSeparation` duplicate pair | Returns "already exists" error |
| T-2.5.6a | 2.5.6 | `getAvailableRoomsForStudent` with expired separation | Expired separation ignored |
| T-2.5.6b | 2.5.6 | `getStudentSeparations` filters expired | Only active, non-expired returned |
| T-2.5.7a | 2.5.7 | `assignRoom` creates audit log | `room.assignment_changed` event logged |
| T-2.5.7b | 2.5.7 | `createSeparation` creates audit log | `student.separation_added` event logged |
| T-2.5.7c | 2.5.7 | `removeSeparation` creates audit log | `student.separation_removed` event logged |

### Integration Tests

| Test ID | Scenario | Steps | Expected |
|---------|----------|-------|----------|
| IT-2.5.1 | Full room assignment flow | Create placement → Open dialog → Select room → Assign | Room assigned, placement updated |
| IT-2.5.2 | Separation blocks assignment | Create separation A↔B → Assign A to Room 501 (A-Wing) → Try assign B to Room 502 (A-Wing) | B's assignment blocked |
| IT-2.5.3 | Separation allows different section | Create separation A↔B → Assign A to A-Wing → Assign B to B-Wing | Both assignments succeed |
| IT-2.5.4 | Expired separation no longer blocks | Create separation with past `expires_at` → Try assignment | Assignment succeeds |

### E2E Tests (Playwright)

| Test ID | Flow | Validation |
|---------|------|------------|
| E2E-2.5.1 | Admin assigns room to new placement | Dialog shows availability, assignment persists after refresh |
| E2E-2.5.2 | Admin creates separation | Separation appears in student profile, blocks room assignment |
| E2E-2.5.3 | Admin removes separation | Separation removed, previously blocked rooms now available |
| E2E-2.5.4 | Room capacity display | Occupancy updates when student assigned/removed |

### Manual Test Checklist

- [ ] Blocked rooms show red border and disabled state
- [ ] Separation warning banner appears when rooms are blocked
- [ ] Tooltip on blocked room shows separation reason
- [ ] Room assignment success toast displays
- [ ] Audit log entries visible in admin audit view
- [ ] iPad touch targets are adequate (44x44px minimum)
- [ ] Keyboard navigation works for room selection

---

## UX Compliance (from docs/sessions/ux-design-specification.md)

### Pattern Adherence

| UX Pattern | Implementation |
|------------|----------------|
| Primary Button | Blue filled (`#3B82F6`) for "Assign Room" |
| Secondary Button | White with border for "Cancel" |
| Danger Button | Red for "Remove Separation" with confirmation modal |
| Error Feedback | Inline on blocked rooms + toast on failure |
| Success Feedback | Toast notification (bottom-right) + list refresh |
| Loading State | Skeleton while fetching room availability |
| Touch Targets | 44x44px minimum - room selection tiles |
| Empty States | "No rooms available" message with guidance |
| Confirmations | Modal for separation removal (destructive action) |

### Custom Component: Room Selection

Based on UX spec "Pipeline Stage Card" pattern:
- Card per room with room number, name, section
- Color-coded status indicator:
  - Green border: Available
  - Orange border: At capacity
  - Red border: Blocked by separation
- Shows occupancy (e.g., "8/15 students")
- Disabled state for unavailable rooms with tooltip reason

### Separation Warning Banner

Pattern: System Alert (top banner)
- Orange/amber background
- Icon + message explaining blocked sections
- Lists affected students by name
- Persists until acknowledged

### Accessibility

- [ ] Room cards keyboard selectable (Enter/Space to select)
- [ ] ARIA labels on status indicators ("Available", "Blocked - Separation with Jane Doe")
- [ ] Focus indicators on all interactive elements
- [ ] Color + icon for status (not color alone - accessibility)
- [ ] Screen reader announces room selection confirmation

### iPad Optimization

- Room cards: minimum 88x88px tap area
- Separation warning: full-width banner, dismissible
- Dialog: full-width on tablet viewport
- Touch-friendly radio buttons for room selection
