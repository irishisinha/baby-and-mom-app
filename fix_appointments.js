require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixAppointments() {
  const { data } = await supabase
    .from('appointments')
    .select('*')
    .eq('appointment_date', '2026-06-03');

  console.log(`Found ${data.length} appointments to fix`);

  const dateMap = {
    '04 Jun': '2026-06-04',
    '05 Jun': '2026-06-05',
    '06 Jun': '2026-06-06',
    '07 Jun': '2026-06-07',
    '10 Jun': '2026-06-10',
    '15 Jun': '2026-06-15'
  };

  for (const appt of data) {
    let newDate = '2026-06-03';
    for (const [pattern, date] of Object.entries(dateMap)) {
      if (appt.doctor.includes(pattern)) {
        newDate = date;
        break;
      }
    }
    
    if (newDate !== '2026-06-03') {
      await supabase
        .from('appointments')
        .update({ appointment_date: newDate })
        .eq('id', appt.id);
      console.log(`Updated ${appt.doctor} to ${newDate}`);
    }
  }

  console.log('Done!');
  process.exit(0);
}

fixAppointments().catch(err => {
  console.error(err);
  process.exit(1);
});
