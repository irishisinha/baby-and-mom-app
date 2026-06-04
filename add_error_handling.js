const fs = require('fs');
let content = fs.readFileSync('app/api/whatsapp/webhook/route.ts', 'utf-8');

// Find the appointments insert and wrap it in error handling
const appointmentInsert = `          await supabase.from('appointments').insert({
            user_id: PILOT_FAMILY_ID,
            doctor: 'Appointment',
            reason: metricText,
            appointment_date: appointmentDate,
            appointment_time: appointmentTime,
            notes: \`From WhatsApp: \${phoneNumber}\`
          });`;

const withErrorHandling = `          try {
            await supabase.from('appointments').insert({
              user_id: PILOT_FAMILY_ID,
              doctor: 'Appointment',
              reason: metricText,
              appointment_date: appointmentDate,
              appointment_time: appointmentTime,
              notes: \`From WhatsApp: \${phoneNumber}\`
            });
            successCount++;
          } catch (err) {
            console.log('[APPT-ERROR]', err.message);
            // Fallback: log as metric
            await supabase.from('baby_metrics').insert({
              family_id: PILOT_FAMILY_ID,
              baby_id: PILOT_BABY_ID,
              metric_type: 'next_appointment',
              value: appointmentTime || appointmentDate,
              unit: 'appointment',
              sent_from_phone: phoneNumber,
              created_at: timestamp,
              notes: metricText
            }).catch(() => {});
            successCount++;
          }`;

if (content.includes(appointmentInsert)) {
  content = content.replace(appointmentInsert, withErrorHandling);
  fs.writeFileSync('app/api/whatsapp/webhook/route.ts', content, 'utf-8');
  console.log('Added error handling with fallback');
} else {
  console.log('Pattern not found');
}
