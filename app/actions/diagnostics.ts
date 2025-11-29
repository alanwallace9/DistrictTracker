'use server';

import { auth } from '@clerk/nextjs/server';
import { createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

// Admin client for bypassing RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Diagnostic function to check user's authentication and tenant status
 * This helps debug RLS policy issues
 */
export async function checkUserDiagnostics() {
  const { userId, sessionClaims } = await auth();

  if (!userId) {
    return {
      error: 'No user logged in',
      userId: null,
      clerkClaims: null,
      supabaseProfile: null,
      supabaseToken: null,
    };
  }

  // Get Clerk session claims
  const clerkClaims = {
    userId,
    sessionClaims,
  };

  // Try to get Supabase profile
  const supabase = await createServerClient();

  // Check what Supabase sees as the current user
  const { data: { user: supabaseUser }, error: authError } = await supabase.auth.getUser();

  // Get user profile from database
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  // Try to call the RLS helper functions via a query
  const { data: rlsCheck, error: rlsError } = await supabase
    .rpc('get_my_tenant_id');

  return {
    clerkUserId: userId,
    clerkClaims,
    supabaseUser: supabaseUser ? {
      id: supabaseUser.id,
      email: supabaseUser.email,
      role: supabaseUser.role,
    } : null,
    authError: authError?.message,
    profile,
    profileError: profileError?.message,
    rlsCheck,
    rlsError: rlsError?.message,
  };
}

/**
 * EMERGENCY: Repair super_admin user's role if it was accidentally changed
 * Only works for the specific known super_admin user
 */
export async function repairSuperAdminRole() {
  const { userId } = await auth();

  if (!userId) {
    return { error: 'No user logged in', success: false };
  }

  // Only allow repair for known super_admin users (by email)
  const SUPER_ADMIN_EMAILS = [
    'alan.wallace@birdvilleschools.net',
    // Add other known super_admin emails here if needed
  ];

  // First, check the user's email
  const { data: profile, error: fetchError } = await supabaseAdmin
    .from('user_profiles')
    .select('id, email, role, tenant_id, active_tenant_id, demo_role')
    .eq('id', userId)
    .single();

  if (fetchError) {
    return { error: `Failed to fetch profile: ${fetchError.message}`, success: false };
  }

  if (!profile) {
    return { error: 'Profile not found', success: false };
  }

  // Check if this user is a known super_admin
  if (!SUPER_ADMIN_EMAILS.includes(profile.email?.toLowerCase())) {
    return {
      error: 'Not authorized for role repair',
      success: false,
      currentProfile: profile
    };
  }

  // If role is already super_admin, just return the profile
  if (profile.role === 'super_admin') {
    return {
      message: 'Role is already super_admin',
      success: true,
      profile
    };
  }

  // Repair the role
  const { error: updateError } = await supabaseAdmin
    .from('user_profiles')
    .update({ role: 'super_admin' })
    .eq('id', userId);

  if (updateError) {
    return { error: `Failed to repair role: ${updateError.message}`, success: false };
  }

  // Fetch updated profile
  const { data: updatedProfile } = await supabaseAdmin
    .from('user_profiles')
    .select('id, email, role, tenant_id, active_tenant_id, demo_role')
    .eq('id', userId)
    .single();

  return {
    message: 'Role repaired successfully',
    success: true,
    previousRole: profile.role,
    profile: updatedProfile
  };
}

/**
 * Seed a test student with DAEP placement for testing profile page
 * Uses the current user's effective tenant
 */
export async function seedTestStudent() {
  const { userId } = await auth();

  if (!userId) {
    return { error: 'No user logged in', success: false };
  }

  // Get user's effective tenant
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('user_profiles')
    .select('tenant_id, active_tenant_id')
    .eq('id', userId)
    .single();

  if (profileError || !profile) {
    return { error: 'Failed to get user profile', success: false };
  }

  const tenantId = profile.active_tenant_id || profile.tenant_id;
  if (!tenantId) {
    return { error: 'No tenant assigned to user', success: false };
  }

  try {
    // Get or create a campus
    let { data: campus } = await supabaseAdmin
      .from('campuses')
      .select('id')
      .eq('tenant_id', tenantId)
      .limit(1)
      .single();

    if (!campus) {
      const { data: newCampus, error: campusError } = await supabaseAdmin
        .from('campuses')
        .insert({
          tenant_id: tenantId,
          name: 'Lincoln High School',
          peims_code: '001',
          status: 'active',
          is_daep: false,
        })
        .select('id')
        .single();

      if (campusError) throw new Error(`Failed to create campus: ${campusError.message}`);
      campus = newCampus;
    }

    // Get or create a DAEP room
    let { data: room } = await supabaseAdmin
      .from('daep_rooms')
      .select('id')
      .eq('tenant_id', tenantId)
      .limit(1)
      .single();

    if (!room) {
      const { data: newRoom, error: roomError } = await supabaseAdmin
        .from('daep_rooms')
        .insert({
          tenant_id: tenantId,
          room_number: '101',
          room_name: 'Main DAEP Room',
          capacity: 25,
          active: true,
        })
        .select('id')
        .single();

      if (roomError) throw new Error(`Failed to create room: ${roomError.message}`);
      room = newRoom;
    }

    // Create or update discipline code
    await supabaseAdmin
      .from('daep_discipline_codes')
      .upsert({
        tenant_id: tenantId,
        code: '37A',
        label: 'Controlled Substance - Possession',
        mandatory_placement: true,
        active: true,
      }, { onConflict: 'tenant_id,code' });

    // Create or update test student
    const { error: studentError } = await supabaseAdmin
      .from('trespass_records')
      .upsert({
        tenant_id: tenantId,
        school_id: 'TEST001',
        first_name: 'Marcus',
        last_name: 'Johnson',
        middle_name: 'Antonio',
        date_of_birth: '2008-05-15',
        grade_level: 10,
        current_school: 'Lincoln High School',
        guardian_name: 'Patricia Johnson',
        guardian_phone: '(555) 123-4567',
        parent_email: 'pjohnson@email.com',
        emergency_contact_name: 'Robert Johnson',
        emergency_contact_phone: '(555) 987-6543',
        address: '123 Oak Street',
        city: 'Austin',
        state: 'TX',
        zip: '78701',
        is_student: true,
        is_daep: true,
        special_education: true,
        plan_504: false,
        ell_status: false,
        status: 'active',
        expiration_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      }, { onConflict: 'tenant_id,school_id' });

    if (studentError) throw new Error(`Failed to create student: ${studentError.message}`);

    // Calculate dates
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7); // Started 7 days ago

    const expectedEndDate = new Date();
    expectedEndDate.setDate(expectedEndDate.getDate() + 38); // 38 days remaining

    // Create or update placement
    const { error: placementError } = await supabaseAdmin
      .from('daep_placements')
      .upsert({
        tenant_id: tenantId,
        school_id: 'TEST001',
        incident_number: 'INC-2024-001',
        placement_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        start_date: startDate.toISOString().split('T')[0],
        days_assigned: 45,
        days_served: 7,
        days_remaining: 38,
        expected_end_date: expectedEndDate.toISOString().split('T')[0],
        status: 'active',
        offense_code: '37A',
        placement_reason: 'Violation of controlled substance policy - possession on campus',
        mandatory_placement: true,
        home_campus_id: campus.id,
        assigned_room_id: room.id,
        rollover_student: false,
        no_show: false,
        assessment_90day_required: true,
        intake_notes: 'Student transferred from Lincoln HS following disciplinary hearing. Parent conference completed on intake day.',
      }, { onConflict: 'tenant_id,school_id,incident_number' });

    if (placementError) throw new Error(`Failed to create placement: ${placementError.message}`);

    return {
      success: true,
      message: 'Test student created successfully!',
      student: {
        school_id: 'TEST001',
        name: 'Marcus Antonio Johnson',
        profileUrl: '/daep/students/TEST001',
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}
