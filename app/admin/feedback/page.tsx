import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { getAdminFeedback, getAdminCategories } from '@/app/actions/feedback';
import { AdminFeedbackPanel } from './AdminFeedbackPanel';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const metadata = {
  title: 'Manage Feedback | Admin',
  description: 'Manage user feedback and feature requests',
};

export default async function AdminFeedbackPage() {
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

  if (!userProfile || userProfile.role !== 'master_admin') {
    redirect('/dashboard');
  }

  // Fetch all feedback and categories
  const { data: feedback } = await getAdminFeedback({ sort: 'recent' });
  const { data: categories } = await getAdminCategories();

  return <AdminFeedbackPanel initialFeedback={feedback} categories={categories} />;
}
