import { NextRequest, NextResponse } from 'next/server';
import {
  getIncompleteSessionsForNotification,
  markAbandonedSessions,
  createReconciliationNotification,
} from '@/app/actions/daep/reconciliation';
import { logAuditEvent } from '@/lib/audit-logger';
import { logger } from '@/lib/logger';

/**
 * Daily cron job for reconciliation reminders (Story 5-10)
 *
 * Schedule: 0 11 * * * (11:00 UTC = 5 AM Central)
 * URL: /api/cron/reconciliation-reminder
 *
 * What it does:
 * 1. Marks sessions as abandoned after 7 days of inactivity
 * 2. Sends in-app notifications for incomplete sessions > 24 hours old
 * 3. Logs audit events for each action
 *
 * Security: Verifies CRON_SECRET to prevent unauthorized access
 */
export async function GET(req: NextRequest) {
  // Verify cron secret for security
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    logger.error('[Reconciliation Cron] CRON_SECRET not configured');
    return NextResponse.json({ error: 'Cron not configured' }, { status: 500 });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    logger.warn('[Reconciliation Cron] Unauthorized cron attempt');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results = {
    abandoned: { success: false, count: 0, sessions: [] as string[] },
    reminders: { success: false, count: 0, sessions: [] as string[] },
    errors: [] as string[],
  };

  try {
    logger.info('[Reconciliation Cron] Starting daily reconciliation reminder job');

    // Step 1: Mark sessions as abandoned after 7 days
    const abandonResult = await markAbandonedSessions();
    results.abandoned = {
      success: abandonResult.success,
      count: abandonResult.count,
      sessions: abandonResult.sessions.map((s) => s.file_name),
    };

    if (abandonResult.count > 0) {
      logger.info(
        `[Reconciliation Cron] Marked ${abandonResult.count} sessions as abandoned`,
        { sessions: abandonResult.sessions }
      );
    }

    // Step 2: Get incomplete sessions older than 24 hours for notifications
    const incompleteSessions = await getIncompleteSessionsForNotification();

    if (incompleteSessions.length > 0) {
      logger.info(
        `[Reconciliation Cron] Found ${incompleteSessions.length} incomplete sessions for notification`
      );

      // Group sessions by tenant for efficient processing
      const sessionsByTenant = incompleteSessions.reduce(
        (acc, session) => {
          if (!acc[session.tenant_id]) {
            acc[session.tenant_id] = [];
          }
          acc[session.tenant_id].push(session);
          return acc;
        },
        {} as Record<string, typeof incompleteSessions>
      );

      // Process each tenant's sessions
      for (const [tenantId, sessions] of Object.entries(sessionsByTenant)) {
        for (const session of sessions) {
          try {
            // Create in-app notification for the user who uploaded
            const notificationCreated = await createReconciliationNotification(
              tenantId,
              session.uploaded_by,
              session.id,
              session.file_name
            );

            if (notificationCreated) {
              results.reminders.sessions.push(session.file_name);

              // Log audit event
              await logAuditEvent({
                eventType: 'reconciliation.reminder_sent',
                module: 'daep_management',
                actorId: 'system',
                actorEmail: 'system@cron',
                targetId: session.id,
                action: `Daily reminder sent for incomplete session: ${session.file_name}`,
                details: {
                  sessionId: session.id,
                  fileName: session.file_name,
                  uploadDate: session.upload_date,
                  userId: session.uploaded_by,
                },
                tenantId,
              });
            }
          } catch (error) {
            const errMsg = `Failed to notify for session ${session.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
            results.errors.push(errMsg);
            logger.error(`[Reconciliation Cron] ${errMsg}`);
          }
        }
      }

      results.reminders.success = true;
      results.reminders.count = results.reminders.sessions.length;
    } else {
      results.reminders.success = true;
      results.reminders.count = 0;
    }

    logger.info('[Reconciliation Cron] Job completed', {
      abandonedCount: results.abandoned.count,
      reminderCount: results.reminders.count,
      errorCount: results.errors.length,
    });

    return NextResponse.json({
      success: true,
      message: 'Reconciliation reminder job completed',
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[Reconciliation Cron] Job failed', { error: errMsg });

    return NextResponse.json(
      {
        error: 'Reconciliation reminder job failed',
        message: errMsg,
        results,
      },
      { status: 500 }
    );
  }
}
