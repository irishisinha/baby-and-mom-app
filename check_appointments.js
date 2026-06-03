const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Read .env.local
const env = {};
fs.readFileSync('.env.local', 'utf8').split('\n').forEach(line => {
  const [key, ...value] = line.split('=');
  if (key && value) env[key.trim()] = value.join('=').trim();
});

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  // Check baby_metrics for appointment entries
  const { data: metrics, error: metricsError } = await supabase
    .from('baby_metrics')
    .select('metric_type, value, unit, created_at, sent_from_phone')
    .eq('metric_type', 'next_appointment')
    .order('created_at', { ascending: false })
    .limit(20);

  console.log('\n📅 APPOINTMENT ENTRIES IN baby_metrics:');
  console.log('═'.repeat(80));
  if (metrics && metrics.length > 0) {
    metrics.forEach(m => {
      const timestamp = new Date(m.created_at).toLocaleString();
      const phone = m.sent_from_phone || 'Dashboard';
      console.log(`${timestamp} | Value: ${m.value} | From: ${phone}`);
    });
  } else {
    console.log('⚠️  NO APPOINTMENT ENTRIES FOUND');
  }

  // Check appointments table
  const { data: appts, error: apptsError } = await supabase
    .from('appointments')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  console.log('\n📅 APPOINTMENTS TABLE (Last 10):');
  console.log('═'.repeat(80));
  if (appts && appts.length > 0) {
    appts.forEach(a => {
      const created = new Date(a.created_at).toLocaleString();
      console.log(`${created} | Dr: ${a.doctor} | Date: ${a.appointment_date} | Time: ${a.appointment_time} | Reason: ${a.reason}`);
    });
  } else {
    console.log('NO APPOINTMENTS FOUND');
  }

  console.log('═'.repeat(80));
})();
