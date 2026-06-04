// Test the appointment parsing logic
const text = "Shiva appointment 04 Jun 5pm";

// Test appointment detection
if (text.toLowerCase().includes('appointment')) {
  console.log("✓ Appointment detected");
  
  // Check for person
  const lower = text.toLowerCase();
  let appointmentFor = 'jaian';
  if (lower.includes('shiva')) appointmentFor = 'shiva';
  console.log("✓ For:", appointmentFor);
  
  // Extract date - looking for "04 Jun" pattern
  const dateMatch = text.match(/(\d{1,2})\s*(?:st|nd|rd|th)?\s*(jan|feb|mar|apr|may|jun|july|aug|sep|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december)/i);
  console.log("📅 Date match:", dateMatch ? dateMatch[0] : null);
  
  // Extract time - looking for "5pm" pattern
  const timeMatch = text.match(/(\d{1,2})(?::(\d{2}))?\s*(?:am|pm|a\.m\.|p\.m\.|AM|PM)/i);
  console.log("⏰ Time match:", timeMatch ? timeMatch[0] : null);
  
  if (dateMatch && timeMatch) {
    console.log("✅ Should insert appointment:", `${dateMatch[0]} ${timeMatch[0]}`);
  } else if (dateMatch) {
    console.log("✅ Should insert appointment with date:", dateMatch[0]);
  } else {
    console.log("❌ Date/time not found");
  }
}
