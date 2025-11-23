import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

// Supabase client with service role key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Get demo seed snapshot for automated resets
 *
 * This endpoint returns the current snapshot of demo campuses and records
 * that should be used when resetting the demo tenant.
 *
 * Security: Requires cron secret OR internal server-side call
 *
 * GET /api/admin/get-demo-snapshot
 */
export async function GET(req: NextRequest) {
  try {
    // Verify authorization (cron secret for automated calls)
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    const internalSecret = req.headers.get('x-internal-secret');

    // Allow either cron secret OR internal secret (for server-side calls)
    const isAuthorized =
      (cronSecret && authHeader === `Bearer ${cronSecret}`) ||
      (internalSecret === process.env.INTERNAL_API_SECRET);

    if (!isAuthorized) {
      logger.warn('Unauthorized attempt to access demo snapshot');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch the current snapshot
    const { data: snapshot, error: snapshotError } = await supabaseAdmin
      .from('demo_seed_snapshots')
      .select('*')
      .eq('id', 'default')
      .single();

    if (snapshotError || !snapshot) {
      logger.error('Error fetching demo snapshot', snapshotError);
      return NextResponse.json(
        { error: 'Snapshot not found' },
        { status: 404 }
      );
    }

    // Return the snapshot data
    return NextResponse.json({
      success: true,
      campuses: snapshot.campuses_snapshot || [],
      records: snapshot.records_snapshot || [],
      campusCount: snapshot.snapshot_count_campuses,
      recordCount: snapshot.snapshot_count_records,
      lastUpdated: snapshot.updated_at,
      updatedBy: snapshot.updated_by,
    });
  } catch (error: any) {
    logger.error('Error retrieving demo snapshot', error);
    return NextResponse.json(
      {
        error: 'Failed to retrieve demo snapshot',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
