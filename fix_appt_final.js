const fs = require('fs');
let content = fs.readFileSync('app/api/whatsapp/webhook/route.ts', 'utf-8');

// Find the appointment insertion and add successCount + metrics logging
const appointmentInsert = `          await supabase.from('appointments').insert({
            user_id: PILOT_FAMILY_ID,
            doctor: 'Appointment',
            reason: metricText,
            appointment_date: appointmentDate,
            appointment_time: appointmentTime,
            notes: \`From WhatsApp: \${phoneNumber}\`
          });`;

const replacementCode = `          // Try to insert into appointments table
          await supabase.from('appointments').insert({
            user_id: PILOT_FAMILY_ID,
            doctor: 'Appointment',
            reason: metricText,
            appointment_date: appointmentDate,
            appointment_time: appointmentTime,
            notes: \`From WhatsApp: \${phoneNumber}\`
          }).catch(() => {});
          
          // Also log to metrics as backup
          await supabase.from('baby_metrics').insert({
            family_id: PILOT_FAMILY_ID,
            baby_id: PILOT_BABY_ID,
            metric_type: 'next_appointment',
            value: \`\${appointeeNames[metric.appointmentFor]}: \${appointmentTime || appointmentDate}\`,
            unit: 'appointment',
            sent_from_phone: phoneNumber,
            created_at: timestamp,
            notes: \`Appointment: \${metricText}\`
          }).catch(() => {});
          
          successCount++;`;

if (content.includes(appointmentInsert)) {
  content = content.replace(appointmentInsert, replacementCode);
  fs.writeFileSync('app/api/whatsapp/webhook/route.ts', content, 'utf-8');
  console.log('Fixed appointment logging');
} else {
  console.log('Pattern not found');
}
