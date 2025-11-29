# Technical Specification: Stories 2-2, 2-3, 2-10

**Date:** 2025-11-28
**Author:** Amelia (Dev Agent), Revised by Bob (SM)
**Epic:** 2 - Placement Management
**Status:** Ready for Dev

> ⚠️ **Theme Requirement:** All UI components must follow the [Theme & Styling Guidelines](./tech-spec-epic-2-part1.md#theme--styling-guidelines). Never hardcode colors - use `bg-card`, `bg-muted`, `text-muted-foreground`, and DAEP CSS variables.

---

## Overview

This document provides technical specifications for three related Epic 2 stories that work together to deliver the student profile experience:

| Story | Name | Points | FRs |
|-------|------|--------|-----|
| 2-2 | Student Profile Page with Demographics | 3 | FR9, FR14, FR16 |
| 2-3 | TrespassTracker Status Display | 2 | FR15, FR76 |
| 2-10 | Prevent Duplicate Active Placements | 1 | FR24 |

**Total Points:** 6

**Recommended Implementation Order:** 2-10 → 2-2 → 2-3

- Story 2-10 adds validation logic reusable by placement creation (Story 2-4)
- Story 2-2 creates the profile page foundation
- Story 2-3 adds TrespassTracker section to the profile

### Navigation Integration

**StudentListTable → Profile Page:**

The existing `StudentListTable` component (`components/daep/StudentListTable.tsx`) should navigate to the new profile page when a student row is clicked:

```tsx
// In StudentListTable.tsx - add row click handler
import { useRouter } from 'next/navigation';

const router = useRouter();

// In DataTable row props or onClick:
onClick={() => router.push(`/daep/students/${student.school_id}`)}
```

---

## Story 2-2: Student Profile Page with Demographics

### Goal

Create a comprehensive student profile page at `/daep/students/[school_id]` displaying demographics, current placement status, and placement history.

### Data Sources

| Data | Source Table | Join Path |
|------|--------------|-----------|
| Demographics | `trespass_records` | Direct query by `school_id` |
| Current Placement | `daep_placements` | `WHERE status IN ('pending', 'active', 'transition', 'inactive', 'closed')` |
| Placement History | `daep_placements` | All placements for student |
| Room | `daep_rooms` | via `assigned_room_id` FK |
| Home Campus | `campuses` | via `home_campus_id` FK |
| Discipline Code | `daep_discipline_codes` | via `offense_code` |

### Data Model

```typescript
// app/actions/daep/students.ts - ADD these types

export interface StudentProfile {
  // Demographics (from trespass_records)
  school_id: string;
  first_name: string;
  last_name: string;
  middle_name: string | null;
  date_of_birth: string | null;
  grade_level: number | null;
  current_school: string | null;

  // Contact info
  guardian_name: string | null;
  guardian_phone: string | null;
  parent_email: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;

  // Special flags
  is_student: boolean;
  is_daep: boolean;
  special_education: boolean;
  plan_504: boolean;
  ell_status: boolean;

  // Photo (future)
  photo_url: string | null;
}

export interface PlacementDetail {
  id: string;
  incident_number: string;
  placement_date: string;
  start_date: string;
  days_assigned: number;
  days_served: number;
  days_remaining: number;
  expected_end_date: string | null;
  actual_end_date: string | null;
  status: PlacementStatus;
  offense_code: string;
  offense_label: string | null;
  placement_reason: string;
  mandatory_placement: boolean;

  // Relations
  home_campus: { id: string; name: string } | null;
  assigned_room: { id: string; room_number: string; room_name: string | null } | null;

  // Transition info
  transition_requested_date: string | null;
  transition_meeting_date: string | null;
  first_day_back_date: string | null;
  // Note: transition_complete is derived: status === 'complete' && first_day_back_date !== null

  // Flags
  rollover_student: boolean;
  no_show: boolean;
  assessment_90day_required: boolean;
  assessment_90day_date: string | null;

  // Notes
  intake_notes: string | null;
  completion_notes: string | null;

  created_at: string;
}

export interface StudentProfileResult {
  student: StudentProfile;
  currentPlacement: PlacementDetail | null;
  placementHistory: PlacementDetail[];
}
```

### Input Validation (Zod)

```typescript
// lib/validation/schemas.ts - ADD these schemas

import { z } from 'zod';

export const GetStudentProfileSchema = z.object({
  schoolId: z.string().min(1, 'Student ID is required'),
});

export const CheckActivePlacementSchema = z.object({
  schoolId: z.string().min(1, 'Student ID is required'),
  excludePlacementId: z.string().uuid().optional(),
});

export const ValidatePlacementSchema = z.object({
  schoolId: z.string().min(1, 'Student ID is required'),
  incidentNumber: z.string().min(1, 'Incident number is required'),
  excludePlacementId: z.string().uuid().optional(),
});
```

### Server Actions

```typescript
// app/actions/daep/students.ts - ADD these functions

import { GetStudentProfileSchema } from '@/lib/validation/schemas';

/**
 * Get complete student profile with demographics, current placement, and history
 * FR9: View student profiles with demographics
 * FR14: Display current placement status
 * FR16: View placement history
 */
export async function getStudentProfile(schoolId: string): Promise<StudentProfileResult> {
  // Validate input
  const parsed = GetStudentProfileSchema.safeParse({ schoolId });
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0].message);
  }
  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  // 1. Get student demographics from trespass_records
  const { data: student, error: studentError } = await supabase
    .from('trespass_records')
    .select(`
      school_id,
      first_name,
      last_name,
      middle_name,
      date_of_birth,
      grade_level,
      current_school,
      guardian_name,
      guardian_phone,
      parent_email,
      emergency_contact_name,
      emergency_contact_phone,
      address,
      city,
      state,
      zip,
      is_student,
      is_daep,
      special_education,
      plan_504,
      ell_status
    `)
    .eq('tenant_id', tenantId)
    .eq('school_id', schoolId)
    .single();

  if (studentError || !student) {
    throw new Error('Student not found');
  }

  // 2. Get all placements for this student
  const { data: placements, error: placementsError } = await supabase
    .from('daep_placements')
    .select(`
      id,
      incident_number,
      placement_date,
      start_date,
      days_assigned,
      days_served,
      days_remaining,
      expected_end_date,
      actual_end_date,
      status,
      offense_code,
      placement_reason,
      mandatory_placement,
      home_campus_id,
      assigned_room_id,
      transition_requested_date,
      transition_meeting_date,
      first_day_back_date,
      rollover_student,
      no_show,
      assessment_90day_required,
      assessment_90day_date,
      intake_notes,
      completion_notes,
      created_at,
      home_campus:campuses!fk_daep_placements_home_campus(id, name),
      assigned_room:daep_rooms(id, room_number, room_name)
    `)
    .eq('tenant_id', tenantId)
    .eq('school_id', schoolId)
    .order('start_date', { ascending: false });

  if (placementsError) {
    throw new Error('Failed to fetch placements');
  }

  // 3. Get discipline code labels for all offense codes
  const offenseCodes = [...new Set(placements?.map(p => p.offense_code) || [])];
  const { data: codes } = await supabase
    .from('daep_discipline_codes')
    .select('code, label')
    .eq('tenant_id', tenantId)
    .in('code', offenseCodes);

  const codeMap = new Map(codes?.map(c => [c.code, c.label]) || []);

  // 4. Transform placements
  const extractRelation = <T>(rel: T | T[] | null): T | null => {
    if (Array.isArray(rel)) return rel[0] || null;
    return rel;
  };

  const transformedPlacements: PlacementDetail[] = (placements || []).map(p => ({
    id: p.id,
    incident_number: p.incident_number,
    placement_date: p.placement_date,
    start_date: p.start_date,
    days_assigned: p.days_assigned,
    days_served: p.days_served,
    days_remaining: p.days_remaining,
    expected_end_date: p.expected_end_date,
    actual_end_date: p.actual_end_date,
    status: p.status as PlacementStatus,
    offense_code: p.offense_code,
    offense_label: codeMap.get(p.offense_code) || null,
    placement_reason: p.placement_reason,
    mandatory_placement: p.mandatory_placement,
    home_campus: extractRelation(p.home_campus) as PlacementDetail['home_campus'],
    assigned_room: extractRelation(p.assigned_room) as PlacementDetail['assigned_room'],
    transition_requested_date: p.transition_requested_date,
    transition_meeting_date: p.transition_meeting_date,
    first_day_back_date: p.first_day_back_date,
    rollover_student: p.rollover_student,
    no_show: p.no_show,
    assessment_90day_required: p.assessment_90day_required,
    assessment_90day_date: p.assessment_90day_date,
    intake_notes: p.intake_notes,
    completion_notes: p.completion_notes,
    created_at: p.created_at,
  }));

  // 5. Identify current placement (first non-complete)
  const currentPlacement = transformedPlacements.find(
    p => ['pending', 'active', 'transition'].includes(p.status)
  ) || null;

  // 6. History is all placements (including current for display in history tab)
  const placementHistory = transformedPlacements;

  return {
    student: {
      ...student,
      photo_url: null, // Future: photo storage
    },
    currentPlacement,
    placementHistory,
  };
}
```

### UI Components

#### Route Structure

```
app/daep/(main)/students/[school_id]/
├── page.tsx              # Profile page (server component)
├── loading.tsx           # Loading skeleton
└── not-found.tsx         # 404 handling
```

> **Note:** Uses `(main)` route group to inherit DAEP theme provider from `app/daep/(main)/layout.tsx`.

#### Loading State (loading.tsx)

```tsx
// app/daep/(main)/students/[school_id]/loading.tsx

import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function StudentProfileLoading() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>

      {/* Content grid skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="space-y-6">
          <Card>
            <CardHeader><Skeleton className="h-5 w-24" /></CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
            <CardContent><Skeleton className="h-20 w-full" /></CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-8 w-full" /> {/* Progress bar */}
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>
          <Skeleton className="h-64 w-full" /> {/* History table */}
        </div>
      </div>
    </div>
  );
}
```

#### Not Found State (not-found.tsx)

```tsx
// app/daep/(main)/students/[school_id]/not-found.tsx

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { UserX } from 'lucide-react';

export default function StudentNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
      <UserX className="h-16 w-16 text-muted-foreground mb-4" />
      <h2 className="text-2xl font-semibold mb-2">Student Not Found</h2>
      <p className="text-muted-foreground mb-6">
        The student you're looking for doesn't exist or you don't have access.
      </p>
      <Link href="/daep/students">
        <Button>Back to Student List</Button>
      </Link>
    </div>
  );
}
```

#### Page Component

```tsx
// app/daep/(main)/students/[school_id]/page.tsx

import { getStudentProfile } from '@/app/actions/daep/students';
import { notFound } from 'next/navigation';
import { StudentProfileHeader } from '@/components/daep/StudentProfileHeader';
import { StudentDemographicsCard } from '@/components/daep/StudentDemographicsCard';
import { CurrentPlacementCard } from '@/components/daep/CurrentPlacementCard';
import { PlacementHistoryTable } from '@/components/daep/PlacementHistoryTable';
import { TrespassTrackerStatus } from '@/components/daep/TrespassTrackerStatus'; // Story 2-3
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Props {
  params: { school_id: string };
}

export default async function StudentProfilePage({ params }: Props) {
  const { school_id } = await params;

  try {
    const profile = await getStudentProfile(school_id);

    return (
      <div className="space-y-6">
        {/* Header: Photo, Name, ID, Grade, Home Campus */}
        <StudentProfileHeader student={profile.student} />

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column: Demographics + TT Status */}
          <div className="space-y-6">
            <StudentDemographicsCard student={profile.student} />
            <TrespassTrackerStatus schoolId={school_id} /> {/* Story 2-3 */}
          </div>

          {/* Right column (2 cols wide): Placement info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Current Placement Card */}
            {profile.currentPlacement ? (
              <CurrentPlacementCard placement={profile.currentPlacement} />
            ) : (
              <div className="p-6 border rounded-lg bg-muted/50">
                <p className="text-muted-foreground">No active placement</p>
              </div>
            )}

            {/* Tabs: History, Activity */}
            <Tabs defaultValue="history">
              <TabsList>
                <TabsTrigger value="history">Placement History</TabsTrigger>
                <TabsTrigger value="activity">Activity Timeline</TabsTrigger>
              </TabsList>

              <TabsContent value="history">
                <PlacementHistoryTable placements={profile.placementHistory} />
              </TabsContent>

              <TabsContent value="activity">
                <div className="p-4 text-muted-foreground">
                  Activity timeline coming in Epic 4 (Story 4.5)
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    notFound();
  }
}
```

#### Component Specifications

**StudentProfileHeader**
```
components/daep/StudentProfileHeader.tsx
- Avatar placeholder with initials (photo_url future)
- Full name: "{first_name} {middle_name?} {last_name}"
- Student ID badge
- Grade level badge
- Special flags row: IEP, 504, ELL as colored badges
- Quick actions: "Edit Placement", "Add Note" buttons
```

**StudentDemographicsCard**
```
components/daep/StudentDemographicsCard.tsx
- Card with "Demographics" heading
- DOB with calculated age
- Guardian/Parent section: name, phone, email
- Emergency contact section
- Address (if present)
- Collapsible "Show More" for less common fields
```

**CurrentPlacementCard**
```
components/daep/CurrentPlacementCard.tsx
- Status badge prominently displayed (Pending/Active/Transition)
- Days progress: "{days_served} of {days_assigned} days ({days_remaining} remaining)"
- Progress bar visualization
- Offense code + label
- Home campus
- Assigned room
- Key dates: start_date, expected_end_date
- 90-day assessment alert (if required and not completed)
- Action button: "Edit Placement" (links to Story 2-8)
```

**PlacementHistoryTable**
```
components/daep/PlacementHistoryTable.tsx
- DataTable with columns:
  - Incident # (link to detail)
  - Start Date
  - Days (assigned/served)
  - Offense Code + Label
  - Status badge
  - Outcome (complete/no-show/rollover)
- Sort by start_date descending
- Click row to expand details inline OR navigate to placement detail
```

### Acceptance Criteria

| AC# | Criteria | Testable Assertion |
|-----|----------|-------------------|
| 2.2.1 | Profile page at `/daep/students/[school_id]` (via `(main)` route group) | URL renders student data |
| 2.2.2 | Header shows photo placeholder, name, ID, grade, home campus | All fields display correctly |
| 2.2.3 | Demographics section shows DOB, guardian, emergency contact, address | Card renders with available data |
| 2.2.4 | Special flags (IEP, 504, ELL) displayed as badges | Flags conditionally render |
| 2.2.5 | Current placement card shows status, days, progress bar | Placement data displays |
| 2.2.6 | No active placement shows appropriate message | Empty state renders |
| 2.2.7 | Placement history tab shows all past placements | History table populated |
| 2.2.8 | Quick actions: Edit Placement, Add Note buttons visible | Buttons present (link to future stories) |
| 2.2.9 | Non-existent student shows 404 | `not-found.tsx` renders |

---

## Story 2-3: TrespassTracker Status Display

### Goal

Display TrespassTracker status on the DAEP student profile, showing whether the student has trespass records and their current status.

### Data Sources

| Data | Source Table | Query |
|------|--------------|-------|
| Trespass status | `trespass_records` | Fields: `is_daep`, `daep_expiration_date`, `status`, `expiration_date` |
| Trespass record count | `trespass_records` | Count where `school_id` matches |

### Server Action

```typescript
// app/actions/daep/students.ts - ADD this function

export interface TrespassTrackerStatusResult {
  hasRecord: boolean;
  recordCount: number;
  isDAEP: boolean;
  daepExpirationDate: string | null;
  trespassStatus: 'active' | 'inactive' | 'expired' | null;
  trespassExpirationDate: string | null;
  mostRecentIncident: {
    id: string;
    description: string | null;
    incident_date: string | null;
    created_at: string;
  } | null;
}

/**
 * Get TrespassTracker status for a student
 * FR15: Show TrespassTracker status for students with active trespass records
 * FR76: View TT status from DAEP profile
 */
export async function getTrespassTrackerStatus(schoolId: string): Promise<TrespassTrackerStatusResult> {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  // Get all trespass records for student
  const { data: records, error } = await supabase
    .from('trespass_records')
    .select(`
      id,
      is_daep,
      daep_expiration_date,
      status,
      expiration_date,
      description,
      incident_date,
      created_at
    `)
    .eq('tenant_id', tenantId)
    .eq('school_id', schoolId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error('Failed to fetch TrespassTracker status');
  }

  if (!records || records.length === 0) {
    return {
      hasRecord: false,
      recordCount: 0,
      isDAEP: false,
      daepExpirationDate: null,
      trespassStatus: null,
      trespassExpirationDate: null,
      mostRecentIncident: null,
    };
  }

  // Most recent record
  const latest = records[0];

  return {
    hasRecord: true,
    recordCount: records.length,
    isDAEP: latest.is_daep || false,
    daepExpirationDate: latest.daep_expiration_date,
    trespassStatus: latest.status as 'active' | 'inactive' | 'expired',
    trespassExpirationDate: latest.expiration_date,
    mostRecentIncident: {
      id: latest.id,
      description: latest.description,
      incident_date: latest.incident_date,
      created_at: latest.created_at,
    },
  };
}
```

### UI Component

```tsx
// components/daep/TrespassTrackerStatus.tsx

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ExternalLink, Shield, ShieldOff } from 'lucide-react';
import { getTrespassTrackerStatus, type TrespassTrackerStatusResult } from '@/app/actions/daep/students';
import { format } from 'date-fns';
import Link from 'next/link';

interface Props {
  schoolId: string;
}

export function TrespassTrackerStatus({ schoolId }: Props) {
  const [status, setStatus] = useState<TrespassTrackerStatusResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStatus() {
      try {
        const result = await getTrespassTrackerStatus(schoolId);
        setStatus(result);
      } catch (error) {
        console.error('Failed to fetch TT status:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchStatus();
  }, [schoolId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">TrespassTracker Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse h-20 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  if (!status?.hasRecord) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <ShieldOff className="w-4 h-4 text-muted-foreground" />
            TrespassTracker Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No TrespassTracker records found for this student
          </p>
        </CardContent>
      </Card>
    );
  }

  // Theme-compliant status colors using semantic classes
  const statusColors = {
    active: 'bg-destructive/10 text-destructive border-destructive/20',
    inactive: 'bg-muted text-muted-foreground border-border',
    expired: 'bg-warning/10 text-warning-foreground border-warning/20',
  };

  return (
    <Card className={status.trespassStatus === 'active' ? 'border-destructive/50' : ''}>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Shield className={`w-4 h-4 ${status.trespassStatus === 'active' ? 'text-destructive' : 'text-muted-foreground'}`} />
          TrespassTracker Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Warning banner for active trespass - uses theme-compliant destructive colors */}
        {status.trespassStatus === 'active' && (
          <div className="flex items-center gap-2 p-2 bg-destructive/10 border border-destructive/20 rounded-md">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            <span className="text-sm text-destructive font-medium">Active Trespass Record</span>
          </div>
        )}

        {/* Status badges */}
        <div className="flex flex-wrap gap-2">
          {status.trespassStatus && (
            <Badge variant="outline" className={statusColors[status.trespassStatus]}>
              TT: {status.trespassStatus.charAt(0).toUpperCase() + status.trespassStatus.slice(1)}
            </Badge>
          )}
          {status.isDAEP && (
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
              DAEP Flagged
            </Badge>
          )}
          <Badge variant="secondary">
            {status.recordCount} Record{status.recordCount !== 1 ? 's' : ''}
          </Badge>
        </div>

        {/* Expiration dates */}
        <div className="text-sm space-y-1">
          {status.trespassExpirationDate && (
            <p>
              <span className="text-muted-foreground">TT Expires:</span>{' '}
              {format(new Date(status.trespassExpirationDate), 'MMM d, yyyy')}
            </p>
          )}
          {status.daepExpirationDate && (
            <p>
              <span className="text-muted-foreground">DAEP Expires:</span>{' '}
              {format(new Date(status.daepExpirationDate), 'MMM d, yyyy')}
            </p>
          )}
        </div>

        {/* Most recent incident */}
        {status.mostRecentIncident && (
          <div className="text-sm">
            <p className="text-muted-foreground">Most Recent Incident:</p>
            <p className="truncate">
              {status.mostRecentIncident.incident_date
                ? format(new Date(status.mostRecentIncident.incident_date), 'MMM d, yyyy')
                : format(new Date(status.mostRecentIncident.created_at), 'MMM d, yyyy')}
            </p>
          </div>
        )}

        {/* View in TrespassTracker link */}
        {status.mostRecentIncident && (
          <Link href={`/trespass/${status.mostRecentIncident.id}`} passHref>
            <Button variant="outline" size="sm" className="w-full">
              <ExternalLink className="w-4 h-4 mr-2" />
              View in TrespassTracker
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
```

### Module Access Check

The component should respect `module_access`. If user has `daep_only`, hide the "View in TrespassTracker" link.

> **DEV NOTE:** Verify `useUser` hook exists at `@/hooks/useUser` and exposes `moduleAccess`. If not, create it or use existing auth context pattern from `@/contexts/AuthContext` or Clerk's `useUser`.

```tsx
// Add to component:
import { useUser } from '@/hooks/useUser'; // Verify this hook exists and has moduleAccess

// Inside component:
const { moduleAccess } = useUser();
const canViewTT = moduleAccess === 'both' || moduleAccess === 'trespass_only';

// Conditionally render link:
{canViewTT && status.mostRecentIncident && (
  <Link href={`/trespass/${status.mostRecentIncident.id}`}>...</Link>
)}
```

### Acceptance Criteria

| AC# | Criteria | Testable Assertion |
|-----|----------|-------------------|
| 2.3.1 | TrespassTracker Status section visible on student profile | Card renders on profile page |
| 2.3.2 | Shows "No records found" if student has no TT records | Empty state displays |
| 2.3.3 | Displays is_daep flag status | DAEP badge shows when true |
| 2.3.4 | Displays daep_expiration_date | Date formatted and visible |
| 2.3.5 | Shows record count | Badge shows total records |
| 2.3.6 | Shows most recent incident date | Date displayed |
| 2.3.7 | Warning banner if TT status is active | Red banner visible |
| 2.3.8 | "View in TrespassTracker" link present | Link navigates to TT detail |
| 2.3.9 | Link hidden if user has `daep_only` module access | Conditional rendering works |

---

## Story 2-10: Prevent Duplicate Active Placements

### Goal

Ensure data integrity by preventing creation of duplicate active placements for the same student. A student can have multiple placements with different incident numbers (recidivism), but cannot have multiple concurrent active/pending/transition placements.

### Validation Rules

1. **Same student + same incident_number:** Always blocked (unique constraint)
2. **Same student + different incident_number + active status:** Blocked via application logic
3. **Same student + different incident_number + complete status:** Allowed (recidivism tracking)

### Database Constraint

Already exists from Epic 1a migration:
```sql
UNIQUE(tenant_id, school_id, incident_number)
```

### Server Action Validation

```typescript
// app/actions/daep/placements.ts - ADD this validation function

/**
 * Check if a student has an active placement
 * FR24: Prevent duplicate active placements
 */
export async function checkActivePlacement(
  schoolId: string,
  excludePlacementId?: string
): Promise<{
  hasActive: boolean;
  activePlacement: {
    id: string;
    incident_number: string;
    status: PlacementStatus;
    start_date: string;
  } | null;
}> {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  let query = supabase
    .from('daep_placements')
    .select('id, incident_number, status, start_date')
    .eq('tenant_id', tenantId)
    .eq('school_id', schoolId)
    .in('status', ['pending', 'active', 'transition']);

  // Exclude current placement when editing
  if (excludePlacementId) {
    query = query.neq('id', excludePlacementId);
  }

  const { data, error } = await query.limit(1).single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
    throw new Error('Failed to check active placements');
  }

  if (data) {
    return {
      hasActive: true,
      activePlacement: {
        id: data.id,
        incident_number: data.incident_number,
        status: data.status as PlacementStatus,
        start_date: data.start_date,
      },
    };
  }

  return { hasActive: false, activePlacement: null };
}

/**
 * Validate placement creation/update
 * Called before insert or status change
 */
export async function validatePlacement(
  schoolId: string,
  incidentNumber: string,
  excludePlacementId?: string
): Promise<{ valid: boolean; error?: string }> {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  // Check 1: Duplicate incident number
  let incidentQuery = supabase
    .from('daep_placements')
    .select('id, incident_number')
    .eq('tenant_id', tenantId)
    .eq('school_id', schoolId)
    .eq('incident_number', incidentNumber);

  // Only exclude current placement if editing (avoids matching all when undefined)
  if (excludePlacementId) {
    incidentQuery = incidentQuery.neq('id', excludePlacementId);
  }

  const { data: existingIncident } = await incidentQuery.single();

  if (existingIncident) {
    return {
      valid: false,
      error: `Placement with incident #${incidentNumber} already exists for this student`,
    };
  }

  // Check 2: Active placement exists
  const { hasActive, activePlacement } = await checkActivePlacement(schoolId, excludePlacementId);

  if (hasActive && activePlacement) {
    return {
      valid: false,
      error: `Student already has an active placement (Incident #${activePlacement.incident_number}, Status: ${activePlacement.status})`,
    };
  }

  return { valid: true };
}
```

### Integration with Placement Creation

Story 2-4 (Create Placement) will call `validatePlacement()` before insert:

```typescript
// In createPlacement() - Story 2-4
export async function createPlacement(input: CreatePlacementInput): Promise<{ success: boolean; error?: string; placement?: PlacementDetail }> {
  // ... validation ...

  // Check for duplicates
  const validation = await validatePlacement(input.school_id, input.incident_number);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  // ... create placement ...
}
```

### UI Validation Component

```tsx
// components/daep/ActivePlacementWarning.tsx

'use client';

import { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { checkActivePlacement } from '@/app/actions/daep/placements';
import Link from 'next/link';

interface Props {
  schoolId: string;
  excludePlacementId?: string;
}

export function ActivePlacementWarning({ schoolId, excludePlacementId }: Props) {
  const [activePlacement, setActivePlacement] = useState<{
    id: string;
    incident_number: string;
    status: string;
  } | null>(null);

  useEffect(() => {
    async function check() {
      try {
        const result = await checkActivePlacement(schoolId, excludePlacementId);
        if (result.hasActive) {
          setActivePlacement(result.activePlacement);
        }
      } catch (error) {
        // Silent fail - validation will catch at submit
      }
    }
    if (schoolId) check();
  }, [schoolId, excludePlacementId]);

  if (!activePlacement) return null;

  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Active Placement Exists</AlertTitle>
      <AlertDescription>
        This student already has an active placement (Incident #{activePlacement.incident_number},
        Status: {activePlacement.status}).{' '}
        <Link href={`/daep/students/${schoolId}`} className="underline">
          View student profile
        </Link>
        {' '}to manage the existing placement before creating a new one.
      </AlertDescription>
    </Alert>
  );
}
```

### Acceptance Criteria

| AC# | Criteria | Testable Assertion |
|-----|----------|-------------------|
| 2.10.1 | Creating placement for student with active placement fails | Error returned, placement not created |
| 2.10.2 | Error message includes incident number of existing placement | Message contains "#{incident_number}" |
| 2.10.3 | Database constraint blocks duplicate incident numbers | Unique constraint error caught |
| 2.10.4 | Multiple placements allowed with different incident numbers if previous are complete | Recidivism placements succeed |
| 2.10.5 | Completed placements don't block new placements | Status check excludes 'complete' |
| 2.10.6 | UI warning displays when selecting student with active placement | Warning component renders |

---

## Shared Dependencies

### Existing Components to Reuse

| Component | Location | Used By |
|-----------|----------|---------|
| DataTable | `@/components/ui/data-table` | 2-2 |
| Card | `@/components/ui/card` | 2-2, 2-3 |
| Badge | `@/components/ui/badge` | 2-2, 2-3 |
| Tabs | `@/components/ui/tabs` | 2-2 |
| Alert | `@/components/ui/alert` | 2-10 |
| Button | `@/components/ui/button` | All |

### New Components to Create

| Component | Path | Story |
|-----------|------|-------|
| StudentProfileHeader | `components/daep/StudentProfileHeader.tsx` | 2-2 |
| StudentDemographicsCard | `components/daep/StudentDemographicsCard.tsx` | 2-2 |
| CurrentPlacementCard | `components/daep/CurrentPlacementCard.tsx` | 2-2 |
| PlacementHistoryTable | `components/daep/PlacementHistoryTable.tsx` | 2-2 |
| TrespassTrackerStatus | `components/daep/TrespassTrackerStatus.tsx` | 2-3 |
| ActivePlacementWarning | `components/daep/ActivePlacementWarning.tsx` | 2-10 |

### Server Actions Summary

| Action | File | Story |
|--------|------|-------|
| `getStudentProfile()` | `app/actions/daep/students.ts` | 2-2 |
| `getTrespassTrackerStatus()` | `app/actions/daep/students.ts` | 2-3 |
| `checkActivePlacement()` | `app/actions/daep/placements.ts` | 2-10 |
| `validatePlacement()` | `app/actions/daep/placements.ts` | 2-10 |

---

## Test Strategy

### Unit Tests

| Test | Story | Assertion |
|------|-------|-----------|
| `getStudentProfile` returns demographics | 2-2 | All student fields populated |
| `getStudentProfile` handles missing student | 2-2 | Throws "Student not found" |
| `getStudentProfile` includes placement history | 2-2 | Array of past placements returned |
| `getTrespassTrackerStatus` returns empty for no records | 2-3 | `hasRecord: false` |
| `getTrespassTrackerStatus` returns status for existing records | 2-3 | All fields populated |
| `checkActivePlacement` finds active placement | 2-10 | `hasActive: true` |
| `checkActivePlacement` excludes specified ID | 2-10 | Self-reference ignored |
| `validatePlacement` blocks duplicate incident | 2-10 | `valid: false`, error message |
| `validatePlacement` blocks concurrent active | 2-10 | `valid: false`, error message |

### E2E Tests

| Test | Story | Steps |
|------|-------|-------|
| Navigate to student profile | 2-2 | Click student row → Profile page loads |
| View demographics | 2-2 | Verify DOB, guardian, contact visible |
| View placement history | 2-2 | Click History tab → Placements listed |
| View TT status | 2-3 | TT card shows status badges |
| TT link navigation | 2-3 | Click "View in TT" → TT detail page |
| Duplicate placement error | 2-10 | Create placement for student with active → Error shown |

---

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Student not in trespass_records | Medium | High | Handle gracefully, show "Student not found" |
| Large placement history | Low | Low | Paginate history table if >50 records |
| Module access check missing | Medium | Medium | Verify `module_access` in useUser hook exists |
| TT link 404 if record deleted | Low | Low | Link includes error boundary |

---

*Tech Spec generated by Dev Agent (Amelia)*
*SM Review by Bob - 2025-11-28*
*Last updated: 2025-11-28*
