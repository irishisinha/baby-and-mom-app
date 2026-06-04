const fs = require('fs');
let content = fs.readFileSync('app/api/whatsapp/webhook/route.ts', 'utf-8');

// Replace the complex appointment insert with a simple metrics insert
const appointmentBlock = `        // For appointments, store in appointments table
        if (metric.type === 'next_appointment' && metric.appointmentFor) {
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

const simpleAppointmentBlock = `        // For appointments, log to metrics table
        if (metric.type === 'next_appointment' && metric.appointmentFor) {
          const appointeeNames: any = { 'shiva': 'Shiva (Mom)', 'rishi': 'Rishi (Dad)', 'ichi': 'Ichi (Grandmom)', 'jaian': 'Jaian (Baby)' };
          // Log appointment as a metric
          await supabase.from('baby_metrics').insert({
            family_id: PILOT_FAMILY_ID,
            baby_id: PILOT_BABY_ID,
            metric_type: 'next_appointment',
            value: appointeeNames[metric.appointmentFor] || 'appointment',
            unit: 'scheduled',
            sent_from_phone: phoneNumber,
            created_at: timestamp,
            notes: \`Appt: \${metricText}\`
          });`;

if (content.includes(appointmentBlock)) {
  content = content.replace(appointmentBlock, simpleAppointmentBlock);
  fs.writeFileSync('app/api/whatsapp/webhook/route.ts', content, 'utf-8');
  console.log('Simplified appointment logging');
} else {
  console.log('Pattern not found');
}
