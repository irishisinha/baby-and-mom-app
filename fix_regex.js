const fs = require('fs');
let content = fs.readFileSync('app/api/whatsapp/webhook/route.ts', 'utf8');

// Fix the escaped regex - replace the mangled version with correct one
const wrongRegex = /const dateMatch = metric\.value\.match\(\/\(d\{1,2\}\)s\+\(\[a-z\]\+\)s\+\(d\{1,2\}\)\(\?::\(d\{2\}\)\)\?s\*\(am\|pm\)\?\/i\);/;
const correctRegex = 'const dateMatch = metric.value.match(/(\d{1,2})\s+([a-z]+)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);';

if (content.includes('const dateMatch = metric.value.match(/')) {
  // Find the actual line with the wrong regex
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('const dateMatch = metric.value.match(') && lines[i].includes('d{1,2}')) {
      lines[i] = '          ' + correctRegex;
      console.log(`✓ Fixed regex on line ${i+1}`);
      break;
    }
  }
  content = lines.join('\n');
  fs.writeFileSync('app/api/whatsapp/webhook/route.ts', content, 'utf8');
} else {
  console.log('Already fixed or pattern not found');
}
