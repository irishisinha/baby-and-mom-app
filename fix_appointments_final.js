const fs = require('fs');
let content = fs.readFileSync('app/api/whatsapp/webhook/route.ts', 'utf8');

// Find the appointment insertion section and replace it
const start = content.indexOf('        // For appointments, store in appointments table');
const end = content.indexOf('        } else {', start);

if (start !== -1 && end !== -1) {
  const replacement = `        // For appointments, store in appointments table
        if (metric.type === 'next_appointment' && metric.appointmentFor) {
          // Extract date and time from metric value (e.g., "04 Jun 5pm")
          let appointmentDate = dateStr || new Date(timestamp).toISOString().split('T')[0];
          let appointmentTime = '';
          
          // Parse date format: "04 Jun 5pm" -> date: "2026-06-04", time: "5pm"
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
          
          await supabase.from('appointments').insert({
            user_id: PILOT_FAMILY_ID,
            doctor: 'Appointment',
            reason: metricText,
            appointment_date: appointmentDate,
            appointment_time: appointmentTime,
            appointee_for: appointeeNames[metric.appointmentFor] || metric.appointmentFor,
            notes: \`From WhatsApp: \${phoneNumber}\`
          });
          successCount++;
`;

  content = content.slice(0, start) + replacement + content.slice(end);
  fs.writeFileSync('app/api/whatsapp/webhook/route.ts', content, 'utf8');
  console.log('✅ Fixed appointment parsing!');
  console.log('   Now handles: "Shiva appointment 04 Jun 5pm"');
} else {
  console.log('✗ Could not find appointment section');
}
