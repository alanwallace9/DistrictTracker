import { useMemo } from 'react';
import { TrespassRecord, UserProfile } from '@/lib/supabase';

/**
 * Hook to calculate the number of trespass warnings expiring within 1 week
 * Filters based on user role and campus assignment
 */
export function useExpiringWarnings(
  records: TrespassRecord[],
  userProfile: UserProfile | null
): {
  count: number;
  expiringRecords: TrespassRecord[];
} {
  return useMemo(() => {
    // If notifications are disabled or user is not an admin, return 0
    if (!userProfile || !userProfile.notifications_enabled || userProfile.role === 'viewer') {
      return { count: 0, expiringRecords: [] };
    }

    const now = new Date();
    const oneWeekFromNow = new Date();
    oneWeekFromNow.setDate(now.getDate() + 7);

    // Filter records expiring within 1 week
    let filteredRecords = records.filter((record) => {
      // Only consider active records
      if (record.status !== 'active') return false;

      // Check if expiration_date exists
      if (!record.expiration_date) return false;

      const expirationDate = new Date(record.expiration_date);

      // Exclude already expired records
      if (expirationDate < now) return false;

      // Include records expiring within the next 7 days
      if (expirationDate <= oneWeekFromNow) return true;

      return false;
    });

    // Apply role-based filtering
    if (userProfile.role === 'campus_admin') {
      // Campus admins only see notifications for their campus
      // Filter by matching campus_id
      if (userProfile.campus_id) {
        filteredRecords = filteredRecords.filter(
          (record) => record.campus_id === userProfile.campus_id
        );
      }
    }
    // district_admin and master_admin see all expiring records (no additional filtering)

    return {
      count: filteredRecords.length,
      expiringRecords: filteredRecords,
    };
  }, [records, userProfile]);
}
