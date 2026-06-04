const fs = require('fs');
let content = fs.readFileSync('app/api/whatsapp/webhook/route.ts', 'utf-8');

// Add logging right after parseMetric is called
const metricCallLine = `      const metric = parseMetric(metricText);

      if (metric) {`;

const loggingCode = `      const metric = parseMetric(metricText);
      if (metricText.toLowerCase().includes('appt') || metricText.toLowerCase().includes('next') || metricText.toLowerCase().includes('appoint')) {
        console.log('[DEBUG] Appointment message detected:', metricText);
        console.log('[DEBUG] Parsed metric:', JSON.stringify(metric));
      }

      if (metric) {`;

if (content.includes(metricCallLine)) {
  content = content.replace(metricCallLine, loggingCode);
  fs.writeFileSync('app/api/whatsapp/webhook/route.ts', content, 'utf-8');
  console.log('Added diagnostic logging');
} else {
  console.log('Pattern not found');
}
