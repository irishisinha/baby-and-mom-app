const fs = require('fs');
let content = fs.readFileSync('app/api/whatsapp/webhook/route.ts', 'utf-8');

// Find and replace ONLY the appointment condition check and insert
const oldCode = `        if (metric.type === 'next_appointment' && metric.appointmentFor) {
          // Extract date and time from metric value (e.g., "04 Jun 5pm")
          let appointmentDate = dateStr || new Date(timestamp).toISOString().split('T')[0];
          let appointmentTime = '';
          
          // Parse date: "04 Jun 5pm" -> date: "2026-06-04", time: "5pm"
          const dateTimeMatch = metric.value.match(/(\d{1,2})\s+([a-z]+)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
          if (dateTimeMatch) {
            const day = dateTimeMatch[1].padStart(2, '0');
            const monthNum = getMonthNumber(dateTimeMatch[2]);
            const year = new Date().getFullYear();
            const hour = dateTimeMatch[3];
            const minute = dateTimeMatch[4] || '00';
            const ampm = dateTimeMatch[5] || 'am';
            
            appointmentDate = \`\${year}-\${monthNum}-\${day}\`;
            appointmentTime = \`\${hour}:\${minute} \${ampm}\`;
          }
          
          // Map appointeeFor codes to readable names
          const appointeeNames: any = { 'shiva': 'Shiva (Mom)', 'rishi': 'Rishi (Dad)', 'ichi': 'Ichi (Grandmom)', 'jaian': 'Jaian (Baby)' };
          
          await supabase.from('appointments').insert({
            user_id: PILOT_FAMILY_ID,
            doctor: 'Appointment',
            reason: metricText,
            appointment_date: appointmentDate,
            appointment_time: appointmentTime,
            notes: \`From WhatsApp: \${phoneNumber}\`
          });`;

const newCode = `        if (metric.type === 'next_appointment' && metric.appointmentFor) {
          // Extract date and time from metric value (e.g., "04 Jun 5pm")
          let appointmentDate = dateStr || new Date(timestamp).toISOString().split('T')[0];
          let appointmentTime = '';
          
          // Parse date: "04 Jun 5pm" -> date: "2026-06-04", time: "5pm"
          const dateTimeMatch = metric.value.match(/(\d{1,2})\s+([a-z]+)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
          if (dateTimeMatch) {
            const day = dateTimeMatch[1].padStart(2, '0');
            const monthNum = getMonthNumber(dateTimeMatch[2]);
            const year = new Date().getFullYear();
            const hour = dateTimeMatch[3];
            const minute = dateTimeMatch[4] || '00';
            const ampm = dateTimeMatch[5] || 'am';
            
            appointmentDate = \`\${year}-\${monthNum}-\${day}\`;
            appointmentTime = \`\${hour}:\${minute} \${ampm}\`;
          }
          
          // Map appointeeFor codes to readable names
          const appointeeNames: any = { 'shiva': 'Shiva (Mom)', 'rishi': 'Rishi (Dad)', 'ichi': 'Ichi (Grandmom)', 'jaian': 'Jaian (Baby)' };
          
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

if (content.includes(oldCode)) {
  content = content.replace(oldCode, newCode);
  fs.writeFileSync('app/api/whatsapp/webhook/route.ts', content, 'utf-8');
  console.log('✓ Clean fix applied - appointee_for added + successCount++');
} else {
  console.log('✗ Pattern not found - code may have changed');
}
