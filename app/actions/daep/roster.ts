'use server';

/**
 * Room Roster Server Actions
 *
 * Story 3-1: Room Roster View
 * Provides data for the room roster page including student lists,
 * points totals, and attendance status.
 */

import { createServerClient } from '@/lib/supabase/server';
import { currentUser } from '@clerk/nextjs/server';
import { getTenantId } from '@/lib/tenant';
import { type PlacementStatus, type BellSchedulePeriod } from '@/lib/validation/schemas';
import {
  getScheduleForDate,
  getPeriodsForDate,
  getCurrentPeriod,
  getDefaultPeriodForDate,
  getTodayDateString,
  type CurrentPeriodResult,
} from '@/lib/daep/bell-schedule';

// ========== TYPES ==========

export interface RoomWithCount {
  id: string;
  room_number: string;
  room_name: string | null;
  capacity: number;
  active: boolean;
  room_group_id: string | null;
  room_group?: { id: string; group_name: string; color: string } | null;
  student_count: number;
}

export interface RosterStudent {
  placement_id: string;
  school_id: string;
  first_name: string;
  last_name: string;
  grade_level: number | null;
  days_remaining: number | null;
  status: PlacementStatus;
  today_points_total: number;
  attendance_status: string | null;
}

export interface RoomRosterResult {
  room: {
    id: string;
    room_number: string;
    room_name: string | null;
    capacity: number;
  };
  students: RosterStudent[];
  date: string;
  period: BellSchedulePeriod | null;
  periodIndex: number;
  periods: BellSchedulePeriod[];
  scheduleName: string | null;
  isSchoolDay: boolean;
  dayType: string | null;
  currentPeriodInfo: CurrentPeriodResult | null;
}

export interface RoomAccessCheckResult {
  canAccess: boolean;
  reason?: string;
  userRole?: string;
}

// ========== HELPER: Check DAEP Access ==========

interface DAEPAccessInfo {
  userId: string;
  role: string;
  tenantId: string;
  hasAccess: boolean;
}

async function checkDAEPAccess(): Promise<DAEPAccessInfo> {
  const user = await currentUser();
  if (!user) throw new Error('Unauthorized');

  const supabase = await createServerClient();
  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('role, tenant_id, active_tenant_id')
    .eq('id', user.id)
    .single();

  if (error || !profile) {
    throw new Error('User profile not found');
  }

  const effectiveTenantId = profile.active_tenant_id || profile.tenant_id;
  if (!effectiveTenantId) {
    throw new Error('No tenant assigned');
  }

  // DAEP roles that can view rosters
  const daepRoles = [
    'super_admin',
    'district_admin',
    'daep_admin_l1',
    'daep_admin_l2',
    'daep_staff',
  ];

  return {
    userId: user.id,
    role: profile.role,
    tenantId: effectiveTenantId,
    hasAccess: daepRoles.includes(profile.role),
  };
}

// ========== GET USER ACCESSIBLE ROOMS ==========

/**
 * Get rooms the current user can access
 * Birdville Model: All DAEP staff see ALL rooms (teachers rotate, students stay)
 * Includes student count for each room (Quick Win #3)
 */
export async function getUserAccessibleRooms(): Promise<RoomWithCount[]> {
  const { tenantId, hasAccess } = await checkDAEPAccess();

  if (!hasAccess) {
    return [];
  }

  const supabase = await createServerClient();

  // Get all active rooms with room group info
  const { data: rooms, error } = await supabase
    .from('daep_rooms')
    .select(`
      id,
      room_number,
      room_name,
      capacity,
      active,
      room_group_id,
      room_group:daep_room_groups(id, group_name, color)
    `)
    .eq('tenant_id', tenantId)
    .eq('active', true)
    .order('room_number');

  if (error) {
    console.error('Error fetching rooms:', error);
    throw new Error('Failed to fetch rooms');
  }

  if (!rooms || rooms.length === 0) {
    return [];
  }

  // Get student counts per room (active placements only)
  const { data: counts } = await supabase
    .from('daep_placements')
    .select('assigned_room_id')
    .eq('tenant_id', tenantId)
    .in('status', ['pending', 'active'])
    .not('assigned_room_id', 'is', null);

  // Build count map
  const countMap = new Map<string, number>();
  (counts || []).forEach((p) => {
    if (p.assigned_room_id) {
      countMap.set(p.assigned_room_id, (countMap.get(p.assigned_room_id) || 0) + 1);
    }
  });

  // Helper to extract single relation from Supabase array result
  const extractRelation = <T>(rel: T | T[] | null): T | null => {
    if (Array.isArray(rel)) return rel[0] || null;
    return rel;
  };

  return rooms.map((room) => ({
    id: room.id,
    room_number: room.room_number,
    room_name: room.room_name,
    capacity: room.capacity,
    active: room.active,
    room_group_id: room.room_group_id,
    room_group: extractRelation(room.room_group) as RoomWithCount['room_group'],
    student_count: countMap.get(room.id) || 0,
  }));
}

// ========== CAN ACCESS ROOM ==========

/**
 * Check if current user can access a specific room
 * Birdville Model: All DAEP staff can access all rooms
 */
export async function canAccessRoom(roomId: string): Promise<RoomAccessCheckResult> {
  const { tenantId, role, hasAccess } = await checkDAEPAccess();

  if (!hasAccess) {
    return {
      canAccess: false,
      reason: 'User does not have DAEP access',
      userRole: role,
    };
  }

  const supabase = await createServerClient();

  // Verify room exists and belongs to tenant
  const { data: room, error } = await supabase
    .from('daep_rooms')
    .select('id, active')
    .eq('id', roomId)
    .eq('tenant_id', tenantId)
    .single();

  if (error || !room) {
    return {
      canAccess: false,
      reason: 'Room not found',
      userRole: role,
    };
  }

  if (!room.active) {
    return {
      canAccess: false,
      reason: 'Room is inactive',
      userRole: role,
    };
  }

  // Birdville Model: All DAEP roles can access all rooms
  return {
    canAccess: true,
    userRole: role,
  };
}

// ========== GET ROOM ROSTER ==========

/**
 * Get the roster for a specific room, date, and period
 * Main data fetch for the room roster view
 */
export async function getRoomRoster(
  roomId: string,
  date?: string,
  periodNumber?: number
): Promise<RoomRosterResult> {
  const { tenantId, hasAccess } = await checkDAEPAccess();

  if (!hasAccess) {
    throw new Error('Access denied');
  }

  const supabase = await createServerClient();

  // Default to today if no date provided
  const targetDate = date || getTodayDateString();

  // Get room info
  const { data: room, error: roomError } = await supabase
    .from('daep_rooms')
    .select('id, room_number, room_name, capacity')
    .eq('id', roomId)
    .eq('tenant_id', tenantId)
    .single();

  if (roomError || !room) {
    throw new Error('Room not found');
  }

  // Get schedule and periods for the date
  const scheduleResult = await getScheduleForDate(targetDate);
  const periods = scheduleResult.schedule?.periods ?? [];

  // Determine the selected period
  let selectedPeriod: BellSchedulePeriod | null = null;
  let periodIndex = -1;

  if (periods.length > 0) {
    if (periodNumber !== undefined) {
      // Find period by index
      periodIndex = periodNumber;
      selectedPeriod = periods[periodIndex] ?? null;
    } else {
      // Use default period (current if today, first otherwise)
      selectedPeriod = await getDefaultPeriodForDate(targetDate);
      periodIndex = periods.findIndex(
        (p) => p.period_name === selectedPeriod?.period_name
      );
    }
  }

  // Get current period info (for real-time status)
  const today = getTodayDateString();
  const currentPeriodInfo = targetDate === today ? getCurrentPeriod(periods) : null;

  // Fetch students assigned to this room
  const { data: placements, error: placementsError } = await supabase
    .from('daep_placements')
    .select(`
      id,
      school_id,
      days_remaining,
      status
    `)
    .eq('tenant_id', tenantId)
    .eq('assigned_room_id', roomId)
    .in('status', ['pending', 'active']);

  if (placementsError) {
    console.error('Error fetching placements:', placementsError);
    throw new Error('Failed to fetch placements');
  }

  if (!placements || placements.length === 0) {
    return {
      room: {
        id: room.id,
        room_number: room.room_number,
        room_name: room.room_name,
        capacity: room.capacity,
      },
      students: [],
      date: targetDate,
      period: selectedPeriod,
      periodIndex,
      periods,
      scheduleName: scheduleResult.schedule?.schedule_name ?? null,
      isSchoolDay: scheduleResult.isSchoolDay,
      dayType: scheduleResult.dayType,
      currentPeriodInfo,
    };
  }

  // Get student info from trespass_records
  const schoolIds = placements.map((p) => p.school_id);
  const { data: students, error: studentsError } = await supabase
    .from('trespass_records')
    .select('school_id, first_name, last_name, grade_level')
    .eq('tenant_id', tenantId)
    .in('school_id', schoolIds);

  if (studentsError) {
    console.error('Error fetching students:', studentsError);
    throw new Error('Failed to fetch student info');
  }

  // Get today's points totals
  const placementIds = placements.map((p) => p.id);
  const { data: pointsData } = await supabase
    .from('daep_daily_points')
    .select('placement_id, points_earned')
    .eq('tenant_id', tenantId)
    .eq('date', targetDate)
    .in('placement_id', placementIds);

  // Aggregate points by placement
  const pointsMap = new Map<string, number>();
  (pointsData || []).forEach((p) => {
    pointsMap.set(
      p.placement_id,
      (pointsMap.get(p.placement_id) || 0) + (p.points_earned || 0)
    );
  });

  // Get attendance for selected period
  const { data: attendanceData } = await supabase
    .from('daep_attendance')
    .select('placement_id, status')
    .eq('tenant_id', tenantId)
    .eq('date', targetDate)
    .eq('period', selectedPeriod?.period_name ?? '')
    .in('placement_id', placementIds);

  // Build attendance map
  const attendanceMap = new Map<string, string>();
  (attendanceData || []).forEach((a) => {
    attendanceMap.set(a.placement_id, a.status);
  });

  // Build student lookup
  const studentMap = new Map(
    (students || []).map((s) => [s.school_id, s])
  );

  // Combine all data
  const rosterStudents: RosterStudent[] = placements.map((p) => {
    const student = studentMap.get(p.school_id);
    return {
      placement_id: p.id,
      school_id: p.school_id,
      first_name: student?.first_name ?? 'Unknown',
      last_name: student?.last_name ?? 'Student',
      grade_level: student?.grade_level ?? null,
      days_remaining: p.days_remaining,
      status: p.status as PlacementStatus,
      today_points_total: pointsMap.get(p.id) || 0,
      attendance_status: attendanceMap.get(p.id) ?? null,
    };
  });

  // Sort by last name, first name
  rosterStudents.sort((a, b) => {
    const lastCompare = a.last_name.localeCompare(b.last_name);
    if (lastCompare !== 0) return lastCompare;
    return a.first_name.localeCompare(b.first_name);
  });

  return {
    room: {
      id: room.id,
      room_number: room.room_number,
      room_name: room.room_name,
      capacity: room.capacity,
    },
    students: rosterStudents,
    date: targetDate,
    period: selectedPeriod,
    periodIndex,
    periods,
    scheduleName: scheduleResult.schedule?.schedule_name ?? null,
    isSchoolDay: scheduleResult.isSchoolDay,
    dayType: scheduleResult.dayType,
    currentPeriodInfo,
  };
}

// ========== GET ROOM INFO ==========

/**
 * Get basic room info for a specific room
 */
export async function getRoomInfo(roomId: string): Promise<{
  id: string;
  room_number: string;
  room_name: string | null;
  capacity: number;
  active: boolean;
} | null> {
  const tenantId = await getTenantId();
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('daep_rooms')
    .select('id, room_number, room_name, capacity, active')
    .eq('id', roomId)
    .eq('tenant_id', tenantId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error('Failed to fetch room');
  }

  return data;
}
