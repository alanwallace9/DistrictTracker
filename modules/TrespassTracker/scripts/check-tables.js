// Quick script to check if photo/document tables exist in Supabase
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkTables() {
  console.log('\n🔍 Checking Supabase database tables...\n');

  // Check record_photos table
  try {
    const { data, error } = await supabase
      .from('record_photos')
      .select('id')
      .limit(1);

    if (error && error.code === '42P01') {
      console.log('❌ record_photos table does NOT exist');
    } else if (error) {
      console.log('⚠️  record_photos - Error:', error.message);
    } else {
      console.log('✅ record_photos table exists');
    }
  } catch (err) {
    console.log('❌ record_photos - Error:', err.message);
  }

  // Check record_documents table
  try {
    const { data, error } = await supabase
      .from('record_documents')
      .select('id')
      .limit(1);

    if (error && error.code === '42P01') {
      console.log('❌ record_documents table does NOT exist');
    } else if (error) {
      console.log('⚠️  record_documents - Error:', error.message);
    } else {
      console.log('✅ record_documents table exists');
    }
  } catch (err) {
    console.log('❌ record_documents - Error:', err.message);
  }

  // Check storage buckets
  try {
    const { data, error } = await supabase
      .storage
      .listBuckets();

    if (error) {
      console.log('\n⚠️  Could not list buckets:', error.message);
    } else {
      console.log('\n📦 Storage buckets:');
      const photosBucket = data.find(b => b.id === 'record-photos');
      const docsBucket = data.find(b => b.id === 'record-documents');

      console.log(photosBucket ? '✅ record-photos bucket exists' : '❌ record-photos bucket does NOT exist');
      console.log(docsBucket ? '✅ record-documents bucket exists' : '❌ record-documents bucket does NOT exist');
    }
  } catch (err) {
    console.log('\n❌ Buckets - Error:', err.message);
  }

  console.log('\n✅ Check complete!\n');
}

checkTables();
