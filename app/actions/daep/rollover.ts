'use server';

/**
 * Rollover Student Handling Server Actions
 * Story 2-11: FR25 - Rollover students who won't complete DAEP before EOY
 *
 * Security: RLS handles access control at database level (role-based policies)
 */

import { createServerClient } from '@/lib/supabase/server';
import { currentUser } from '@clerk/nextjs/server';
import { logAuditEvent } from '@/lib/audit-logger';
import { revalidatePath } from 'next/cache';
import { getTenantId } from '@/lib/tenant';
import {
  RolloverDecisionSchema,
  type RolloverDecisionInput,
  type RolloverDecision,
  CreateRolloverPlacementSchema,
  type CreateRolloverPlacementInput,
  ApproveRolloverPlacementSchema,
  type ApproveRolloverPlacementInput,
} from '@/lib/validation/schemas';

// Re-export types for use by components
export type { RolloverDecision, RolloverDecisionInput };

import {
  getSchoolDaysRemaining,
  isLastMonthOfSchoolYear,
  getLastSchoolDay,
} from '@/lib/daep/days-remaining';

// ========== TYPES ==========

export interface RolloverCandidate {
  placement_id: string;
  student_id: string;
  student_name: string;
  grade_level: number | null;
  home_campus_id: string;
  home_campus_name: string;
  incident_number: string;
  days_assigned: number;
  days_served: number;
  days_remaining: number;
  expected_end_date: string | null;
  start_date: string;
  offense_code: string | null;
  current_decision: RolloverDecision | null;
  decision_date: string | null;
  decision_by: string | null;
}

export interface RolloverDecisionRecord {
  id: string;
  placement_id: string;
  decision: RolloverDecision;
  days_remaining: number;
  decided_by: string;
  decided_at: string;
  notes: string | null;
}

export interface PendingRolloverPlacement {
  placement_id: string;
  student_id: string;
  student_name: string;
  home_campus_name: string;
  original_incident_number: string;
  days_remaining: number;
  created_at: string;
  created_by_name: string | null;
}

// ========== GET ROLLOVER CANDIDATES (AC 2.11.1, 2.11.7, 2.11.8) ==========

export interface GetRolloverCandidatesResult {
  candidates: RolloverCandidate[];
  schoolDaysRemaining: number | null;
  lastSchoolDay: string | null;
  error?: string;
}

/**
 * Get students whose days_remaining exceeds remaining school days
 * AC 2.11.1: Report listing students who won't complete before EOY
 * AC 2.11.7: DAEP admins see all students (via RLS)
 * AC 2.11.8: Home campus admins see only their campus students (via RLS)
 */
export async function getRolloverCandidates(
  homeCampusFilter?: string
): Promise<GetRolloverCandidatesResult> {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  try {
    // Get school calendar info
    const schoolDaysRemaining = await getSchoolDaysRemaining(tenantId);
    const lastSchoolDay = await getLastSchoolDay(tenantId);

    if (schoolDaysRemaining === null) {
      return {
        candidates: [],
        schoolDaysRemaining: null,
        lastSchoolDay: null,
        error: 'School calendar not configured. Please set up the school calendar first.',
      };
    }

    // Build query for active/pending placements where days_remaining > schoolDaysRemaining
    // RLS handles role-based filtering
    let query = supabase
      .from('daep_placements')
      .select(`
        id,
        school_id,
        incident_number,
        days_assigned,
        days_served,
        days_remaining,
        expected_end_date,
        start_date,
        offense_code,
        rollover_student,
        rollover_decision,
        home_campus_id,
        home_campus:campuses!fk_daep_placements_home_campus(id, name)
      `)
      .eq('tenant_id', tenantId)
      .in('status', ['pending', 'active', 'met'])
      .gt('days_remaining', schoolDaysRemaining);

    // Optional campus filter for DAEP admin view
    if (homeCampusFilter) {
      query = query.eq('home_campus_id', homeCampusFilter);
    }

    const { data: placements, error: placementError } = await query;

    if (placementError) {
      console.error('[Rollover] Error fetching candidates:', placementError);
      return {
        candidates: [],
        schoolDaysRemaining,
        lastSchoolDay,
        error: 'Failed to fetch rollover candidates',
      };
    }

    if (!placements || placements.length === 0) {
      return { candidates: [], schoolDaysRemaining, lastSchoolDay };
    }

    // Get student names
    const schoolIds = placements.map(p => p.school_id);
    const { data: students } = await supabase
      .from('trespass_records')
      .select('school_id, first_name, last_name, grade_level')
      .eq('tenant_id', tenantId)
      .in('school_id', schoolIds);

    const studentMap = new Map(
      students?.map(s => [s.school_id, s]) || []
    );

    // Get latest decision info for each placement
    const placementIds = placements.map(p => p.id);
    const { data: decisions } = await supabase
      .from('daep_rollover_decisions')
      .select('placement_id, decision, decided_at, decided_by')
      .eq('tenant_id', tenantId)
      .in('placement_id', placementIds)
      .order('decided_at', { ascending: false });

    // Map latest decision per placement
    const decisionMap = new Map<string, { decision: RolloverDecision; decided_at: string; decided_by: string }>();
    for (const d of decisions || []) {
      if (!decisionMap.has(d.placement_id)) {
        decisionMap.set(d.placement_id, {
          decision: d.decision as RolloverDecision,
          decided_at: d.decided_at,
          decided_by: d.decided_by,
        });
      }
    }

    // Build candidates list
    const candidates: RolloverCandidate[] = placements.map(p => {
      const student = studentMap.get(p.school_id);
      const latestDecision = decisionMap.get(p.id);
      const homeCampusRaw = p.home_campus as { id: string; name: string } | { id: string; name: string }[] | null;
      const homeCampus = Array.isArray(homeCampusRaw) ? homeCampusRaw[0] : homeCampusRaw;

      return {
        placement_id: p.id,
        student_id: p.school_id,
        student_name: student
          ? `${student.first_name} ${student.last_name}`
          : `Student ${p.school_id}`,
        grade_level: student?.grade_level || null,
        home_campus_id: p.home_campus_id,
        home_campus_name: homeCampus?.name || 'Unknown Campus',
        incident_number: p.incident_number,
        days_assigned: p.days_assigned,
        days_served: p.days_served || 0,
        days_remaining: p.days_remaining || 0,
        expected_end_date: p.expected_end_date,
        start_date: p.start_date,
        offense_code: p.offense_code,
        current_decision: (p.rollover_decision as RolloverDecision) || latestDecision?.decision || null,
        decision_date: latestDecision?.decided_at || null,
        decision_by: latestDecision?.decided_by || null,
      };
    });

    // Sort by days_remaining descending (most urgent first)
    candidates.sort((a, b) => b.days_remaining - a.days_remaining);

    // Update rollover_student flag on placements that are now candidates
    const candidateIds = candidates.map(c => c.placement_id);
    if (candidateIds.length > 0) {
      await supabase
        .from('daep_placements')
        .update({ rollover_student: true })
        .eq('tenant_id', tenantId)
        .in('id', candidateIds);
    }

    return { candidates, schoolDaysRemaining, lastSchoolDay };
  } catch (err) {
    console.error('[Rollover] Error in getRolloverCandidates:', err);
    return {
      candidates: [],
      schoolDaysRemaining: null,
      lastSchoolDay: null,
      error: err instanceof Error ? err.message : 'An unexpected error occurred',
    };
  }
}

// ========== RECORD ROLLOVER DECISION (AC 2.11.2, 2.11.3, 2.11.5) ==========

export interface RecordRolloverDecisionResult {
  success: boolean;
  error?: string;
}

/**
 * Record a rollover decision for a student
 * AC 2.11.2: Record decision (continue_daep or return_home)
 * AC 2.11.3: Capture notes/rationale
 * AC 2.11.5: Logged to audit trail
 */
export async function recordRolloverDecision(
  input: RolloverDecisionInput
): Promise<RecordRolloverDecisionResult> {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();
  const user = await currentUser();

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  // Validate input
  const validation = RolloverDecisionSchema.safeParse(input);
  if (!validation.success) {
    return { success: false, error: validation.error.errors[0].message };
  }

  try {
    // 1. Get placement info (RLS handles access control)
    const { data: placement, error: fetchError } = await supabase
      .from('daep_placements')
      .select('id, school_id, days_remaining, home_campus_id, incident_number')
      .eq('id', input.placement_id)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchError || !placement) {
      return { success: false, error: 'Placement not found' };
    }

    // 2. Get student name for audit
    const { data: student } = await supabase
      .from('trespass_records')
      .select('first_name, last_name')
      .eq('school_id', placement.school_id)
      .eq('tenant_id', tenantId)
      .single();

    const studentName = student
      ? `${student.first_name} ${student.last_name}`
      : `Student ${placement.school_id}`;

    // 3. Insert decision record (RLS handles access control)
    const { error: insertError } = await supabase
      .from('daep_rollover_decisions')
      .insert({
        tenant_id: tenantId,
        placement_id: input.placement_id,
        student_id: placement.school_id,
        school_id: placement.incident_number,
        home_campus_id: placement.home_campus_id,
        decision: input.decision,
        days_remaining: placement.days_remaining || 0,
        decided_by: user.id,
        notes: input.notes || null,
      });

    if (insertError) {
      console.error('[Rollover] Error inserting decision:', insertError);
      return { success: false, error: 'Failed to record decision' };
    }

    // 4. Update placement rollover_decision field
    const { error: updateError } = await supabase
      .from('daep_placements')
      .update({
        rollover_decision: input.decision,
        rollover_student: true,
      })
      .eq('id', input.placement_id)
      .eq('tenant_id', tenantId);

    if (updateError) {
      console.error('[Rollover] Error updating placement:', updateError);
      // Don't fail - decision was recorded
    }

    // 5. Audit log (AC 2.11.5)
    await logAuditEvent({
      eventType: 'placement.rollover_decision',
      module: 'daep_management',
      actorId: user.id,
      targetId: input.placement_id,
      action: `Recorded rollover decision: ${input.decision} for ${studentName}`,
      recordSubjectName: studentName,
      recordSchoolId: placement.school_id,
      tenantId,
      details: {
        decision: input.decision,
        days_remaining: placement.days_remaining,
        notes: input.notes,
      },
    });

    // 6. Revalidate paths
    revalidatePath('/daep/reports/rollover');
    revalidatePath(`/daep/students/${placement.school_id}`);

    return { success: true };
  } catch (err) {
    console.error('[Rollover] Error in recordRolloverDecision:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'An unexpected error occurred',
    };
  }
}

// ========== GET ROLLOVER DECISION HISTORY ==========

/**
 * Get decision history for a placement
 * RLS handles access control
 */
export async function getRolloverDecisionHistory(
  placementId: string
): Promise<RolloverDecisionRecord[]> {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  const { data, error } = await supabase
    .from('daep_rollover_decisions')
    .select('id, placement_id, decision, days_remaining, decided_by, decided_at, notes')
    .eq('tenant_id', tenantId)
    .eq('placement_id', placementId)
    .order('decided_at', { ascending: false });

  if (error) {
    console.error('[Rollover] Error fetching decision history:', error);
    return [];
  }

  return (data || []) as RolloverDecisionRecord[];
}

// ========== CREATE ROLLOVER PLACEMENT (AC 2.11.12) ==========

export interface CreateRolloverPlacementResult {
  success: boolean;
  placementId?: string;
  error?: string;
}

/**
 * Create a new rollover placement for next school year
 * AC 2.11.12: Create placement with status='pending' for approval queue
 */
export async function createRolloverPlacement(
  input: CreateRolloverPlacementInput
): Promise<CreateRolloverPlacementResult> {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();
  const user = await currentUser();

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  // Validate input
  const validation = CreateRolloverPlacementSchema.safeParse(input);
  if (!validation.success) {
    return { success: false, error: validation.error.errors[0].message };
  }

  try {
    // 1. Get original placement (RLS handles access control)
    const { data: original, error: fetchError } = await supabase
      .from('daep_placements')
      .select('*')
      .eq('id', input.original_placement_id)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchError || !original) {
      return { success: false, error: 'Original placement not found' };
    }

    // 2. Get student name for audit
    const { data: student } = await supabase
      .from('trespass_records')
      .select('first_name, last_name')
      .eq('school_id', original.school_id)
      .eq('tenant_id', tenantId)
      .single();

    const studentName = student
      ? `${student.first_name} ${student.last_name}`
      : `Student ${original.school_id}`;

    // 3. Create new rollover placement (RLS handles access control)
    const newIncidentNumber = `${original.incident_number}-RO`;

    const { data: newPlacement, error: insertError } = await supabase
      .from('daep_placements')
      .insert({
        tenant_id: tenantId,
        school_id: original.school_id,
        incident_number: newIncidentNumber,
        placement_date: new Date().toISOString().split('T')[0],
        start_date: input.start_date,
        days_assigned: input.days_remaining,
        days_served: 0,
        days_remaining: input.days_remaining,
        offense_code: original.offense_code,
        location_code: original.location_code,
        placement_reason: `Rollover from ${original.incident_number}: ${input.days_remaining} days remaining`,
        mandatory_placement: original.mandatory_placement,
        home_campus_id: original.home_campus_id,
        assigning_campus_id: original.assigning_campus_id,
        status: 'pending', // Pending approval (AC 2.11.13)
        is_rollover_placement: true,
        original_placement_id: original.id,
        intake_notes: input.notes || `Rollover placement from ${original.incident_number}`,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('[Rollover] Error creating rollover placement:', insertError);
      return { success: false, error: 'Failed to create rollover placement' };
    }

    // 4. Audit log
    await logAuditEvent({
      eventType: 'placement.created',
      module: 'daep_management',
      actorId: user.id,
      targetId: newPlacement.id,
      action: `Created rollover placement for ${studentName}`,
      recordSubjectName: studentName,
      recordSchoolId: original.school_id,
      tenantId,
      details: {
        original_placement_id: original.id,
        original_incident_number: original.incident_number,
        days_remaining: input.days_remaining,
        is_rollover: true,
      },
    });

    // 5. Revalidate paths
    revalidatePath('/daep/reports/rollover');
    revalidatePath('/daep/students');
    revalidatePath(`/daep/students/${original.school_id}`);

    return { success: true, placementId: newPlacement.id };
  } catch (err) {
    console.error('[Rollover] Error in createRolloverPlacement:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'An unexpected error occurred',
    };
  }
}

// ========== GET PENDING ROLLOVER APPROVALS (AC 2.11.13) ==========

/**
 * Get pending rollover placements awaiting approval
 * AC 2.11.13: Approval queue for next-year placements
 * RLS handles access control (DAEP admin roles only)
 */
export async function getPendingRolloverApprovals(): Promise<PendingRolloverPlacement[]> {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  const { data, error } = await supabase
    .from('daep_placements')
    .select(`
      id,
      school_id,
      days_remaining,
      created_at,
      original_placement_id,
      home_campus:campuses!fk_daep_placements_home_campus(name),
      original_placement:daep_placements!original_placement_id(incident_number)
    `)
    .eq('tenant_id', tenantId)
    .eq('status', 'pending')
    .eq('is_rollover_placement', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Rollover] Error fetching pending approvals:', error);
    return [];
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Get student names
  const schoolIds = data.map(p => p.school_id);
  const { data: students } = await supabase
    .from('trespass_records')
    .select('school_id, first_name, last_name')
    .eq('tenant_id', tenantId)
    .in('school_id', schoolIds);

  const studentMap = new Map(
    students?.map(s => [s.school_id, `${s.first_name} ${s.last_name}`]) || []
  );

  return data.map(p => {
    const homeCampusRaw = p.home_campus as { name: string } | { name: string }[] | null;
    const homeCampus = Array.isArray(homeCampusRaw) ? homeCampusRaw[0] : homeCampusRaw;
    const originalRaw = p.original_placement as { incident_number: string } | { incident_number: string }[] | null;
    const original = Array.isArray(originalRaw) ? originalRaw[0] : originalRaw;

    return {
      placement_id: p.id,
      student_id: p.school_id,
      student_name: studentMap.get(p.school_id) || `Student ${p.school_id}`,
      home_campus_name: homeCampus?.name || 'Unknown',
      original_incident_number: original?.incident_number || 'Unknown',
      days_remaining: p.days_remaining || 0,
      created_at: p.created_at,
      created_by_name: null, // Could be expanded later
    };
  });
}

// ========== APPROVE ROLLOVER PLACEMENT (AC 2.11.13) ==========

export interface ApproveRolloverPlacementResult {
  success: boolean;
  error?: string;
}

/**
 * Approve or reject a pending rollover placement
 * AC 2.11.13: Approval queue workflow
 * RLS handles access control (DAEP admin roles only)
 */
export async function approveRolloverPlacement(
  input: ApproveRolloverPlacementInput
): Promise<ApproveRolloverPlacementResult> {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();
  const user = await currentUser();

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  // Validate input
  const validation = ApproveRolloverPlacementSchema.safeParse(input);
  if (!validation.success) {
    return { success: false, error: validation.error.errors[0].message };
  }

  try {
    // 1. Get placement (RLS handles access control)
    const { data: placement, error: fetchError } = await supabase
      .from('daep_placements')
      .select('id, school_id, is_rollover_placement, status')
      .eq('id', input.placement_id)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchError || !placement) {
      return { success: false, error: 'Placement not found' };
    }

    if (!placement.is_rollover_placement) {
      return { success: false, error: 'This is not a rollover placement' };
    }

    if (placement.status !== 'pending') {
      return { success: false, error: 'Placement is not pending approval' };
    }

    // 2. Get student name for audit
    const { data: student } = await supabase
      .from('trespass_records')
      .select('first_name, last_name')
      .eq('school_id', placement.school_id)
      .eq('tenant_id', tenantId)
      .single();

    const studentName = student
      ? `${student.first_name} ${student.last_name}`
      : `Student ${placement.school_id}`;

    if (input.approved) {
      // 3a. Approve - keep status as pending (will activate when school year starts)
      const { error: updateError } = await supabase
        .from('daep_placements')
        .update({
          intake_notes: `Rollover approved by admin on ${new Date().toISOString().split('T')[0]}`,
        })
        .eq('id', input.placement_id)
        .eq('tenant_id', tenantId);

      if (updateError) {
        console.error('[Rollover] Error approving placement:', updateError);
        return { success: false, error: 'Failed to approve placement' };
      }

      await logAuditEvent({
        eventType: 'placement.updated',
        module: 'daep_management',
        actorId: user.id,
        targetId: input.placement_id,
        action: `Approved rollover placement for ${studentName}`,
        recordSubjectName: studentName,
        recordSchoolId: placement.school_id,
        tenantId,
        details: { approved: true },
      });
    } else {
      // 3b. Reject - mark as cancelled
      const { error: updateError } = await supabase
        .from('daep_placements')
        .update({
          status: 'cancelled',
          completion_notes: `Rollover rejected: ${input.rejection_reason || 'No reason provided'}`,
        })
        .eq('id', input.placement_id)
        .eq('tenant_id', tenantId);

      if (updateError) {
        console.error('[Rollover] Error rejecting placement:', updateError);
        return { success: false, error: 'Failed to reject placement' };
      }

      await logAuditEvent({
        eventType: 'placement.cancelled',
        module: 'daep_management',
        actorId: user.id,
        targetId: input.placement_id,
        action: `Rejected rollover placement for ${studentName}`,
        recordSubjectName: studentName,
        recordSchoolId: placement.school_id,
        tenantId,
        details: {
          approved: false,
          rejection_reason: input.rejection_reason,
        },
      });
    }

    // 4. Revalidate paths
    revalidatePath('/daep/reports/rollover');
    revalidatePath('/daep/students');
    revalidatePath(`/daep/students/${placement.school_id}`);

    return { success: true };
  } catch (err) {
    console.error('[Rollover] Error in approveRolloverPlacement:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'An unexpected error occurred',
    };
  }
}

// ========== GET ROLLOVER COUNT FOR DASHBOARD (AC 2.11.6) ==========

/**
 * Get count of rollover candidates for dashboard indicator
 * AC 2.11.6: Dashboard shows rollover count indicator
 * RLS handles access control
 */
export async function getRolloverCount(): Promise<number> {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  const schoolDaysRemaining = await getSchoolDaysRemaining(tenantId);

  if (schoolDaysRemaining === null) {
    return 0;
  }

  const { count, error } = await supabase
    .from('daep_placements')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .in('status', ['pending', 'active', 'met'])
    .gt('days_remaining', schoolDaysRemaining);

  if (error) {
    console.error('[Rollover] Error getting rollover count:', error);
    return 0;
  }

  return count || 0;
}

// ========== CHECK IF ROLLOVER TAB SHOULD BE VISIBLE (AC 2.11.11) ==========

/**
 * Check if rollover report tab should be visible
 * AC 2.11.11: Calendar guard - only show in last month of school year
 */
export async function shouldShowRolloverTab(): Promise<boolean> {
  const tenantId = await getTenantId();
  return isLastMonthOfSchoolYear(tenantId);
}
