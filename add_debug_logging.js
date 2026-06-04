const fs = require('fs');
let content = fs.readFileSync('app/api/whatsapp/webhook/route.ts', 'utf-8');

// Find the appointment insert section and add a metrics insert as well
const appointmentInsertStart = content.indexOf('          await supabase.from(\'appointments\').insert({');
const appointmentInsertEnd = content.indexOf('          });', appointmentInsertStart) + '          });'.length;

if (appointmentInsertStart !== -1 && appointmentInsertEnd !== -1) {
  const metricsInsert = `
          // DEBUG: Also log to metrics table temporarily
          await supabase.from('baby_metrics').insert({
            family_id: PILOT_FAMILY_ID,
            baby_id: PILOT_BABY_ID,
            metric_type: 'next_appointment',
            value: appointmentTime || appointmentDate,
            unit: 'appointment',
            sent_from_phone: phoneNumber,
            created_at: timestamp,
            notes: \`DEBUG APPOINTMENT: \${metricText}\`
          }).catch(() => {});`;
  
  content = content.slice(0, appointmentInsertEnd) + metricsInsert + content.slice(appointmentInsertEnd);
  fs.writeFileSync('app/api/whatsapp/webhook/route.ts', content, 'utf-8');
  console.log('Added debug logging for appointments');
} else {
  console.log('Could not find appointment insert section');
}
