// Normalize status values in database
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gnbxdjiibwjaurybohak.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImduYnhkamlpYndqYXVyeWJvaGFrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTQ0MjQxMywiZXhwIjoyMDc1MDE4NDEzfQ.pjkaFcE65XPpJtkVlL2Kss-FgKjNwzRILiinTID_FlU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function normalizeStatuses() {
  console.log('Normalizing status values...');

  // Update 'Active' to 'active'
  const { data: active, error: error1 } = await supabase
    .from('trespass_records')
    .update({ status: 'active' })
    .eq('status', 'Active')
    .select('id');

  if (error1) {
    console.error('Error updating Active:', error1);
  } else {
    console.log(`✅ Updated ${active?.length || 0} records from 'Active' to 'active'`);
  }

  // Update 'Expired' to 'inactive'
  const { data: expired, error: error2 } = await supabase
    .from('trespass_records')
    .update({ status: 'inactive' })
    .eq('status', 'Expired')
    .select('id');

  if (error2) {
    console.error('Error updating Expired:', error2);
  } else {
    console.log(`✅ Updated ${expired?.length || 0} records from 'Expired' to 'inactive'`);
  }

  // Check final status distribution
  const { data: final, error: error3 } = await supabase
    .from('trespass_records')
    .select('status');

  if (error3) {
    console.error('Error checking final status:', error3);
  } else {
    const counts = final.reduce((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    }, {});
    console.log('\n📊 Final status distribution:', counts);
  }
}

normalizeStatuses();
