import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs/server';
import { logger } from '@/lib/logger';

// Supabase client with service role key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Update demo seed snapshot with current demo tenant data
 *
 * This endpoint captures the current state of demo campuses and records
 * and saves them as the new "default state" for automated resets.
 *
 * Security: Only master_admin role can update snapshots
 *
 * POST /api/admin/update-demo-snapshot
 */
export async function POST(req: NextRequest) {
  try {
    // Verify authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is master_admin
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (profileError || !userProfile) {
      logger.error('Error fetching user profile', profileError);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (userProfile.role !== 'master_admin') {
      logger.warn('Non-master-admin attempted to update demo snapshot', { userId });
      return NextResponse.json(
        { error: 'Only master admins can update demo snapshots' },
        { status: 403 }
      );
    }

    logger.info('Capturing demo tenant snapshot', { userId });

    // Fetch all current demo campuses
    const { data: campuses, error: campusError } = await supabaseAdmin
      .from('campuses')
      .select('*')
      .eq('tenant_id', 'demo')
      .is('deleted_at', null)
      .order('id');

    if (campusError) {
      logger.error('Error fetching demo campuses', campusError);
      throw campusError;
    }

    // Fetch all current demo records
    const { data: records, error: recordsError } = await supabaseAdmin
      .from('trespass_records')
      .select('*')
      .eq('tenant_id', 'demo')
      .order('created_at');

    if (recordsError) {
      logger.error('Error fetching demo records', recordsError);
      throw recordsError;
    }

    // Update the snapshot in database
    const { error: updateError } = await supabaseAdmin
      .from('demo_seed_snapshots')
      .update({
        campuses_snapshot: campuses,
        records_snapshot: records,
        snapshot_count_campuses: campuses.length,
        snapshot_count_records: records.length,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 'default');

    if (updateError) {
      logger.error('Error updating demo snapshot', updateError);
      throw updateError;
    }

    logger.info('Demo snapshot updated successfully', {
      userId,
      campusCount: campuses.length,
      recordCount: records.length,
    });

    return NextResponse.json({
      success: true,
      message: 'Demo snapshot updated successfully',
      campusCount: campuses.length,
      recordCount: records.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Error updating demo snapshot', error);
    return NextResponse.json(
      {
        error: 'Failed to update demo snapshot',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
