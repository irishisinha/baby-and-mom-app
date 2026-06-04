const fs = require('fs');
let content = fs.readFileSync('app/api/whatsapp/webhook/route.ts', 'utf-8');

// Find the appointments insert and add appointee_for field
const oldInsert = `          await supabase.from('appointments').insert({
            user_id: PILOT_FAMILY_ID,
            doctor: 'Appointment',
            reason: metricText,
            appointment_date: appointmentDate,
            appointment_time: appointmentTime,
            notes: \`From WhatsApp: \${phoneNumber}\`
          });`;

const newInsert = `          const appointeeNames: any = { 'shiva': 'Shiva (Mom)', 'rishi': 'Rishi (Dad)', 'ichi': 'Ichi (Grandmom)', 'jaian': 'Jaian (Baby)' };
          
          await supabase.from('appointments').insert({
            user_id: PILOT_FAMILY_ID,
            doctor: 'Appointment',
            reason: metricText,
            appointment_date: appointmentDate,
            appointment_time: appointmentTime,
            appointee_for: appointeeNames[metric.appointmentFor] || metric.appointmentFor,
            notes: \`From WhatsApp: \${phoneNumber}\`
          });
          successCount++;`;

if (content.includes(oldInsert)) {
  content = content.replace(oldInsert, newInsert);
  fs.writeFileSync('app/api/whatsapp/webhook/route.ts', content, 'utf-8');
  console.log('Added appointee_for field to insert');
} else {
  console.log('Pattern not found');
}
