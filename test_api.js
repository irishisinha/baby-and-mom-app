require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testAPI() {
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .order('appointment_date', { ascending: true });

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('API would return:');
    data.slice(0, 3).forEach(a => {
      console.log(`  ${a.doctor} -> ${a.appointment_date}`);
    });
  }
  
  process.exit(0);
}

testAPI().catch(err => console.error(err) && process.exit(1));
