const fs = require('fs');
let content = fs.readFileSync('app/api/whatsapp/webhook/route.ts', 'utf-8');

// Find the appointment insertion code and replace it to ONLY log to metrics
const startMarker = "        // For appointments, store in appointments table\n        if (metric.type === 'next_appointment' && metric.appointmentFor) {";
const endMarker = "          successCount++;";

const startIdx = content.indexOf(startMarker);
const endIdx = content.indexOf(endMarker, startIdx) + endMarker.length;

if (startIdx !== -1 && endIdx > startIdx) {
  const replacement = `        // For appointments, log to metrics table for now
        if (metric.type === 'next_appointment' && metric.appointmentFor) {
          // Temporarily log appointments as metrics to verify parsing works
          const appointeeNames: any = { 'shiva': 'Shiva (Mom)', 'rishi': 'Rishi (Dad)', 'ichi': 'Ichi (Grandmom)', 'jaian': 'Jaian (Baby)' };
          
          await supabase.from('baby_metrics').insert({
            family_id: PILOT_FAMILY_ID,
            baby_id: PILOT_BABY_ID,
            metric_type: 'next_appointment',
            value: appointeeNames[metric.appointmentFor],
            unit: 'appointment',
            sent_from_phone: phoneNumber,
            created_at: timestamp,
            notes: \`Appointment: \${metric.value} (\${metricText})\`
          });
          successCount++;`;
  
  content = content.slice(0, startIdx) + replacement + content.slice(endIdx);
  fs.writeFileSync('app/api/whatsapp/webhook/route.ts', content, 'utf-8');
  console.log('Updated to log appointments as metrics');
} else {
  console.log('Could not find appointment section');
}
