const fs = require('fs');
let content = fs.readFileSync('app/api/whatsapp/webhook/route.ts', 'utf8');

// Find and replace the appointment insertion section
const oldSection = `        // For appointments, store in appointments table
        if (metric.type === 'next_appointment' && metric.appointmentFor) {
          // Map appointeeFor codes to readable names
          const appointeeNames: any = { 'shiva': 'Shiva (Mom)', 'rishi': 'Rishi (Dad)', 'ichi': 'Ichi (Grandmom)', 'jaian': 'Jaian (Baby)' };
          // Insert into appointments table
          await supabase.from('appointments').insert({
            user_id: PILOT_FAMILY_ID,
            doctor: metric.value.split('at')[0].trim() || 'Appointment',
            reason: metricText,
            appointment_date: dateStr || new Date(timestamp).toISOString().split('T')[0],
            appointment_time: metric.value.includes('at') ? metric.value.split('at')[1].trim() : '',
            appointee_for: appointeeNames[metric.appointmentFor] || metric.appointmentFor,
            notes: \`From WhatsApp: \${phoneNumber}\`
          });
          successCount++;`;

const newSection = `        // For appointments, store in appointments table
        if (metric.type === 'next_appointment' && metric.appointmentFor) {
          // Extract date and time from metric value (e.g., "04 Jun 5pm")
          let appointmentDate = dateStr || new Date(timestamp).toISOString().split('T')[0];
          let appointmentTime = '';
          let doctorName = 'Appointment';
          
          // Try to parse date from metric value
          const dateMatch = metric.value.match(/(\d{1,2})\s+([a-z]+)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
          if (dateMatch) {
            const day = dateMatch[1].padStart(2, '0');
            const monthNum = getMonthNumber(dateMatch[2]);
            const year = new Date().getFullYear();
            const hour = dateMatch[3];
            const minute = dateMatch[4] || '00';
            const ampm = dateMatch[5] || 'am';
            
            appointmentDate = \`\${year}-\${monthNum}-\${day}\`;
            appointmentTime = \`\${hour}:\${minute} \${ampm}\`;
          }
          
          // Map appointeeFor codes to readable names
          const appointeeNames: any = { 'shiva': 'Shiva (Mom)', 'rishi': 'Rishi (Dad)', 'ichi': 'Ichi (Grandmom)', 'jaian': 'Jaian (Baby)' };
          
          // Extract reason/type from the message
          const reasonMatch = metricText.match(/appointment\s+(?:for\s+)?(.+?)\s*\d{1,2}\s+[a-z]+/i);
          const reason = reasonMatch ? reasonMatch[1].trim() : metricText;
          
          // Insert into appointments table
          await supabase.from('appointments').insert({
            user_id: PILOT_FAMILY_ID,
            doctor: doctorName,
            reason: reason || metricText,
            appointment_date: appointmentDate,
            appointment_time: appointmentTime,
            appointee_for: appointeeNames[metric.appointmentFor] || metric.appointmentFor,
            notes: \`From WhatsApp: \${phoneNumber}\`
          });
          successCount++;`;

if (content.includes(oldSection)) {
  content = content.replace(oldSection, newSection);
  fs.writeFileSync('app/api/whatsapp/webhook/route.ts', content, 'utf8');
  console.log('✓ Updated appointment insertion logic');
} else {
  console.log('✗ Could not find the old section to replace');
  console.log('Trying alternative approach...');
}
