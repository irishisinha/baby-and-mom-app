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
  const { data, error } = await supabase
    .from('baby_metrics')
    .select('metric_type, value, unit, created_at, sent_from_phone')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.log('ERROR:', error);
  } else {
    console.log('\n✅ LATEST METRICS (Last 10):');
    console.log('═'.repeat(80));
    data.forEach(m => {
      const timestamp = new Date(m.created_at).toLocaleString();
      const phone = m.sent_from_phone || 'Dashboard';
      console.log(`${timestamp} | ${m.metric_type.padEnd(15)} | ${String(m.value).padEnd(8)} ${m.unit} | From: ${phone}`);
    });
    console.log('═'.repeat(80));
  }
})();
