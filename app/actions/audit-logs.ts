'use server';

import { createClient } from '@supabase/supabase-js';
import { requirePermission } from '@/lib/auth-utils';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface AuditLog {
  id: string;
  event_type: string;
  actor_id: string;
  actor_email: string | null;
  actor_role: string | null;
  target_id: string | null;
  action: string;
  details: Record<string, any> | null;
  created_at: string;
}

/**
 * Fetch audit logs (admin only)
 * Returns recent audit logs for admins to view
 */
export async function getAuditLogs(limit: number = 100): Promise<AuditLog[]> {
  // Only district_admin and master_admin can view audit logs
  const user = await requirePermission('invite_users');

  if (!['district_admin', 'master_admin'].includes(user.role)) {
    throw new Error('Access denied: Only admins can view audit logs');
  }

  const { data, error } = await supabaseAdmin
    .from('admin_audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching audit logs:', error);
    throw new Error('Failed to fetch audit logs');
  }

  return data || [];
}
