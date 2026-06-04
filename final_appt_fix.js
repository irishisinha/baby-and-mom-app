const fs = require('fs');
const content = fs.readFileSync('app/api/whatsapp/webhook/route.ts', 'utf-8');

// Find where appointments table insert ends and add metrics logging right after
const appointmentsInsertEnd = content.indexOf("            notes: `From WhatsApp: ${phoneNumber}`\n          });");

if (appointmentsInsertEnd !== -1) {
  const insertPosition = appointmentsInsertEnd + "            notes: `From WhatsApp: ${phoneNumber}`\n          });".length;
  
  const metricsLogging = `
          
          // Backup: also log to metrics table
          const appointeeNames: any = { 'shiva': 'Shiva (Mom)', 'rishi': 'Rishi (Dad)', 'ichi': 'Ichi (Grandmom)', 'jaian': 'Jaian (Baby)' };
          await supabase.from('baby_metrics').insert({
            family_id: PILOT_FAMILY_ID,
            baby_id: PILOT_BABY_ID,
            metric_type: 'next_appointment',
            value: appointeeNames[metric.appointmentFor] || 'appointment',
            unit: 'scheduled',
            sent_from_phone: phoneNumber,
            created_at: timestamp,
            notes: metricText
          }).catch(() => null);
          
          successCount++;`;
  
  const newContent = content.slice(0, insertPosition) + metricsLogging + content.slice(insertPosition);
  fs.writeFileSync('app/api/whatsapp/webhook/route.ts', newContent, 'utf-8');
  console.log('Added metrics backup logging for appointments');
} else {
  console.log('Could not find insertion point');
}
