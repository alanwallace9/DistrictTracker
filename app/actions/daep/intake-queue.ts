'use server';

import { createServerClient } from '@/lib/supabase/server';
import { currentUser } from '@clerk/nextjs/server';
import { logAuditEvent } from '@/lib/audit-logger';
import { revalidatePath } from 'next/cache';
import { getTenantId } from '@/lib/tenant';
import { parseCSVContent, autoSuggestMappings } from '@/lib/daep/csv-parser';
import { getCampusesForForm } from '@/app/actions/daep/placements';

// ========== TYPES ==========

export type IntakeQueueStatus =
  | 'approved'
  | 'scheduled'
  | 'arrived'
  | 'no_show'
  | 'promoted'
  | 'cancelled';

export interface IntakeQueueEntry {
  id: string;
  student_id: string | null;
  first_name: string;
  last_name: string;
  campus_name: string | null;
  home_campus_id: string | null;
  home_campus_name: string | null;
  special_notes: string | null;
  status: IntakeQueueStatus;
  scheduled_intake_date: string | null;
  placement_id: string | null;
  source: 'import' | 'manual';
  created_at: string;
}

export interface ImportApprovedListResult {
  success: boolean;
  added?: number;
  updated?: number;
  campusUnresolved?: number;
  skipped?: number;
  error?: string;
}

const TERMINAL_STATUSES: IntakeQueueStatus[] = ['promoted', 'cancelled'];

// ========== HELPERS ==========

function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Split a single "name" column into first/last. Handles "Last, First" and
 * "First Last". Used only when the import has no separate first/last columns.
 */
function splitFullName(raw: string): { first_name: string; last_name: string } {
  const value = raw.trim();
  if (value.includes(',')) {
    const [last, first] = value.split(',');
    return { first_name: (first || '').trim(), last_name: (last || '').trim() };
  }
  const tokens = value.split(/\s+/);
  if (tokens.length === 1) {
    return { first_name: tokens[0], last_name: '' };
  }
  return { first_name: tokens[0], last_name: tokens.slice(1).join(' ') };
}

// ========== IMPORT APPROVED LIST ==========

/**
 * Import a district's approved-students list (name, campus, special notes)
 * into the intake queue. This is the scheduling stage — no placements are
 * created here. Re-importing the same list updates existing non-terminal
 * entries instead of duplicating them.
 */
export async function importApprovedList(
  formData: FormData
): Promise<ImportApprovedListResult> {
  const supabase = await createServerClient();
  const user = await currentUser();

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  const file = formData.get('file') as File | null;
  if (!file) {
    return { success: false, error: 'No file provided' };
  }
  if (file.size > 10 * 1024 * 1024) {
    return { success: false, error: 'File too large. Maximum size is 10MB.' };
  }

  const tenantId = await getTenantId();

  try {
    const text = await file.text();
    const parseResult = parseCSVContent(text);
    const headers = parseResult.meta.fields || [];

    if (headers.length === 0 || parseResult.data.length === 0) {
      return { success: false, error: 'No rows found in file.' };
    }

    // Resolve which CSV columns map to the fields we care about.
    const mapping = autoSuggestMappings(headers);
    const firstCol = mapping.first_name;
    const lastCol = mapping.last_name;
    const studentIdCol = mapping.student_id;
    const campusCol = mapping.home_campus;
    // Notes has no FIELD_PATTERNS entry — detect a "notes" column directly.
    const notesCol = headers.find((h) => normalizeHeader(h).includes('note'));
    // Fallback: a single combined-name column when first/last aren't separate.
    const nameCol =
      !firstCol && !lastCol
        ? headers.find((h) => {
            const n = normalizeHeader(h);
            return n.includes('name') && !n.includes('campus') && !n.includes('school') && !n.includes('file');
          })
        : undefined;

    if (!firstCol && !lastCol && !nameCol) {
      return {
        success: false,
        error: 'Could not find a student name column in the file.',
      };
    }

    // Build a campus lookup (normalized name -> code), preferring non-DAEP campuses.
    const campuses = await getCampusesForForm();
    const campusByName = new Map<string, string>();
    for (const c of campuses) {
      const key = c.name.trim().toLowerCase();
      if (!campusByName.has(key) || !c.is_daep) {
        campusByName.set(key, c.id);
      }
    }

    // Load existing non-terminal entries to dedup against.
    const { data: existing } = await supabase
      .from('daep_intake_queue')
      .select('id, student_id, first_name, last_name, campus_name')
      .eq('tenant_id', tenantId)
      .not('status', 'in', `(${TERMINAL_STATUSES.join(',')})`);

    const byStudentId = new Map<string, string>();
    const byNameCampus = new Map<string, string>();
    for (const row of existing || []) {
      if (row.student_id) byStudentId.set(String(row.student_id), row.id);
      byNameCampus.set(
        `${(row.first_name || '').toLowerCase()}|${(row.last_name || '').toLowerCase()}|${(row.campus_name || '').toLowerCase()}`,
        row.id
      );
    }

    const inserts: Record<string, unknown>[] = [];
    const updates: { id: string; patch: Record<string, unknown> }[] = [];
    const seenInsertKeys = new Set<string>();
    let campusUnresolved = 0;
    let skipped = 0;

    for (const row of parseResult.data) {
      let first = '';
      let last = '';
      if (firstCol || lastCol) {
        first = (row[firstCol] || '').trim();
        last = (row[lastCol] || '').trim();
      } else if (nameCol) {
        const split = splitFullName(row[nameCol] || '');
        first = split.first_name;
        last = split.last_name;
      }

      if (!first && !last) {
        skipped++;
        continue;
      }

      const studentId = studentIdCol ? (row[studentIdCol] || '').trim() || null : null;
      const campusName = campusCol ? (row[campusCol] || '').trim() || null : null;
      const notes = notesCol ? (row[notesCol] || '').trim() || null : null;
      const homeCampusId = campusName
        ? campusByName.get(campusName.toLowerCase()) || null
        : null;
      if (campusName && !homeCampusId) campusUnresolved++;

      const nameCampusKey = `${first.toLowerCase()}|${last.toLowerCase()}|${(campusName || '').toLowerCase()}`;
      const existingId =
        (studentId && byStudentId.get(studentId)) || byNameCampus.get(nameCampusKey);

      if (existingId) {
        updates.push({
          id: existingId,
          patch: {
            student_id: studentId,
            campus_name: campusName,
            home_campus_id: homeCampusId,
            special_notes: notes,
            updated_at: new Date().toISOString(),
          },
        });
      } else {
        // Guard against duplicate rows within the same file.
        if (seenInsertKeys.has(nameCampusKey)) {
          skipped++;
          continue;
        }
        seenInsertKeys.add(nameCampusKey);
        inserts.push({
          tenant_id: tenantId,
          student_id: studentId,
          first_name: first,
          last_name: last,
          campus_name: campusName,
          home_campus_id: homeCampusId,
          special_notes: notes,
          status: 'approved',
          source: 'import',
          created_by: user.id,
        });
      }
    }

    if (inserts.length > 0) {
      const { error: insertError } = await supabase.from('daep_intake_queue').insert(inserts);
      if (insertError) {
        console.error('Error inserting intake queue rows:', insertError);
        return { success: false, error: 'Failed to import approved list.' };
      }
    }

    for (const u of updates) {
      const { error: updateError } = await supabase
        .from('daep_intake_queue')
        .update(u.patch)
        .eq('id', u.id)
        .eq('tenant_id', tenantId);
      if (updateError) {
        console.error('Error updating intake queue row:', updateError);
      }
    }

    await logAuditEvent({
      eventType: 'intake_queue.imported',
      module: 'daep_management',
      actorId: user.id,
      action: `Imported approved list: ${inserts.length} added, ${updates.length} updated`,
      tenantId,
      details: {
        added: inserts.length,
        updated: updates.length,
        campus_unresolved: campusUnresolved,
        skipped,
      },
    });

    revalidatePath('/daep/intake-queue');

    return {
      success: true,
      added: inserts.length,
      updated: updates.length,
      campusUnresolved,
      skipped,
    };
  } catch (err) {
    console.error('Error in importApprovedList:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'An unexpected error occurred',
    };
  }
}

// ========== READ ==========

function mapRow(row: any, campusNames: Map<string, string>): IntakeQueueEntry {
  return {
    id: row.id,
    student_id: row.student_id,
    first_name: row.first_name,
    last_name: row.last_name,
    campus_name: row.campus_name,
    home_campus_id: row.home_campus_id,
    home_campus_name: row.home_campus_id ? campusNames.get(row.home_campus_id) || null : null,
    special_notes: row.special_notes,
    status: row.status,
    scheduled_intake_date: row.scheduled_intake_date,
    placement_id: row.placement_id,
    source: row.source,
    created_at: row.created_at,
  };
}

export async function getIntakeQueue(): Promise<IntakeQueueEntry[]> {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  const { data, error } = await supabase
    .from('daep_intake_queue')
    .select(
      'id, student_id, first_name, last_name, campus_name, home_campus_id, special_notes, status, scheduled_intake_date, placement_id, source, created_at'
    )
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching intake queue:', error);
    throw new Error('Failed to fetch intake queue');
  }

  const campuses = await getCampusesForForm();
  const campusNames = new Map(campuses.map((c) => [c.id, c.name]));

  return (data || []).map((row) => mapRow(row, campusNames));
}

export async function getIntakeQueueEntry(id: string): Promise<IntakeQueueEntry | null> {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  const { data, error } = await supabase
    .from('daep_intake_queue')
    .select(
      'id, student_id, first_name, last_name, campus_name, home_campus_id, special_notes, status, scheduled_intake_date, placement_id, source, created_at'
    )
    .eq('tenant_id', tenantId)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Error fetching intake queue entry:', error);
    throw new Error('Failed to fetch intake queue entry');
  }
  if (!data) return null;

  const campuses = await getCampusesForForm();
  const campusNames = new Map(campuses.map((c) => [c.id, c.name]));

  return mapRow(data, campusNames);
}

// ========== UPDATE (scheduling / no-show) ==========

export interface UpdateIntakeQueueResult {
  success: boolean;
  error?: string;
}

export async function updateIntakeQueueEntry(
  id: string,
  patch: { scheduled_intake_date?: string | null; status?: IntakeQueueStatus; special_notes?: string | null }
): Promise<UpdateIntakeQueueResult> {
  const supabase = await createServerClient();
  const user = await currentUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  const tenantId = await getTenantId();

  const allowedStatuses: IntakeQueueStatus[] = [
    'approved',
    'scheduled',
    'arrived',
    'no_show',
    'cancelled',
  ];
  if (patch.status && !allowedStatuses.includes(patch.status)) {
    return { success: false, error: 'Invalid status' };
  }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.scheduled_intake_date !== undefined) {
    update.scheduled_intake_date = patch.scheduled_intake_date || null;
    // Setting a date moves an untouched entry into the scheduled stage.
    if (patch.scheduled_intake_date && !patch.status) update.status = 'scheduled';
  }
  if (patch.status !== undefined) update.status = patch.status;
  if (patch.special_notes !== undefined) update.special_notes = patch.special_notes;

  const { error } = await supabase
    .from('daep_intake_queue')
    .update(update)
    .eq('id', id)
    .eq('tenant_id', tenantId);

  if (error) {
    console.error('Error updating intake queue entry:', error);
    return { success: false, error: 'Failed to update entry' };
  }

  if (patch.status === 'no_show' || patch.scheduled_intake_date) {
    await logAuditEvent({
      eventType: patch.status === 'no_show' ? 'intake_queue.no_show' : 'intake_queue.scheduled',
      module: 'daep_management',
      actorId: user.id,
      targetId: id,
      action:
        patch.status === 'no_show'
          ? 'Marked intake queue entry as no-show'
          : `Scheduled intake for ${patch.scheduled_intake_date}`,
      tenantId,
    });
  }

  revalidatePath('/daep/intake-queue');
  return { success: true };
}

// ========== PROMOTE (link to created placement) ==========

export interface PromoteIntakeQueueResult {
  success: boolean;
  error?: string;
}

/**
 * Link an intake queue entry to the placement that was just created from it
 * and mark it promoted. Shared path: called from manual completion now, and
 * from the detailed-report import later.
 */
export async function promoteIntakeQueueEntry(
  id: string,
  placementId: string
): Promise<PromoteIntakeQueueResult> {
  const supabase = await createServerClient();
  const user = await currentUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  const tenantId = await getTenantId();

  const { error } = await supabase
    .from('daep_intake_queue')
    .update({
      placement_id: placementId,
      status: 'promoted',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('tenant_id', tenantId);

  if (error) {
    console.error('Error promoting intake queue entry:', error);
    return { success: false, error: 'Failed to link placement to intake entry' };
  }

  await logAuditEvent({
    eventType: 'intake_queue.promoted',
    module: 'daep_management',
    actorId: user.id,
    targetId: id,
    action: 'Promoted intake queue entry to placement',
    tenantId,
    details: { placement_id: placementId },
  });

  revalidatePath('/daep/intake-queue');
  revalidatePath('/daep/students');
  return { success: true };
}
