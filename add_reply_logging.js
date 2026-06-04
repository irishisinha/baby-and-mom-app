const fs = require('fs');
let content = fs.readFileSync('app/api/whatsapp/webhook/route.ts', 'utf-8');

// Find where the reply is being built and add diagnostic info
const replyStart = content.indexOf('      const { dateStr, metricText, daysOffset } = extractDateAndMetric(line);');
const replyInsertPos = content.indexOf('const metric = parseMetric(metricText);', replyStart) + 'const metric = parseMetric(metricText);'.length;

if (replyStart !== -1 && replyInsertPos > replyStart) {
  const diagnostic = `
      // DEBUG: Check what we're parsing
      const isApptMsg = metricText.toLowerCase().includes('appt') || metricText.toLowerCase().includes('next') || metricText.toLowerCase().includes('appoint');
      if (isApptMsg) {
        console.log('[PARSE-APPT]', { metricText, metric: metric ? metric.type : 'NULL' });
      }`;
  
  content = content.slice(0, replyInsertPos) + diagnostic + content.slice(replyInsertPos);
  fs.writeFileSync('app/api/whatsapp/webhook/route.ts', content, 'utf-8');
  console.log('Added reply logging');
} else {
  console.log('Could not find insertion point');
}
