import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { TenantsManagementClient } from './TenantsManagementClient';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const metadata = {
  title: 'Manage Tenants | Admin',
  description: 'Manage organizations and districts',
};

export default async function TenantsManagementPage() {
  // Check if user is master admin
  const { userId } = await auth();
  if (!userId) {
    redirect('/login');
  }

  const { data: userProfile } = await supabaseAdmin
    .from('user_profiles')
    .select('role')
    .eq('id', userId)
    .single();

  // Only master_admin can access tenants management
  if (!userProfile || userProfile.role !== 'master_admin') {
    redirect('/admin');
  }

  return <TenantsManagementClient />;
}
