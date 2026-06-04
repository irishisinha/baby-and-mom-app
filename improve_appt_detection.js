const fs = require('fs');
let content = fs.readFileSync('app/api/whatsapp/webhook/route.ts', 'utf-8');

// Find and replace the appointment detection line
const oldCheck = "if (cleanText.includes('next') || cleanText.includes('appt') || cleanText.includes('appointment')) {";
const newCheck = "if (cleanText.includes('next') || cleanText.includes('appt') || cleanText.includes('appoint')) {";

if (content.includes(oldCheck)) {
  content = content.replace(oldCheck, newCheck);
  fs.writeFileSync('app/api/whatsapp/webhook/route.ts', content, 'utf-8');
  console.log('Updated appointment detection to catch "appoint" variations');
} else {
  console.log('Could not find the exact check');
}
