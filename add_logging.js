const fs = require('fs');
let content = fs.readFileSync('app/api/whatsapp/webhook/route.ts', 'utf-8');

// Find the appointment parsing section and add logging
const appointmentCheck = "if (cleanText.includes('next') || cleanText.includes('appt') || cleanText.includes('appoint')) {";
const appointmentCheckWithLogging = `if (cleanText.includes('next') || cleanText.includes('appt') || cleanText.includes('appoint')) {
    console.log('[APPOINTMENT] Detected appointment in:', metricText);`;

if (content.includes(appointmentCheck)) {
  content = content.replace(appointmentCheck, appointmentCheckWithLogging);
  
  // Also add logging before the metric check
  const metricCheckLine = "if (metric) {";
  const metricCheckWithLogging = `if (metric) {
        console.log('[METRIC] Parsed metric:', { type: metric.type, appointmentFor: metric.appointmentFor });`;
  
  if (content.includes(metricCheckLine)) {
    content = content.replace(metricCheckLine, metricCheckWithLogging);
  }
  
  fs.writeFileSync('app/api/whatsapp/webhook/route.ts', content, 'utf-8');
  console.log('Added logging for debugging');
} else {
  console.log('Pattern not found');
}
