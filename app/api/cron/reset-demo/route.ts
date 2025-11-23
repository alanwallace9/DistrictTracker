import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

// Supabase client with service role key (bypasses RLS for admin operations)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Cron job to reset demo tenant data every 6 hours
 *
 * This endpoint should be called by Vercel Cron or similar service
 * URL: /api/cron/reset-demo
 * Schedule: "0 star-slash-6 star star star" (every 6 hours at minute 0)
 *
 * Security: Verifies cron secret to prevent unauthorized access
 *
 * What gets deleted:
 * - trespass_records (tenant_id = 'demo')
 * - campuses (tenant_id = 'demo')
 * - record_photos and record_documents (cascaded automatically)
 *
 * What gets preserved:
 * - user_profiles (so users can log back in)
 * - feedback_submissions (global, not tenant-specific)
 * - tenants table (demo tenant record)
 * - admin_audit_log (audit trail preserved for yearly review)
 *
 * Data source: Fetches snapshot from demo_seed_snapshots table
 */
export async function GET(req: NextRequest) {
  // Verify cron secret for security
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    logger.error('CRON_SECRET not configured');
    return NextResponse.json({ error: 'Cron not configured' }, { status: 500 });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    logger.warn('Unauthorized cron attempt');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    logger.info('Starting demo tenant reset');

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

    logger.info('Demo tenant reset completed successfully', {
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
    logger.error('Error resetting demo tenant', error);
    return NextResponse.json(
      {
        error: 'Failed to reset demo tenant',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

