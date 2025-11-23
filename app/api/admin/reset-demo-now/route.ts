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
 * On-demand reset of demo tenant data
 *
 * This endpoint allows master admins to immediately reset demo tenant
 * to the saved snapshot (useful if inappropriate content is posted)
 *
 * Security: Only master_admin role can trigger reset
 *
 * POST /api/admin/reset-demo-now
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
      logger.warn('Non-master-admin attempted to reset demo', { userId });
      return NextResponse.json(
        { error: 'Only master admins can reset demo tenant' },
        { status: 403 }
      );
    }

    logger.info('Starting on-demand demo tenant reset', { userId });

    // Step 1: Fetch the snapshot data from database
    const { data: snapshot, error: snapshotError } = await supabaseAdmin
      .from('demo_seed_snapshots')
      .select('campuses_snapshot, records_snapshot, snapshot_count_campuses, snapshot_count_records')
      .eq('id', 'default')
      .single();

    if (snapshotError || !snapshot) {
      logger.error('Error fetching demo snapshot', snapshotError);
      return NextResponse.json(
        {
          error: 'Demo snapshot not found',
          message: 'Please update the demo snapshot via admin panel first',
        },
        { status: 404 }
      );
    }

    const seedCampuses = snapshot.campuses_snapshot || [];
    const seedRecords = snapshot.records_snapshot || [];

    if (seedCampuses.length === 0 || seedRecords.length === 0) {
      logger.warn('Demo snapshot is empty, skipping reset');
      return NextResponse.json(
        {
          error: 'Empty snapshot',
          message: 'Demo snapshot has no data. Please update via admin panel.',
        },
        { status: 400 }
      );
    }

    // Step 2: Delete all demo tenant records (photos/documents cascade automatically)
    const { error: deleteRecordsError } = await supabaseAdmin
      .from('trespass_records')
      .delete()
      .eq('tenant_id', 'demo');

    if (deleteRecordsError) {
      logger.error('Error deleting demo records', deleteRecordsError);
      throw deleteRecordsError;
    }

    // Step 3: Delete all demo campuses
    const { error: deleteCampusesError } = await supabaseAdmin
      .from('campuses')
      .delete()
      .eq('tenant_id', 'demo');

    if (deleteCampusesError) {
      logger.error('Error deleting demo campuses', deleteCampusesError);
      throw deleteCampusesError;
    }

    // Step 4: Insert fresh seed campuses from snapshot
    const { error: insertCampusesError } = await supabaseAdmin
      .from('campuses')
      .insert(seedCampuses);

    if (insertCampusesError) {
      logger.error('Error inserting demo seed campuses', insertCampusesError);
      throw insertCampusesError;
    }

    // Step 5: Insert fresh seed records from snapshot
    const { error: insertRecordsError } = await supabaseAdmin
      .from('trespass_records')
      .insert(seedRecords);

    if (insertRecordsError) {
      logger.error('Error inserting demo seed records', insertRecordsError);
      throw insertRecordsError;
    }

    logger.info('On-demand demo tenant reset completed successfully', {
      userId,
      campusesInserted: seedCampuses.length,
      recordsInserted: seedRecords.length,
    });

    return NextResponse.json({
      success: true,
      message: 'Demo tenant reset successfully',
      campusesInserted: seedCampuses.length,
      recordsInserted: seedRecords.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Error resetting demo tenant on-demand', error);
    return NextResponse.json(
      {
        error: 'Failed to reset demo tenant',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
