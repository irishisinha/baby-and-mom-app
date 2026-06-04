const fs = require('fs');
const content = fs.readFileSync('app/api/whatsapp/webhook/route.ts', 'utf-8');

// 1. Add getMonthNumber helper function after PERSON_MAP
const personMapEnd = content.indexOf('};');
const helperFunction = `

// Helper to convert month name to number (e.g., "Jun" -> "06")
function getMonthNumber(monthName: string): string {
  const months: { [key: string]: string } = {
    'jan': '01', 'january': '01',
    'feb': '02', 'february': '02',
    'mar': '03', 'march': '03',
    'apr': '04', 'april': '04',
    'may': '05',
    'jun': '06', 'june': '06',
    'jul': '07', 'july': '07',
    'aug': '08', 'august': '08',
    'sep': '09', 'september': '09',
    'oct': '10', 'october': '10',
    'nov': '11', 'november': '11',
    'dec': '12', 'december': '12'
  };
  return months[monthName.toLowerCase()] || '01';
}`;

let result = content;

if (!result.includes('getMonthNumber')) {
  result = result.slice(0, personMapEnd + 3) + helperFunction + result.slice(personMapEnd + 3);
}

// 2. Find and replace the appointment insertion logic
const oldPattern = `        // For appointments, store in appointments table
        if (metric.type === 'next_appointment' && metric.appointmentFor) {
          // Insert into appointments table
          const appointeeNames: any = { 'shiva': 'Shiva (Mom)', 'rishi': 'Rishi (Dad)', 'ichi': 'Ichi (Grandmom)', 'jaian': 'Jaian (Baby)' };
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

const newPattern = `        // For appointments, store in appointments table
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
            appointee_for: appointeeNames[metric.appointmentFor] || metric.appointmentFor,
            notes: \`From WhatsApp: \${phoneNumber}\`
          });
          successCount++;`;

if (result.includes(oldPattern)) {
  result = result.replace(oldPattern, newPattern);
  console.log('✅ Applied appointment parsing improvements!');
} else {
  console.log('❌ Could not find pattern to replace');
  process.exit(1);
}

fs.writeFileSync('app/api/whatsapp/webhook/route.ts', result, 'utf-8');
console.log('✅ File updated successfully!');
