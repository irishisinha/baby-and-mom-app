// Test the exact parsing logic locally
const text = "appt 04 Jun 5pm";
const lower = text.toLowerCase().trim();
const cleanText = lower.replace(/^[\d:.]*\s*[-–]?\s*/, '');

console.log('Input:', text);
console.log('Lower:', lower);
console.log('CleanText:', cleanText);

// Test appointment check
const isAppt = cleanText.includes('next') || cleanText.includes('appt') || cleanText.includes('appoint');
console.log('Is appointment?:', isAppt);

if (isAppt) {
  // Check appointmentFor
  let appointmentFor = 'jaian';
  if (cleanText.includes('shiva') || cleanText.includes('mom')) appointmentFor = 'shiva';
  console.log('Appointment for:', appointmentFor);
  
  // Date match
  const dateMatch = text.match(/(\d{1,2})\s*(?:st|nd|rd|th)?\s*(jan|feb|mar|apr|may|jun|july|aug|sep|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december)/i);
  console.log('Date match:', dateMatch ? dateMatch[0] : 'NO MATCH');
  
  // Time match
  const timeMatch = text.match(/(\d{1,2})(?::(\d{2}))?\s*(?:am|pm|a\.m\.|p\.m\.|AM|PM)/i);
  console.log('Time match:', timeMatch ? timeMatch[0] : 'NO MATCH');
  
  const details = dateMatch ? dateMatch[0] : '';
  const time = timeMatch ? timeMatch[0] : '';
  const appointmentValue = `${details}${time ? ' ' + time : ''}`.trim() || 'Appointment scheduled';
  console.log('Result:', { type: 'next_appointment', value: appointmentValue, appointmentFor, unit: 'scheduled' });
}
