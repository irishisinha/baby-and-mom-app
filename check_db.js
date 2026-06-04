require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkDates() {
  const { data } = await supabase
    .from('appointments')
    .select('doctor, appointment_date')
    .order('appointment_date', { ascending: true });

  console.log('Appointments in database:');
  data.forEach(a => {
    console.log(`  ${a.doctor} -> ${a.appointment_date}`);
  });
  
  process.exit(0);
}

checkDates().catch(err => {
  console.error(err);
  process.exit(1);
});
