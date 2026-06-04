const fs = require('fs');
let content = fs.readFileSync('app/api/whatsapp/webhook/route.ts', 'utf-8');

// Replace the entire appointment if block with simple metrics logging
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
          });
        } else {`;

const simplified = `        // Log appointments as metrics
        if (metric.type === 'next_appointment') {
          const appointeeNames: any = { 'shiva': 'Shiva (Mom)', 'rishi': 'Rishi (Dad)', 'ichi': 'Ichi (Grandmom)', 'jaian': 'Jaian (Baby)' };
          metric.unit = metric.unit || 'appointment';
          metric.value = appointeeNames[metric.appointmentFor] || 'appointment';
        }
        
        // Insert all (including appointments) into baby_metrics
        if (true) {`;

if (content.includes(appointmentBlock)) {
  content = content.replace(appointmentBlock, simplified);
  
  // Also remove the else clause since we're logging everything to metrics now
  const elseClose = `        } else {
          // Insert into baby_metrics for other metrics
          let notes = '';
          const insertValue = metric.value;
          
          await supabase.from('baby_metrics').insert({
            family_id: PILOT_FAMILY_ID,
            baby_id: PILOT_BABY_ID,
            metric_type: metric.type,
            value: insertValue,
            unit: metric.unit,
            sent_from_phone: phoneNumber,
            created_at: timestamp,
            notes: notes
          });
          successCount++;
        }`;
  
  const metricsInsert = `        
          // Insert into baby_metrics
          await supabase.from('baby_metrics').insert({
            family_id: PILOT_FAMILY_ID,
            baby_id: PILOT_BABY_ID,
            metric_type: metric.type,
            value: metric.value,
            unit: metric.unit,
            sent_from_phone: phoneNumber,
            created_at: timestamp,
            notes: metricText
          });
          successCount++;
        }`;
  
  if (content.includes(elseClose)) {
    content = content.replace(elseClose, metricsInsert);
  }
  
  fs.writeFileSync('app/api/whatsapp/webhook/route.ts', content, 'utf-8');
  console.log('Simplified to always log to metrics');
} else {
  console.log('Pattern not found');
}
