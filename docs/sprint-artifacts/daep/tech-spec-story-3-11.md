# Tech Spec: Story 3-11 - Attendance Rate Calculations

**Story:** 3-11
**Epic:** 3 - Daily Operations
**Points:** 3
**FR:** FR43
**Dependencies:** Story 3-9 (Attendance Entry), Story 3-10 (Excused/Unexcused)

---

## Overview

Add attendance rate calculations and display throughout the application. This story provides visibility into student attendance patterns, enabling staff to identify at-risk students and take proactive action.

**Key Metrics:**
- **Daily Attendance Rate:** Percentage of periods present for a single day
- **Cumulative Attendance Rate:** Percentage of periods present across entire placement
- **Consecutive Absent Days:** Track for notification triggers (Epic 7)

**Display Locations:**
1. Student profile (CurrentPlacementCard) - cumulative rate with progress indicator
2. Room roster student list - daily rate badge
3. Student list page - cumulative rate column
4. Dashboard KPI (Epic 6 - out of scope, just prep the calculation)

---

## Acceptance Criteria (from Epic File)

| AC | Description | Test |
|----|-------------|------|
| 3.11.1 | Student profile shows daily attendance rate | Profile displays "Today: 100%" or "Today: 80%" |
| 3.11.2 | Student profile shows cumulative attendance rate | Profile displays "Overall: 94%" with progress bar |
| 3.11.3 | Rate = periods present / total periods × 100% | Verify calculation: 8/10 = 80% |
| 3.11.4 | Color coding: green (>90%), yellow (85-90%), red (<85%) | Visual check on badges/progress bars |
| 3.11.5 | Dashboard shows students below 85% threshold | (Epic 6) - Calculation function ready |
| 3.11.6 | Attendance rate visible in student list | Column in room roster & student list |
| 3.11.7 | Three consecutive absent days triggers notification | (Epic 7) - Detection function ready |

---

## Calculation Logic

### ⚠️ IMPORTANT CLARIFICATION (2025-12-07)

The attendance rate is based on **DAYS**, not periods:

```
Rate = Days Present / Total School Days in Placement × 100%
```

**Key Distinctions:**
- **ADA Attendance Period**: ONE designated period per day determines daily attendance (for ADA reporting)
- **Other Periods**: Used for points tracking only, NOT for attendance rate calculation
- The ADA attendance period is **configurable in district settings** (e.g., the period at 9:30 AM)

### Attendance Rate Formula (CORRECTED)

```typescript
// Rate = days present / total school days in placement × 100%
// Only the designated ADA attendance period determines if a day is "present"

interface AttendanceRateResult {
  daysPresent: number;         // Days where ADA period status was P/T/ED or excused (counts_toward)
  daysAbsent: number;          // Days where ADA period status was A (unexcused)
  totalSchoolDays: number;     // Total school days since placement start
  rate: number;                // Percentage (0-100)
  rateCategory: 'green' | 'yellow' | 'red';
  consecutiveAbsentDays: number;  // For notification trigger
}
```

### What Counts as "Present" for a Day

The student's status in the **ADA attendance period** determines the day:

| ADA Period Status | Excused | Counts Toward Days | Day Counted as Present? |
|-------------------|---------|-------------------|-------------------------|
| P | N/A | Yes | ✅ Yes |
| T | N/A | Yes | ✅ Yes |
| ED | N/A | Yes | ✅ Yes |
| A | Yes (Gov't) | Yes | ✅ **Yes** |
| A | Yes (Medical) | No | ❌ No |
| A | No | No | ❌ No |
| A | Pending (null) | No | ❌ No |

**Key Rule:** `counts_toward_days_served = true` means the day counts as "present" for attendance rate.

### ADA Attendance Period Configuration

**New Setting Required:** `ada_attendance_period` in `DistrictDAEPSettingsSchema`

Options:
1. **By Period Name**: Select a specific period (e.g., "Period 1", "Attendance")
2. **By Time**: Specify a time (e.g., "09:30") and use whichever period contains that time

```typescript
// In DistrictDAEPSettingsSchema
ada_attendance_period: z.string().default('Period 1'),
// OR
ada_attendance_time: z.string().regex(/^\d{2}:\d{2}$/).optional(), // "09:30"
```

### Period Purposes

| Period Type | Purpose | Used for Rate? |
|-------------|---------|----------------|
| ADA Attendance Period | Daily attendance for ADA reporting | ✅ Yes |
| Other Periods | Points tracking, behavior monitoring | ❌ No |

### Consecutive Absent Days

Track for notification triggers (Epic 7):
- Count consecutive school days where the ADA period is absent
- Excused absences (Medical/Parent) still count as absent days for this metric
- Only Gov't excused absences (counts_toward = true) break the streak

---

## Implementation Status

### ✅ Current Implementation (v0.3.x)
- UI components built (AttendanceRateBadge, AttendanceRateProgress)
- Rate column in room roster
- Rate display in student profile
- Threshold setting in district settings (85% default)

### 🔄 Needs Update (Story 3-11b)
1. Add `ada_attendance_period` to district settings schema
2. Add period selector to Settings → General
3. Update rate calculation to use only the designated ADA period
4. Update rate calculation to count days, not periods

---

## Database

### Existing Tables (No Changes Required)

The `daep_attendance` table already has all required fields:

```sql
-- Fields used for rate calculation:
- status           -- 'P', 'A', 'T', 'ED'
- excused          -- true/false/null
- counts_toward_days_served  -- true/false
- date             -- Date of attendance
- period           -- Period name
```

### Computed Metrics (Not Stored)

Attendance rates are calculated on-demand, not stored:
- Avoids data staleness
- Simplifies data model
- Query is efficient with proper indexes

**Caching Strategy:** Server-side memoization within request lifecycle. No persistent cache needed.

---

## Server Actions

### New Functions in `app/actions/daep/attendance.ts`

```typescript
// ============================================================================
// ATTENDANCE RATE CALCULATIONS (Story 3-11)
// ============================================================================

export interface AttendanceRateResult {
  periodsPresent: number;
  periodsAbsent: number;
  totalPeriods: number;
  rate: number;
  rateCategory: 'green' | 'yellow' | 'red';
}

export interface DailyAttendanceRate extends AttendanceRateResult {
  date: string;
}

export interface CumulativeAttendanceRate extends AttendanceRateResult {
  startDate: string;
  endDate: string;
  daysWithAttendance: number;
  consecutiveAbsentDays: number;
}

export interface StudentAttendanceRates {
  daily: DailyAttendanceRate | null;  // Today's rate
  cumulative: CumulativeAttendanceRate;
}

/**
 * Get attendance rate for a single day.
 */
export async function getDailyAttendanceRate(
  placementId: string,
  date: string
): Promise<DailyAttendanceRate | null>

/**
 * Get cumulative attendance rate for entire placement.
 */
export async function getCumulativeAttendanceRate(
  placementId: string
): Promise<CumulativeAttendanceRate>

/**
 * Get both daily and cumulative rates for student profile.
 */
export async function getStudentAttendanceRates(
  placementId: string,
  date?: string
): Promise<StudentAttendanceRates>

/**
 * Get attendance rates for all students in a room (for roster display).
 * Efficient batch query instead of N+1.
 */
export async function getRoomAttendanceRates(
  roomId: string,
  date: string
): Promise<Map<string, AttendanceRateResult>>

/**
 * Get students below attendance threshold.
 * Used by dashboard (Epic 6) and notifications (Epic 7).
 */
export async function getStudentsBelowAttendanceThreshold(
  threshold?: number  // Default 85
): Promise<Array<{
  placement_id: string;
  school_id: string;
  student_name: string;
  attendance_rate: number;
  consecutive_absent_days: number;
}>>

/**
 * Get consecutive absent days for a placement.
 * Used for notification triggers (Epic 7).
 */
export async function getConsecutiveAbsentDays(
  placementId: string
): Promise<number>
```

### Implementation Details

#### `getCumulativeAttendanceRate()`

```typescript
export async function getCumulativeAttendanceRate(
  placementId: string
): Promise<CumulativeAttendanceRate> {
  const tenantId = await getTenantId();
  const supabase = await createServerClient();

  // Get placement date range
  const { data: placement } = await supabase
    .from('daep_placements')
    .select('start_date, expected_end_date')
    .eq('id', placementId)
    .eq('tenant_id', tenantId)
    .single();

  if (!placement) {
    throw new Error('Placement not found');
  }

  // Get all attendance records for this placement
  const { data: attendance } = await supabase
    .from('daep_attendance')
    .select('date, period, status, counts_toward_days_served')
    .eq('tenant_id', tenantId)
    .eq('placement_id', placementId)
    .order('date', { ascending: true });

  // Count periods
  let periodsPresent = 0;
  let totalPeriods = 0;

  (attendance || []).forEach((record) => {
    totalPeriods++;
    // Present = P/T/ED OR (A with counts_toward_days_served = true)
    if (
      record.status !== 'A' ||
      record.counts_toward_days_served === true
    ) {
      periodsPresent++;
    }
  });

  const periodsAbsent = totalPeriods - periodsPresent;
  const rate = totalPeriods > 0 ? (periodsPresent / totalPeriods) * 100 : 100;

  // Calculate consecutive absent days
  const consecutiveAbsentDays = calculateConsecutiveAbsentDays(attendance || []);

  // Get unique days with attendance
  const uniqueDates = new Set((attendance || []).map((a) => a.date));

  return {
    periodsPresent,
    periodsAbsent,
    totalPeriods,
    rate: Math.round(rate * 10) / 10, // Round to 1 decimal
    rateCategory: getRateCategory(rate),
    startDate: placement.start_date,
    endDate: new Date().toISOString().split('T')[0], // Today
    daysWithAttendance: uniqueDates.size,
    consecutiveAbsentDays,
  };
}

function getRateCategory(rate: number): 'green' | 'yellow' | 'red' {
  if (rate > 90) return 'green';
  if (rate >= 85) return 'yellow';
  return 'red';
}

function calculateConsecutiveAbsentDays(
  attendance: Array<{ date: string; status: string; counts_toward_days_served: boolean }>
): number {
  // Group by date
  const byDate = new Map<string, boolean>();

  attendance.forEach((record) => {
    const wasPresent = record.status !== 'A' || record.counts_toward_days_served;
    const current = byDate.get(record.date);

    // A day is "present" if ANY period was present
    if (current === undefined) {
      byDate.set(record.date, wasPresent);
    } else if (wasPresent) {
      byDate.set(record.date, true);
    }
  });

  // Sort dates descending (most recent first)
  const sortedDates = Array.from(byDate.entries())
    .sort((a, b) => b[0].localeCompare(a[0]));

  // Count consecutive absent days from today backwards
  let consecutive = 0;
  for (const [, wasPresent] of sortedDates) {
    if (wasPresent) break;
    consecutive++;
  }

  return consecutive;
}
```

#### `getRoomAttendanceRates()` (Batch Query)

```typescript
export async function getRoomAttendanceRates(
  roomId: string,
  date: string
): Promise<Map<string, AttendanceRateResult>> {
  const tenantId = await getTenantId();
  const supabase = await createServerClient();

  // Get all placements for this room
  const { data: placements } = await supabase
    .from('daep_placements')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('assigned_room_id', roomId)
    .in('status', ['pending', 'active']);

  if (!placements || placements.length === 0) {
    return new Map();
  }

  const placementIds = placements.map((p) => p.id);

  // Get attendance for this date for all placements
  const { data: attendance } = await supabase
    .from('daep_attendance')
    .select('placement_id, status, counts_toward_days_served')
    .eq('tenant_id', tenantId)
    .eq('date', date)
    .in('placement_id', placementIds);

  // Group by placement and calculate rates
  const resultMap = new Map<string, AttendanceRateResult>();

  // Group attendance by placement
  const byPlacement = new Map<string, typeof attendance>();
  (attendance || []).forEach((record) => {
    const existing = byPlacement.get(record.placement_id) || [];
    existing.push(record);
    byPlacement.set(record.placement_id, existing);
  });

  // Calculate rate for each placement
  placementIds.forEach((placementId) => {
    const records = byPlacement.get(placementId) || [];
    const totalPeriods = records.length;

    if (totalPeriods === 0) {
      // No attendance taken yet
      resultMap.set(placementId, {
        periodsPresent: 0,
        periodsAbsent: 0,
        totalPeriods: 0,
        rate: 0,
        rateCategory: 'green', // Default to green when no data
      });
      return;
    }

    let periodsPresent = 0;
    records.forEach((record) => {
      if (record.status !== 'A' || record.counts_toward_days_served) {
        periodsPresent++;
      }
    });

    const periodsAbsent = totalPeriods - periodsPresent;
    const rate = (periodsPresent / totalPeriods) * 100;

    resultMap.set(placementId, {
      periodsPresent,
      periodsAbsent,
      totalPeriods,
      rate: Math.round(rate * 10) / 10,
      rateCategory: getRateCategory(rate),
    });
  });

  return resultMap;
}
```

---

## UI Components

### 1. AttendanceRateBadge (Reusable)

**File:** `components/daep/roster/AttendanceRateBadge.tsx`

```typescript
interface AttendanceRateBadgeProps {
  rate: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;  // Show "Attendance" label
}

/**
 * Color-coded badge showing attendance rate.
 * - Green: >90%
 * - Yellow: 85-90%
 * - Red: <85%
 */
export function AttendanceRateBadge({
  rate,
  size = 'md',
  showLabel = false,
}: AttendanceRateBadgeProps) {
  const category = getRateCategory(rate);
  const colors = {
    green: 'bg-green-100 text-green-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    red: 'bg-red-100 text-red-800',
  };

  return (
    <span className={cn(
      'inline-flex items-center rounded font-medium',
      colors[category],
      size === 'sm' && 'px-1.5 py-0.5 text-xs',
      size === 'md' && 'px-2 py-1 text-sm',
      size === 'lg' && 'px-2.5 py-1.5 text-base',
    )}>
      {showLabel && <span className="mr-1">Attendance:</span>}
      {rate.toFixed(0)}%
    </span>
  );
}
```

### 2. AttendanceRateProgress (For Student Profile)

**File:** `components/daep/shared/AttendanceRateProgress.tsx`

```typescript
interface AttendanceRateProgressProps {
  dailyRate?: number | null;
  cumulativeRate: number;
  cumulativeData: {
    periodsPresent: number;
    totalPeriods: number;
    daysWithAttendance: number;
  };
  threshold?: number;  // Default 85
}

/**
 * Visual progress bar showing attendance rate.
 * Shows daily + cumulative rates with threshold marker.
 */
export function AttendanceRateProgress({
  dailyRate,
  cumulativeRate,
  cumulativeData,
  threshold = 85,
}: AttendanceRateProgressProps) {
  const category = getRateCategory(cumulativeRate);
  const progressColors = {
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
  };

  return (
    <div className="space-y-2">
      {/* Header with rates */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Attendance</span>
        <div className="flex items-center gap-3">
          {dailyRate !== null && dailyRate !== undefined && (
            <span className="text-xs text-muted-foreground">
              Today: <AttendanceRateBadge rate={dailyRate} size="sm" />
            </span>
          )}
          <span className="font-medium">
            Overall: <AttendanceRateBadge rate={cumulativeRate} />
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn('h-full transition-all', progressColors[category])}
          style={{ width: `${Math.min(cumulativeRate, 100)}%` }}
        />
        {/* Threshold marker */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-muted-foreground/50"
          style={{ left: `${threshold}%` }}
          title={`${threshold}% threshold`}
        />
      </div>

      {/* Stats */}
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>
          {cumulativeData.periodsPresent} / {cumulativeData.totalPeriods} periods
        </span>
        <span>
          {cumulativeData.daysWithAttendance} days tracked
        </span>
      </div>
    </div>
  );
}
```

### 3. Update CurrentPlacementCard

**File:** `components/daep/CurrentPlacementCard.tsx`

Add attendance rate display below the progress bar:

```typescript
// Add to Props interface
interface Props {
  // ... existing props
  attendanceRates?: {
    daily: DailyAttendanceRate | null;
    cumulative: CumulativeAttendanceRate;
  };
}

// In the component, after Progress section:
{/* Attendance Rate - Story 3-11 */}
{attendanceRates && (
  <AttendanceRateProgress
    dailyRate={attendanceRates.daily?.rate ?? null}
    cumulativeRate={attendanceRates.cumulative.rate}
    cumulativeData={{
      periodsPresent: attendanceRates.cumulative.periodsPresent,
      totalPeriods: attendanceRates.cumulative.totalPeriods,
      daysWithAttendance: attendanceRates.cumulative.daysWithAttendance,
    }}
  />
)}

{/* Warning for consecutive absences - show at 3+ days */}
{attendanceRates?.cumulative.consecutiveAbsentDays >= 3 && (
  <Alert className="bg-amber-50 border-amber-200">
    <AlertTriangle className="h-4 w-4 text-amber-600" />
    <AlertDescription className="text-amber-800">
      {attendanceRates.cumulative.consecutiveAbsentDays} consecutive absent days
    </AlertDescription>
  </Alert>
)}
```

### 4. Update Room Roster Table

**File:** `components/daep/roster/RoomRosterTable.tsx`

Add attendance rate column:

```typescript
// Add to column definitions
const columns = [
  // ... existing columns ...
  {
    id: 'attendance_rate',
    header: 'Rate',
    cell: ({ row }) => {
      const rateData = attendanceRates?.get(row.placement_id);
      if (!rateData || rateData.totalPeriods === 0) {
        return <span className="text-muted-foreground text-xs">—</span>;
      }
      return <AttendanceRateBadge rate={rateData.rate} size="sm" />;
    },
  },
  // ... remaining columns ...
];
```

### 5. Update RoomRosterContext

**File:** `components/daep/roster/RoomRosterContext.tsx`

Add attendance rates to context:

```typescript
interface RoomRosterContextValue {
  // ... existing ...

  // Story 3-11: Attendance Rates
  attendanceRates: Map<string, AttendanceRateResult>;
  refreshAttendanceRates: () => Promise<void>;
}

// Add to provider props
interface RoomRosterProviderProps {
  // ... existing ...
  onAttendanceRatesRefresh?: (roomId: string, date: string) => Promise<Map<string, AttendanceRateResult>>;
}

// Add to provider state
const [attendanceRates, setAttendanceRates] = useState<Map<string, AttendanceRateResult>>(new Map());

// Add refresh function
const refreshAttendanceRates = useCallback(async () => {
  if (!roomId || !onAttendanceRatesRefresh) return;

  try {
    const rates = await onAttendanceRatesRefresh(roomId, date);
    setAttendanceRates(rates);
  } catch (err) {
    console.error('Failed to refresh attendance rates:', err);
  }
}, [roomId, date, onAttendanceRatesRefresh]);

// Add to initializeFromData
const initializeFromData = useCallback((
  data: RoomRosterResult,
  rooms: RoomWithCount[],
  categories?: BehaviorCategory[],
  points?: Map<string, DailyPointsSummary>,
  attendanceData?: Map<string, AttendanceEntry>,
  statusTypes?: AttendanceStatusType[],
  rates?: Map<string, AttendanceRateResult>  // NEW
) => {
  // ... existing ...
  if (rates) {
    setAttendanceRates(rates);
  }
}, []);
```

---

## Update Student Profile Page

**File:** `app/daep/(main)/students/[school_id]/page.tsx`

```typescript
// Add import
import { getStudentAttendanceRates } from '@/app/actions/daep/attendance';

// In the component, fetch attendance rates
let attendanceRates: Awaited<ReturnType<typeof getStudentAttendanceRates>> | null = null;

if (profile.currentPlacement) {
  try {
    const [rulesResult, achievementsResult, pointsResult, attendanceResult] = await Promise.all([
      getMilestoneRules(),
      getStudentMilestones(profile.currentPlacement.id),
      getCumulativePoints(profile.currentPlacement.id),
      getStudentAttendanceRates(profile.currentPlacement.id),  // NEW
    ]);
    milestoneRules = rulesResult;
    milestoneAchievements = achievementsResult;
    cumulativePoints = pointsResult;
    attendanceRates = attendanceResult;  // NEW
  } catch (error) {
    console.error('Error fetching placement data:', error);
  }
}

// Pass to CurrentPlacementCard
<CurrentPlacementCard
  placement={profile.currentPlacement}
  schoolId={school_id}
  studentName={`${profile.student.first_name} ${profile.student.last_name}`}
  milestoneRules={milestoneRules}
  milestoneAchievements={milestoneAchievements}
  cumulativePoints={cumulativePoints || undefined}
  attendanceRates={attendanceRates || undefined}  // NEW
/>
```

---

## Update Room Roster Page

**File:** `app/daep/(main)/rooms/[roomId]/page.tsx`

```typescript
// Add import
import { getRoomAttendanceRates } from '@/app/actions/daep/attendance';

// In the component, fetch attendance rates
const attendanceRatesPromise = getRoomAttendanceRates(roomId, date);

// Resolve with other data
const [rosterResult, attendanceRates] = await Promise.all([
  getRoomRoster(...),
  attendanceRatesPromise,
]);

// Pass to provider/context initialization
initializeFromData(
  rosterResult,
  accessibleRooms,
  behaviorCategories,
  dailyPoints,
  attendance,
  statusTypes,
  attendanceRates  // NEW
);
```

---

## Threshold Configuration (Settings) - INCLUDED IN SCOPE

### Add to District Settings

**File:** `app/daep/(main)/settings/page.tsx` (General tab)

Add attendance threshold setting:

```typescript
// In the settings form
<FormField
  control={form.control}
  name="attendance_threshold"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Attendance Alert Threshold</FormLabel>
      <FormDescription>
        Students below this percentage will be flagged for attention.
      </FormDescription>
      <FormControl>
        <Input
          type="number"
          min={50}
          max={100}
          {...field}
          onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

**Default:** 85%

**Storage:** Add to `daep_district_settings` JSONB field:
```typescript
{
  // ... existing settings
  attendance_threshold: 85  // Default 85%
}
```

### Fetch Threshold

```typescript
async function getAttendanceThreshold(): Promise<number> {
  const settings = await getDistrictDAEPSettings();
  return settings?.attendance_threshold ?? 85;
}
```

---

## File Changes Summary

### New Files

```
components/daep/roster/AttendanceRateBadge.tsx
components/daep/shared/AttendanceRateProgress.tsx
```

### Modified Files

```
app/actions/daep/attendance.ts           # Add rate calculation functions
lib/validation/schemas.ts                # Add AttendanceRateResult types
components/daep/CurrentPlacementCard.tsx # Add attendance rate display
components/daep/roster/RoomRosterTable.tsx # Add rate column
components/daep/roster/RoomRosterContext.tsx # Add rates to context
app/daep/(main)/students/[school_id]/page.tsx # Fetch rates for profile
app/daep/(main)/rooms/[roomId]/page.tsx  # Fetch rates for roster
components/daep/roster/index.ts          # Export new components
```

---

## Tasks / Subtasks

### Task 1: Server Actions - Rate Calculations (AC: 3.11.1-3.11.3, 3.11.5, 3.11.7)

- [ ] 1.1 Add `AttendanceRateResult` interface to `lib/validation/schemas.ts`
- [ ] 1.2 Implement `getDailyAttendanceRate()` in `attendance.ts`
- [ ] 1.3 Implement `getCumulativeAttendanceRate()` in `attendance.ts`
- [ ] 1.4 Implement `getStudentAttendanceRates()` - combined function for profile
- [ ] 1.5 Implement `getRoomAttendanceRates()` - batch query for roster
- [ ] 1.6 Implement `getConsecutiveAbsentDays()` - for notification prep
- [ ] 1.7 Implement `getStudentsBelowAttendanceThreshold()` - for dashboard prep
- [ ] 1.8 Add `getRateCategory()` helper function

### Task 2: UI Components (AC: 3.11.4)

- [ ] 2.1 Create `AttendanceRateBadge.tsx` component
- [ ] 2.2 Create `AttendanceRateProgress.tsx` component
- [ ] 2.3 Add color coding (green >90%, yellow 85-90%, red <85%)
- [ ] 2.4 Add threshold marker to progress bar

### Task 3: Student Profile Integration (AC: 3.11.1, 3.11.2)

- [ ] 3.1 Update `CurrentPlacementCard` props to accept attendance rates
- [ ] 3.2 Add `AttendanceRateProgress` component to card
- [ ] 3.3 Add consecutive absence warning alert
- [ ] 3.4 Update student profile page to fetch rates
- [ ] 3.5 Pass rates to `CurrentPlacementCard`

### Task 4: Room Roster Integration (AC: 3.11.6)

- [ ] 4.1 Update `RoomRosterContext` with attendance rates state
- [ ] 4.2 Add `attendanceRates` to context value
- [ ] 4.3 Add refresh function to context
- [ ] 4.4 Update `initializeFromData` to accept rates
- [ ] 4.5 Update room roster page to fetch rates
- [ ] 4.6 Add Rate column to `RoomRosterTable`
- [ ] 4.7 Show `AttendanceRateBadge` in rate column

### Task 5: Threshold Settings (Required)

- [ ] 5.1 Add `attendance_threshold` to `DistrictDAEPSettingsSchema` in schemas.ts
- [ ] 5.2 Add threshold input to General settings tab in `/daep/settings`
- [ ] 5.3 Create `getAttendanceThreshold()` helper function
- [ ] 5.4 Use threshold in `getStudentsBelowAttendanceThreshold()`
- [ ] 5.5 Use threshold in `AttendanceRateProgress` component for marker position

### Task 6: Testing

- [ ] 6.1 TypeScript compilation passes
- [ ] 6.2 Test daily rate calculation (manual verification)
- [ ] 6.3 Test cumulative rate calculation
- [ ] 6.4 Test color coding thresholds
- [ ] 6.5 Test consecutive absent day counter
- [ ] 6.6 Test profile display
- [ ] 6.7 Test roster rate column
- [ ] 6.8 Playwright MCP verification

---

## Edge Cases

### 1. No Attendance Records

When a student has no attendance records:
- Daily rate: `null` (not 0 or 100)
- Cumulative rate: 100% (assume perfect until proven otherwise)
- Display: Show "—" or "No data" instead of percentage

### 2. Partial Day Attendance

When only some periods have attendance:
- Calculate rate based on periods WITH records
- Don't assume missing periods are absent
- This matches real-world behavior (staff taking attendance period by period)

### 3. Mid-Placement Start

When student started mid-week:
- Only count days from actual start date
- Don't penalize for days before they arrived

### 4. Excused Absences with Points

Gov't excused absences (`counts_toward_days_served = true`):
- Count as "present" for rate calculation
- This prevents court appearances from hurting attendance rate

### 5. Rate Rounding

Round to 1 decimal place for display:
- `94.44444%` → `94.4%`
- Badge shows `94%` (whole number)
- Progress shows exact value

---

## Future Enhancements (Backlog)

| Enhancement | Epic | Notes |
|-------------|------|-------|
| Dashboard KPI card | Epic 6 | "Students Below 85%" clickable card |
| 3-day absence notification | Epic 7 | Auto-trigger when `consecutiveAbsentDays >= 3` |
| Attendance trend chart | Epic 6 | Week-over-week trend visualization |
| Export attendance report | Epic 6 | CSV/PDF export with rates |

---

## Testing Checklist

### Rate Calculation
- [ ] P counts as present
- [ ] T counts as present
- [ ] ED counts as present
- [ ] A (unexcused) counts as absent
- [ ] A (excused, counts_toward=true) counts as present
- [ ] A (excused, counts_toward=false) counts as absent
- [ ] A (pending, excused=null) counts as absent

### Color Coding
- [ ] 95% → green badge
- [ ] 90.1% → green badge
- [ ] 90% → yellow badge
- [ ] 85% → yellow badge
- [ ] 84.9% → red badge
- [ ] 50% → red badge

### Consecutive Absent Days
- [ ] 1 absent day → shows 1
- [ ] 2 absent days → shows 2, warning alert
- [ ] Present day breaks streak → resets to 0
- [ ] Gov't excused (counts_toward=true) breaks streak

### Display Locations
- [ ] Student profile shows daily + cumulative
- [ ] Room roster shows daily rate badge
- [ ] Progress bar has threshold marker at 85%

---

## Patterns to Reuse

| Pattern | Source | Usage |
|---------|--------|-------|
| Badge styling | `AttendanceStatusBadge.tsx` | Color-coded badges |
| Progress bar | `ToggleableProgressBar.tsx` | Rate progress display |
| Batch query | `getRoomAttendance()` | Efficient multi-student fetch |
| Context updates | `RoomRosterContext.tsx` | State management |
| Alert styling | `CurrentPlacementCard.tsx` | Warning alerts |

---

## Success Metrics

After Story 3-11 is complete:
- Staff can see attendance rates at a glance in the roster
- Student profile clearly shows daily and cumulative rates
- Color coding instantly highlights at-risk students
- Consecutive absence tracking ready for notification triggers
- Calculation functions ready for dashboard KPIs

---

_Tech Spec Version: 1.0_
_Created: 2025-12-07_
_Story: 3-11 Attendance Rate Calculations_
_Author: Claude (AI Assistant)_
