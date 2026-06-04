const fs = require('fs');

// Read the webhook file
let content = fs.readFileSync('app/api/whatsapp/webhook/route.ts', 'utf8');

// Add helper function after the imports
const helperFunction = `
// Helper to convert month name to number
function getMonthNumber(monthName: string): string {
  const months: any = {
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
`;

// Find where to insert the helper (after the PERSON_MAP)
const personMapEnd = content.indexOf('};') + 3;
if (content.indexOf('getMonthNumber') === -1) {
  content = content.slice(0, personMapEnd) + '\n' + helperFunction + content.slice(personMapEnd);
  fs.writeFileSync('app/api/whatsapp/webhook/route.ts', content, 'utf8');
  console.log('✓ Added getMonthNumber helper function');
} else {
  console.log('✓ getMonthNumber already exists');
}
