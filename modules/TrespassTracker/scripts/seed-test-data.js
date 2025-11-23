// Script to seed test data into Supabase
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gnbxdjiibwjaurybohak.supabase.co';
// Use service role key to bypass RLS for seeding
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImduYnhkamlpYndqYXVyeWJvaGFrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTQ0MjQxMywiZXhwIjoyMDc1MDE4NDEzfQ.pjkaFcE65XPpJtkVlL2Kss-FgKjNwzRILiinTID_FlU';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const testRecords = [
  {
    user_id: 'test-user-id',
    first_name: 'John',
    last_name: 'Doe',
    aka: null,
    date_of_birth: '2005-03-15',
    school_id: 'STU-001',
    known_associates: null,
    current_school: 'Lincoln High',
    guardian_first_name: 'Jane',
    guardian_last_name: 'Doe',
    guardian_phone: '555-0101',
    contact_info: 'jane.doe@example.com',
    incident_date: '2024-09-15',
    location: 'Main Building, 2nd Floor',
    description: 'Found in unauthorized area after school hours',
    notes: 'First offense, verbal warning given',
    photo_url: null,
    status: 'active',
    is_former_student: false,
    expiration_date: '2025-09-15',
    trespassed_from: 'Main Campus',
    original_image_url: null,
    cached_image_url: null
  },
  {
    user_id: 'test-user-id',
    first_name: 'Sarah',
    last_name: 'Smith',
    aka: 'Sally',
    date_of_birth: '2004-07-22',
    school_id: 'STU-002',
    known_associates: 'John Doe',
    current_school: null,
    guardian_first_name: 'Robert',
    guardian_last_name: 'Smith',
    guardian_phone: '555-0102',
    contact_info: 'robert.smith@example.com',
    incident_date: '2024-08-10',
    location: 'Athletic Field',
    description: 'Trespassing on school grounds during weekend',
    notes: 'Former student, repeated violations',
    photo_url: null,
    status: 'active',
    is_former_student: true,
    expiration_date: '2026-08-10',
    trespassed_from: 'Athletic Complex',
    original_image_url: null,
    cached_image_url: null
  },
  {
    user_id: 'test-user-id',
    first_name: 'Michael',
    last_name: 'Johnson',
    aka: 'Mike',
    date_of_birth: '2003-11-08',
    school_id: null,
    known_associates: null,
    current_school: null,
    guardian_first_name: null,
    guardian_last_name: null,
    guardian_phone: null,
    contact_info: null,
    incident_date: '2024-01-20',
    location: 'Parking Lot C',
    description: 'Unauthorized vehicle on school property',
    notes: 'Law enforcement contacted',
    photo_url: null,
    status: 'inactive',
    is_former_student: false,
    expiration_date: '2024-07-20',
    trespassed_from: 'All School Property',
    original_image_url: null,
    cached_image_url: null
  },
  {
    user_id: 'test-user-id',
    first_name: 'Emily',
    last_name: 'Williams',
    aka: null,
    date_of_birth: '2006-05-30',
    school_id: 'STU-003',
    known_associates: 'Sarah Smith',
    current_school: 'Washington Middle',
    guardian_first_name: 'Lisa',
    guardian_last_name: 'Williams',
    guardian_phone: '555-0103',
    contact_info: 'lisa.w@example.com',
    incident_date: '2024-10-01',
    location: 'Library',
    description: 'Disruptive behavior, asked to leave',
    notes: 'Second offense this semester',
    photo_url: null,
    status: 'active',
    is_former_student: false,
    expiration_date: '2025-03-01',
    trespassed_from: 'Library Building',
    original_image_url: null,
    cached_image_url: null
  },
  {
    user_id: 'test-user-id',
    first_name: 'David',
    last_name: 'Brown',
    aka: null,
    date_of_birth: '2002-12-18',
    school_id: null,
    known_associates: 'Michael Johnson',
    current_school: null,
    guardian_first_name: null,
    guardian_last_name: null,
    guardian_phone: null,
    contact_info: null,
    incident_date: '2023-11-05',
    location: 'East Entrance',
    description: 'Unauthorized entry during school event',
    notes: 'Expired - no recent incidents',
    photo_url: null,
    status: 'inactive',
    is_former_student: true,
    expiration_date: '2024-05-05',
    trespassed_from: 'All Buildings',
    original_image_url: null,
    cached_image_url: null
  }
];

async function seedData() {
  console.log('Seeding test data to Supabase...');

  const { data, error } = await supabase
    .from('trespass_records')
    .insert(testRecords)
    .select();

  if (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }

  console.log(`✅ Successfully inserted ${data.length} test records`);
  console.log('Sample record:', data[0]);
}

seedData();
