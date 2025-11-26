'use server';

import { createServerClient } from '@/lib/supabase/server';
import { currentUser } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import {
  SchoolCalendarEntrySchema,
  SchoolCalendarCSVRowSchema,
  DAY_TYPES,
  type CreateSchoolCalendarEntryInput,
  type DayType,
} from '@/lib/validation/schemas';

// Types
export interface SchoolCalendarEntry {
  id: string;
  tenant_id: string;
  school_year: string;
  date: string;
  is_school_day: boolean;
  day_type: DayType | null;
  bell_schedule_id: string | null;
  notes: string | null;
  created_at: string;
  bell_schedule?: { id: string; schedule_name: string } | null;
}

// Helper to get effective tenant_id from database (matches RLS get_my_tenant_id())
// Uses COALESCE(active_tenant_id, tenant_id) to support super_admin tenant switching
async function getTenantId(): Promise<string> {
  const user = await currentUser();
  if (!user) throw new Error('Unauthorized');

  const supabase = await createServerClient();
  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('tenant_id, active_tenant_id')
    .eq('id', user.id)
    .single();

  if (error || !profile) {
    throw new Error('User profile not found');
  }

  const effectiveTenantId = profile.active_tenant_id || profile.tenant_id;
  if (!effectiveTenantId) {
    throw new Error('No tenant assigned');
  }

  return effectiveTenantId;
}

// Helper to check DAEP admin role and get effective tenant
async function checkDAEPAdminRole(): Promise<{ userId: string; role: string; tenantId: string }> {
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

  const allowedRoles = ['super_admin', 'district_admin', 'daep_admin_l1'];
  if (!allowedRoles.includes(profile.role)) {
    throw new Error('Insufficient permissions. Only DAEP administrators can manage the school calendar.');
  }

  const effectiveTenantId = profile.active_tenant_id || profile.tenant_id;
  if (!effectiveTenantId) {
    throw new Error('No tenant assigned');
  }

  return { userId: user.id, role: profile.role, tenantId: effectiveTenantId };
}

// Helper to log audit events
async function logDAEPAuditEvent(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  eventType: string,
  actorId: string,
  targetId: string,
  action: string,
  tenantId: string,
  details?: Record<string, any>
): Promise<void> {
  try {
    await supabase.from('admin_audit_log').insert({
      event_type: eventType,
      actor_id: actorId,
      target_id: targetId,
      action,
      tenant_id: tenantId,
      module: 'daep_management',
      details,
    });
  } catch (error) {
    console.error('Failed to log DAEP audit event:', error);
  }
}

// ========== GET CALENDAR ENTRIES ==========

export async function getSchoolCalendarEntries(schoolYear: string): Promise<SchoolCalendarEntry[]> {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  const { data, error } = await supabase
    .from('daep_school_calendar')
    .select(`
      *,
      bell_schedule:daep_bell_schedules(id, schedule_name)
    `)
    .eq('tenant_id', tenantId)
    .eq('school_year', schoolYear)
    .order('date');

  if (error) {
    console.error('Error fetching school calendar:', error);
    throw new Error('Failed to fetch school calendar');
  }

  return data || [];
}

export async function getSchoolCalendarEntry(date: string): Promise<SchoolCalendarEntry | null> {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  const { data, error } = await supabase
    .from('daep_school_calendar')
    .select(`
      *,
      bell_schedule:daep_bell_schedules(id, schedule_name)
    `)
    .eq('tenant_id', tenantId)
    .eq('date', date)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error('Failed to fetch calendar entry');
  }

  return data;
}

export async function getAvailableSchoolYears(): Promise<string[]> {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  const { data, error } = await supabase
    .from('daep_school_calendar')
    .select('school_year')
    .eq('tenant_id', tenantId)
    .order('school_year', { ascending: false });

  if (error) {
    console.error('Error fetching school years:', error);
    throw new Error('Failed to fetch school years');
  }

  // Deduplicate
  const uniqueYears = Array.from(new Set(data?.map((d) => d.school_year) || []));
  return uniqueYears;
}

// ========== CREATE/UPDATE CALENDAR ENTRY (UPSERT) ==========

export async function upsertSchoolCalendarEntry(
  input: CreateSchoolCalendarEntryInput
): Promise<SchoolCalendarEntry> {
  const { userId, tenantId } = await checkDAEPAdminRole();
  const supabase = await createServerClient();

  // Validate input
  const validation = SchoolCalendarEntrySchema.safeParse(input);
  if (!validation.success) {
    throw new Error(`Validation failed: ${validation.error.errors[0].message}`);
  }

  // Check if entry exists for this date
  const { data: existing } = await supabase
    .from('daep_school_calendar')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('date', validation.data.date)
    .single();

  if (existing) {
    // Update existing entry
    const { data, error } = await supabase
      .from('daep_school_calendar')
      .update({
        ...validation.data,
      })
      .eq('id', existing.id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) {
      console.error('Error updating calendar entry:', error);
      throw new Error('Failed to update calendar entry');
    }

    await logDAEPAuditEvent(
      supabase,
      'school_calendar.updated',
      userId,
      data.id,
      `Updated calendar entry for ${input.date}`,
      tenantId,
      { date: input.date, day_type: input.day_type, is_school_day: input.is_school_day }
    );

    revalidatePath('/daep/settings/calendar');
    return data;
  }

  // Create new entry
  const { data, error } = await supabase
    .from('daep_school_calendar')
    .insert({
      ...validation.data,
      tenant_id: tenantId,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('A calendar entry for this date already exists');
    }
    console.error('Error creating calendar entry:', error);
    throw new Error('Failed to create calendar entry');
  }

  await logDAEPAuditEvent(
    supabase,
    'school_calendar.created',
    userId,
    data.id,
    `Created calendar entry for ${input.date}`,
    tenantId,
    { date: input.date, day_type: input.day_type, is_school_day: input.is_school_day }
  );

  revalidatePath('/daep/settings/calendar');
  return data;
}

// ========== DELETE CALENDAR ENTRY ==========

export async function deleteSchoolCalendarEntry(entryId: string): Promise<void> {
  const { userId, tenantId } = await checkDAEPAdminRole();
  const supabase = await createServerClient();

  const { data: existing } = await supabase
    .from('daep_school_calendar')
    .select('date')
    .eq('id', entryId)
    .eq('tenant_id', tenantId)
    .single();

  if (!existing) {
    throw new Error('Calendar entry not found');
  }

  const { error } = await supabase
    .from('daep_school_calendar')
    .delete()
    .eq('id', entryId)
    .eq('tenant_id', tenantId);

  if (error) {
    console.error('Error deleting calendar entry:', error);
    throw new Error('Failed to delete calendar entry');
  }

  await logDAEPAuditEvent(
    supabase,
    'school_calendar.deleted',
    userId,
    entryId,
    `Deleted calendar entry for ${existing.date}`,
    tenantId
  );

  revalidatePath('/daep/settings/calendar');
}

// ========== BULK IMPORT FROM CSV ==========

export interface CSVImportResult {
  success: number;
  failed: number;
  errors: string[];
}

export async function importSchoolCalendarCSV(
  rows: Array<{ date: string; is_school_day: string | boolean; day_type?: string | null }>,
  schoolYear: string
): Promise<CSVImportResult> {
  const { userId, tenantId } = await checkDAEPAdminRole();
  const supabase = await createServerClient();

  const result: CSVImportResult = {
    success: 0,
    failed: 0,
    errors: [],
  };

  // Validate school year format
  if (!/^\d{4}-\d{4}$/.test(schoolYear)) {
    throw new Error('Invalid school year format. Use YYYY-YYYY (e.g., 2024-2025)');
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // Account for header row

    try {
      // Validate row
      const validation = SchoolCalendarCSVRowSchema.safeParse(row);
      if (!validation.success) {
        result.failed++;
        result.errors.push(`Row ${rowNum}: ${validation.error.errors[0].message}`);
        continue;
      }

      // Validate day_type if provided
      let dayType: DayType | null = null;
      if (validation.data.day_type) {
        const normalizedType = validation.data.day_type.trim();
        if (DAY_TYPES.includes(normalizedType as DayType)) {
          dayType = normalizedType as DayType;
        } else {
          result.failed++;
          result.errors.push(
            `Row ${rowNum}: Invalid day_type "${validation.data.day_type}". Valid types: ${DAY_TYPES.join(', ')}`
          );
          continue;
        }
      }

      // Upsert the entry
      const { error } = await supabase.from('daep_school_calendar').upsert(
        {
          tenant_id: tenantId,
          school_year: schoolYear,
          date: validation.data.date,
          is_school_day: validation.data.is_school_day,
          day_type: dayType,
        },
        {
          onConflict: 'tenant_id,date',
        }
      );

      if (error) {
        result.failed++;
        result.errors.push(`Row ${rowNum}: ${error.message}`);
      } else {
        result.success++;
      }
    } catch (err: any) {
      result.failed++;
      result.errors.push(`Row ${rowNum}: ${err.message}`);
    }
  }

  // Log audit event
  await logDAEPAuditEvent(
    supabase,
    'school_calendar.bulk_import',
    userId,
    'bulk',
    `Imported ${result.success} calendar entries for ${schoolYear}`,
    tenantId,
    { school_year: schoolYear, success: result.success, failed: result.failed }
  );

  revalidatePath('/daep/settings/calendar');
  return result;
}

// ========== GENERATE SCHOOL YEAR CALENDAR ==========

export async function generateSchoolYearCalendar(
  schoolYear: string,
  startDate: string,
  endDate: string
): Promise<{ created: number }> {
  const { userId, tenantId } = await checkDAEPAdminRole();
  const supabase = await createServerClient();

  // Validate inputs
  if (!/^\d{4}-\d{4}$/.test(schoolYear)) {
    throw new Error('Invalid school year format');
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error('Invalid date format');
  }

  if (start >= end) {
    throw new Error('Start date must be before end date');
  }

  // Generate entries for each weekday
  const entries: Array<{
    tenant_id: string;
    school_year: string;
    date: string;
    is_school_day: boolean;
    day_type: string;
  }> = [];

  const current = new Date(start);
  while (current <= end) {
    const dayOfWeek = current.getDay();
    const isWeekday = dayOfWeek !== 0 && dayOfWeek !== 6;

    entries.push({
      tenant_id: tenantId,
      school_year: schoolYear,
      date: current.toISOString().split('T')[0],
      is_school_day: isWeekday,
      day_type: 'Regular',
    });

    current.setDate(current.getDate() + 1);
  }

  // Batch insert (upsert to handle existing entries)
  const { error } = await supabase.from('daep_school_calendar').upsert(entries, {
    onConflict: 'tenant_id,date',
    ignoreDuplicates: false,
  });

  if (error) {
    console.error('Error generating school year calendar:', error);
    throw new Error('Failed to generate school year calendar');
  }

  await logDAEPAuditEvent(
    supabase,
    'school_calendar.generated',
    userId,
    'bulk',
    `Generated ${entries.length} calendar entries for ${schoolYear}`,
    tenantId,
    { school_year: schoolYear, start_date: startDate, end_date: endDate, count: entries.length }
  );

  revalidatePath('/daep/settings/calendar');
  return { created: entries.length };
}
