import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { userId } = await auth.protect();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch user's tenant_id from Supabase
    const { data: profile, error } = await supabaseAdmin
      .from('user_profiles')
      .select('tenant_id')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json({ tenant_id: profile.tenant_id });
  } catch (error) {
    console.error('Error fetching user tenant:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
