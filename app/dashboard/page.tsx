import { createServerClient } from '@/lib/supabase/server';
import { DashboardClient } from '@/components/DashboardClient';
import { revalidatePath } from 'next/cache';

export default async function DashboardPage() {
  const supabase = await createServerClient();

  // Fetch records server-side
  const { data: records, error } = await supabase
    .from('trespass_records')
    .select('*')
    .is('deleted_at', null)
    .order('incident_date', { ascending: false });

  if (error) {
    console.error('Error fetching records:', error);
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-red-500">Error loading records: {error.message}</div>
      </div>
    );
  }

  // Server Action for refresh
  async function refreshRecords() {
    'use server';
    revalidatePath('/dashboard');
  }

  return <DashboardClient initialRecords={records || []} onRefresh={refreshRecords} />;
}
