// Test the date parsing in the webhook
const metric = { value: '04 Jun 5pm', appointmentFor: 'jaian', type: 'next_appointment' };

// Helper function (from webhook)
function getMonthNumber(monthName) {
  const months = {
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
}

// Parse like the webhook does
let appointmentDate = '2026-06-03'; // Today as default
let appointmentTime = '';

const dateTimeMatch = metric.value.match(/(\d{1,2})\s+([a-z]+)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
if (dateTimeMatch) {
  const day = dateTimeMatch[1].padStart(2, '0');
  const monthNum = getMonthNumber(dateTimeMatch[2]);
  const year = new Date().getFullYear();
  const hour = dateTimeMatch[3];
  const minute = dateTimeMatch[4] || '00';
  const ampm = dateTimeMatch[5] || 'am';
  
  appointmentDate = `${year}-${monthNum}-${day}`;
  appointmentTime = `${hour}:${minute} ${ampm}`;
}

console.log('Parsed appointment:');
console.log('  Date:', appointmentDate);
console.log('  Time:', appointmentTime);
console.log('  Ready to insert:', {
  user_id: 'df3d99a8-f7a2-44cf-bcb4-9c5f3300caa6',
  doctor: 'Appointment',
  reason: 'appt 04 Jun 5pm',
  appointment_date: appointmentDate,
  appointment_time: appointmentTime,
  notes: 'From WhatsApp: +919604898762'
});
