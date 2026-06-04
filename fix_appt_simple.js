const fs = require('fs');
let content = fs.readFileSync('app/api/whatsapp/webhook/route.ts', 'utf-8');

// Find the line with "});  " after appointments insert and add metrics logging before it
const lines = content.split('\n');
let inAppointmentBlock = false;
let appointmentBlockEnd = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("await supabase.from('appointments').insert({")) {
    inAppointmentBlock = true;
  }
  if (inAppointmentBlock && lines[i].trim() === '});' && lines[i+1].includes('} else {')) {
    appointmentBlockEnd = i;
    break;
  }
}

if (appointmentBlockEnd !== -1) {
  const metricsInsert = `          
          // Also log to metrics table
          const appointeeNames: any = { 'shiva': 'Shiva (Mom)', 'rishi': 'Rishi (Dad)', 'ichi': 'Ichi (Grandmom)', 'jaian': 'Jaian (Baby)' };
          await supabase.from('baby_metrics').insert({
            family_id: PILOT_FAMILY_ID,
            baby_id: PILOT_BABY_ID,
            metric_type: 'next_appointment',
            value: appointeeNames[metric.appointmentFor] || metric.appointmentFor,
            unit: 'appointment',
            sent_from_phone: phoneNumber,
            created_at: timestamp,
            notes: metricText
          }).catch(() => {});
          successCount++;`;
  
  lines.splice(appointmentBlockEnd, 0, metricsInsert);
  fs.writeFileSync('app/api/whatsapp/webhook/route.ts', lines.join('\n'), 'utf-8');
  console.log('Added metrics logging for appointments');
} else {
  console.log('Could not find appointment block end');
}
