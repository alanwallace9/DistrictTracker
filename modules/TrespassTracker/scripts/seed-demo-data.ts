/**
 * Seed Demo Data Script
 *
 * This script populates the demo tenant with sample trespass records.
 * Run this manually to test the demo environment or to restore demo data.
 *
 * Usage:
 *   npx ts-node scripts/seed-demo-data.ts
 *
 * Requirements:
 *   - NEXT_PUBLIC_SUPABASE_URL in .env
 *   - SUPABASE_SERVICE_ROLE_KEY in .env
 *   - Demo Clerk users created with their IDs updated below
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ============================================================
// TODO: Update these with actual Clerk user IDs after creation
// ============================================================
const DEMO_ADMIN_USER_ID = 'user_REPLACE_WITH_ADMIN_ID';
const DEMO_VIEWER_USER_ID = 'user_REPLACE_WITH_VIEWER_ID';

async function seedDemoData() {
  console.log('🌱 Starting demo data seed...\n');

  // Verify demo tenant exists
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', 'demo')
    .single();

  if (tenantError || !tenant) {
    console.error('❌ Demo tenant not found. Run migration first!');
    process.exit(1);
  }

  console.log('✓ Demo tenant found:', tenant.display_name);

  // Delete existing demo records
  console.log('\n🗑️  Deleting existing demo records...');
  const { error: deleteError } = await supabase
    .from('trespass_records')
    .delete()
    .eq('tenant_id', 'demo');

  if (deleteError) {
    console.error('❌ Error deleting records:', deleteError);
    process.exit(1);
  }
  console.log('✓ Existing demo records deleted');

  // Prepare seed data
  const seedData = getSeedData();
  console.log(`\n📝 Inserting ${seedData.length} demo records...`);

  const { data, error: insertError } = await supabase
    .from('trespass_records')
    .insert(seedData)
    .select();

  if (insertError) {
    console.error('❌ Error inserting records:', insertError);
    process.exit(1);
  }

  console.log(`✓ Successfully inserted ${data?.length || 0} records`);

  // Display summary
  console.log('\n📊 Summary:');
  console.log(`   Total Records: ${data?.length || 0}`);
  console.log(`   Active Records: ${data?.filter(r => r.status === 'active').length || 0}`);
  console.log(`   Tenant: demo`);
  console.log(`   Users: ${DEMO_ADMIN_USER_ID}, ${DEMO_VIEWER_USER_ID}`);

  console.log('\n✅ Demo data seeded successfully!');
  console.log('\n💡 Next steps:');
  console.log('   1. Update DEMO_ADMIN_USER_ID and DEMO_VIEWER_USER_ID in this script');
  console.log('   2. Visit demo.districttracker.com/demo-login to test');
  console.log('   3. Deploy cron job to Vercel for hourly resets');
}

function getSeedData() {
  const today = new Date();
  const daysFromNow = (days: number): string => {
    const date = new Date(today);
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  };
  const daysAgo = (days: number): string => {
    const date = new Date(today);
    date.setDate(date.getDate() - days);
    return date.toISOString().split('T')[0];
  };

  return [
    // 1. Active record - Recent trespass
    {
      user_id: DEMO_ADMIN_USER_ID,
      tenant_id: 'demo',
      first_name: 'John',
      last_name: 'Doe',
      aka: 'JD',
      date_of_birth: '2005-03-15',
      school_id: 'STU123456',
      known_associates: 'Mike Smith, Sarah Johnson',
      current_school: 'N/A',
      guardian_first_name: 'Robert',
      guardian_last_name: 'Doe',
      guardian_phone: '555-0123',
      contact_info: 'robert.doe@email.com',
      incident_date: daysAgo(10),
      location: 'Lincoln High School - Main Entrance',
      description:
        'Individual found on campus after hours without authorization. Refused to leave when asked by security.',
      notes: 'Has been warned previously. Security footage captured.',
      photo_url: null,
      status: 'active',
      is_current_student: false,
      expiration_date: daysFromNow(355),
      trespassed_from: 'All Lincoln High School campuses',
    },

    // 2. Active - Former student
    {
      user_id: DEMO_ADMIN_USER_ID,
      tenant_id: 'demo',
      first_name: 'Marcus',
      last_name: 'Thompson',
      aka: 'Marc',
      date_of_birth: '2004-11-30',
      school_id: 'STU987654',
      known_associates: 'Trevor Williams (current student)',
      current_school: 'N/A - Graduated 2023',
      guardian_first_name: 'James',
      guardian_last_name: 'Thompson',
      guardian_phone: '555-0789',
      contact_info: 'j.thompson@email.com',
      incident_date: daysAgo(5),
      location: 'Roosevelt High School - Athletic Field',
      description:
        'Former student found on campus attempting to meet with current students. Previously expelled for disciplinary issues.',
      notes:
        'Was expelled in junior year. Known to have conflicts with current staff. Police were called.',
      photo_url: null,
      status: 'active',
      is_current_student: true,
      expiration_date: daysFromNow(725),
      trespassed_from: 'All district facilities',
    },

    // 3. Expired record
    {
      user_id: DEMO_VIEWER_USER_ID,
      tenant_id: 'demo',
      first_name: 'Emily',
      last_name: 'Rodriguez',
      aka: null,
      date_of_birth: '2003-08-22',
      school_id: 'STU555888',
      known_associates: null,
      current_school: 'N/A',
      guardian_first_name: 'Maria',
      guardian_last_name: 'Rodriguez',
      guardian_phone: '555-0456',
      contact_info: 'maria.r@email.com',
      incident_date: daysAgo(400),
      location: 'Washington Middle School - Parking Lot',
      description:
        'Found loitering in parking lot during school hours. No legitimate reason for being on campus.',
      notes: 'Cooperative with staff. Left without incident.',
      photo_url: null,
      status: 'active',
      is_current_student: false,
      expiration_date: daysAgo(35),
      trespassed_from: 'Washington Middle School',
    },

    // 4. Active - Minimal information
    {
      user_id: DEMO_ADMIN_USER_ID,
      tenant_id: 'demo',
      first_name: 'Sarah',
      last_name: 'Williams',
      aka: null,
      date_of_birth: null,
      school_id: 'UNKNOWN',
      known_associates: null,
      current_school: null,
      guardian_first_name: null,
      guardian_last_name: null,
      guardian_phone: null,
      contact_info: null,
      incident_date: daysAgo(2),
      location: 'Jefferson Elementary - Front Office',
      description: 'Attempted to gain unauthorized access to school records.',
      notes: null,
      photo_url: null,
      status: 'active',
      is_current_student: false,
      expiration_date: daysFromNow(180),
      trespassed_from: 'Jefferson Elementary School',
    },

    // 5. Active - Multiple associates
    {
      user_id: DEMO_VIEWER_USER_ID,
      tenant_id: 'demo',
      first_name: 'David',
      last_name: 'Chen',
      aka: 'Dave',
      date_of_birth: '2006-05-18',
      school_id: 'STU334455',
      known_associates: 'Kevin Zhang, Lisa Park, Tommy Lee',
      current_school: 'Transferred to private school',
      guardian_first_name: 'Wei',
      guardian_last_name: 'Chen',
      guardian_phone: '555-9988',
      contact_info: 'w.chen@email.com',
      incident_date: daysAgo(15),
      location: 'Madison High School - Gymnasium',
      description: 'Participated in unauthorized gathering. Caused disturbance during school event.',
      notes: 'Third incident this year. Escalate to district admin.',
      photo_url: null,
      status: 'active',
      is_current_student: false,
      expiration_date: daysFromNow(540),
      trespassed_from: 'All district high schools',
    },

    // 6. Active - Recent with complete info
    {
      user_id: DEMO_ADMIN_USER_ID,
      tenant_id: 'demo',
      first_name: 'Amanda',
      last_name: 'Foster',
      aka: 'Mandy',
      date_of_birth: '2005-09-12',
      school_id: 'STU776655',
      known_associates: 'None known',
      current_school: 'Homeschooled',
      guardian_first_name: 'Linda',
      guardian_last_name: 'Foster',
      guardian_phone: '555-3344',
      contact_info: 'l.foster@email.com',
      incident_date: daysAgo(1),
      location: 'Central High School - Library',
      description: 'Unauthorized attempt to access student computers. Confronted by staff.',
      notes: 'First offense. Guardian contacted and cooperative.',
      photo_url: null,
      status: 'active',
      is_current_student: false,
      expiration_date: daysFromNow(90),
      trespassed_from: 'Central High School',
    },
  ];
}

// Run the seed
seedDemoData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Seed failed:', error);
    process.exit(1);
  });
