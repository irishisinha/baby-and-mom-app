require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  console.log('Checking all appointments in database...\n');
  
  const { data: all, error: err1 } = await supabase
    .from('appointments')
    .select('id, doctor, appointment_date')
    .order('appointment_date');

  if (err1) {
    console.error('Error:', err1);
    process.exit(1);
  }

  console.log(`Total records: ${all.length}`);
  console.log('\nRecords by date:');
  
  const byDate = {};
  all.forEach(a => {
    if (!byDate[a.appointment_date]) byDate[a.appointment_date] = [];
    byDate[a.appointment_date].push(a.doctor);
  });
  
  Object.keys(byDate).sort().forEach(date => {
    console.log(`  ${date}: ${byDate[date].length} appointments`);
  });

  console.log('\nFirst 5 records:');
  all.slice(0, 5).forEach(a => {
    console.log(`  ${a.doctor} -> ${a.appointment_date}`);
  });

  process.exit(0);
}

check().catch(err => {
  console.error(err);
  process.exit(1);
});
