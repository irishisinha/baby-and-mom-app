const fs = require('fs');
let content = fs.readFileSync('app/api/whatsapp/webhook/route.ts', 'utf-8');

// Find the appointment condition check and comment it out
const oldCondition = "if (metric.type === 'next_appointment' && metric.appointmentFor) {";
const newCondition = "if (false) { // Disabled: Log all as metrics\n        if (metric.type === 'next_appointment' && metric.appointmentFor) {";

content = content.replace(oldCondition, newCondition);

fs.writeFileSync('app/api/whatsapp/webhook/route.ts', content, 'utf-8');
console.log('Disabled appointment check - now logs all as metrics');
