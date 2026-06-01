import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Person type mapping - supports actual names and aliases
const PERSON_MAP: { [key: string]: string } = {
  'shiva': 'mom',
  'mom': 'mom',
  'mother': 'mom',
  'rishi': 'dad',
  'dad': 'dad',
  'father': 'dad',
  'ichi': 'grandmom',
  'grandmom': 'grandmom',
  'grandmother': 'grandmom',
  'grand mom': 'grandmom'
};

function parseWellnessEvent(text: string): any {
  const lower = text.toLowerCase().trim();
  
  // Check for person prefix
  let personType: string | null = null;
  let remaining = text;
  
  for (const [name, type] of Object.entries(PERSON_MAP)) {
    if (lower.startsWith(name)) {
      personType = type;
      remaining = text.substring(name.length).trim();
      break;
    }
  }
  
  if (!personType) return null;
  
  const cleanLower = remaining.toLowerCase();
  
  // Parse wellness events
  if (cleanLower.includes('sleep')) {
    const num = cleanLower.match(/(\d+\.?\d*)\s*(?:hour|hr|h)?/);
    if (num) return { type: 'wellness', personType, eventType: 'sleep', value: parseFloat(num[1]) };
  }
  if (cleanLower.includes('mood')) {
    const mood = remaining.split('mood')[1]?.trim() || 'happy';
    return { type: 'wellness', personType, eventType: 'mood', value: mood };
  }
  if (cleanLower.includes('energy')) {
    const num = cleanLower.match(/(\d+)/);
    if (num) return { type: 'wellness', personType, eventType: 'energy', value: parseInt(num[1]) };
  }
  if (cleanLower.includes('pain')) {
    const num = cleanLower.match(/(\d+)/);
    if (num) return { type: 'wellness', personType, eventType: 'pain', value: parseInt(num[1]) };
  }
  if (cleanLower.includes('recovery')) {
    const value = remaining.split('recovery')[1]?.trim() || 'good';
    return { type: 'wellness', personType, eventType: 'recovery', value };
  }
  if (cleanLower.includes('medication')) {
    return { type: 'wellness', personType, eventType: 'medication', value: 'taken' };
  }
  if (cleanLower.includes('exercise')) {
    const match = remaining.match(/(\d+)\s*(min|km|mile)/);
    if (match) return { type: 'wellness', personType, eventType: 'exercise', value: match[0] };
    return { type: 'wellness', personType, eventType: 'exercise', value: 'done' };
  }
  if (cleanLower.includes('health')) {
    const value = remaining.split('health')[1]?.trim() || 'checkup';
    return { type: 'wellness', personType, eventType: 'health_check', value };
  }
  
  return null;
}

function parseMetric(text: string) {
  const lower = text.toLowerCase().trim();
  
  // Remove time patterns (HH:MM, H.MM, etc)
  const cleanText = lower.replace(/^[\d:.]*\s*[-–]?\s*/, '');
  
  if (cleanText.includes('breastmilk') || cleanText.includes('pumped')) {
    const num = cleanText.match(/(\d+)/);
    if (num) return { type: 'breastmilk', value: parseInt(num[1]), unit: 'ml' };
  }
  if (cleanText.includes('formula')) {
    const num = cleanText.match(/(\d+)/);
    if (num) return { type: 'formula', value: parseInt(num[1]), unit: 'ml' };
  }
  if (cleanText.includes('potty')) return { type: 'potty', value: 1, unit: 'count' };
  if (cleanText.includes('diaper')) return { type: 'diaper', value: 1, unit: 'count' };
  if (cleanText.includes('bath')) return { type: 'bath', value: 1, unit: 'done' };
  if (cleanText.includes('oil')) return { type: 'oil', value: 1, unit: 'done' };
  if (cleanText.includes('sleep') || cleanText.includes('nap')) {
    const num = cleanText.match(/(\d+\.?\d*)\s*(?:hour|hr|h)?/);
    if (num) return { type: 'sleep', value: parseFloat(num[1]), unit: 'hours' };
  }
  if (cleanText.includes('weight') && !cleanText.includes('next')) {
    const num = cleanText.match(/(\d+\.?\d*)\s*kg/);
    if (num) return { type: 'weight', value: parseFloat(num[1]), unit: 'kg' };
  }
  if (cleanText.includes('fever')) {
    const num = cleanText.match(/(\d+\.?\d*)/);
    if (num) return { type: 'fever', value: parseFloat(num[1]), unit: 'f' };
  }
  if (cleanText.includes('vaccine')) return { type: 'vaccine', value: 'Vaccine recorded', unit: 'given' };
  if (cleanText.includes('doc') || cleanText.includes('doctor')) return { type: 'doc_notes', value: 'Notes saved', unit: 'notes' };
  if (cleanText.includes('next') || cleanText.includes('appt') || cleanText.includes('appointment')) {
    // Determine who the appointment is for
    let appointmentFor = 'jaian'; // default to baby
    if (cleanText.includes('shiva') || cleanText.includes('mom') || cleanText.includes('mother')) {
      appointmentFor = 'shiva';
    } else if (cleanText.includes('rishi') || cleanText.includes('dad') || cleanText.includes('father')) {
      appointmentFor = 'rishi';
    } else if (cleanText.includes('ichi') || cleanText.includes('grandmom') || cleanText.includes('grandmother')) {
      appointmentFor = 'ichi';
    }
    
    const dateMatch = text.match(/(\d{1,2})\s*(?:st|nd|rd|th)?\s*(jan|feb|mar|apr|may|jun|july|aug|sep|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december)/i);
    const timeMatch = text.match(/(\d{1,2})(?::(\d{2}))?\s*(?:am|pm|a\.m\.|p\.m\.|AM|PM)/i);
    const details = dateMatch ? dateMatch[0] : '';
    const time = timeMatch ? timeMatch[0] : '';
    const appointmentValue = `${details}${time ? ' ' + time : ''}`.trim() || 'Appointment scheduled';
    return { type: 'next_appointment', value: appointmentValue, appointmentFor, unit: 'scheduled' };
  }
  return null;
}

function extractDateAndMetric(text: string) {
  const lower = text.toLowerCase().trim();
  let dateStr: string | null = null;
  let metricText = text;
  let daysOffset = 0;

  if (lower.startsWith('yesterday:')) {
    daysOffset = 1;
    metricText = text.substring(9).trim();
  }
  else if (lower.startsWith('today:')) {
    daysOffset = 0;
    metricText = text.substring(6).trim();
  }
  else {
    const dateMatch = text.match(/^(\d{4}-\d{2}-\d{2}|\d{2}-\d{2}-\d{4}):\s*/i);
    if (dateMatch) {
      dateStr = dateMatch[1];
      metricText = text.substring(dateMatch[0].length);
    }
  }

  return { dateStr, metricText, daysOffset };
}

function getLondonTime(daysOffset = 0, specificDate: string | null = null) {
  const now = new Date();
  const londonTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/London' }));

  if (specificDate) {
    let parts = specificDate.split('-');
    let year, month, day;

    if (parts[0].length === 4) {
      [year, month, day] = [parseInt(parts[0]), parseInt(parts[1]), parseInt(parts[2])];
    } else {
      [day, month, year] = [parseInt(parts[0]), parseInt(parts[1]), parseInt(parts[2])];
    }

    londonTime.setFullYear(year);
    londonTime.setMonth(month - 1);
    londonTime.setDate(day);
  } else {
    londonTime.setDate(londonTime.getDate() - daysOffset);
  }

  return londonTime.toISOString();
}

function getLondonDate(daysAgo = 0) {
  const now = new Date();
  const londonTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/London' }));
  londonTime.setDate(londonTime.getDate() - daysAgo);
  
  const year = londonTime.getFullYear();
  const month = String(londonTime.getMonth() + 1).padStart(2, '0');
  const day = String(londonTime.getDate()).padStart(2, '0');
  
  return { 
    date: `${year}-${month}-${day}`,
    start: `${year}-${month}-${day}T00:00:00`,
    end: `${year}-${month}-${day}T23:59:59`
  };
}

async function getLatestMetricForToday(metricType: string) {
  const { start, end } = getLondonDate(0);
  const { data, error } = await supabase
    .from('baby_metrics')
    .select('id, value, unit, created_at')
    .eq('metric_type', metricType)
    .gte('created_at', start)
    .lte('created_at', end)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) return null;
  return data && data.length > 0 ? data[0] : null;
}

async function getTodayMetrics() {
  const { start, end } = getLondonDate(0);
  const { data } = await supabase
    .from('baby_metrics')
    .select('*')
    .gte('created_at', start)
    .lte('created_at', end)
    .not('metric_type', 'eq', 'daily_summary_shared')
    .not('metric_type', 'eq', 'weekly_summary_shared');

  const metrics: any = {};
  data?.forEach(item => {
    if (!metrics[item.metric_type]) metrics[item.metric_type] = 0;
    if (typeof item.value === 'number') metrics[item.metric_type] += item.value;
    else metrics[item.metric_type] = item.value;
  });
  return metrics;
}

async function getWeekMetrics() {
  const now = new Date();
  const londonTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/London' }));
  const sevenDaysAgo = new Date(londonTime);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const { data } = await supabase
    .from('baby_metrics')
    .select('metric_type, value, created_at')
    .gte('created_at', sevenDaysAgo.toISOString())
    .lte('created_at', londonTime.toISOString())
    .not('metric_type', 'eq', 'daily_summary_shared')
    .not('metric_type', 'eq', 'weekly_summary_shared');

  return data || [];
}

async function getUpcomingAppointments() {
  const { data } = await supabase
    .from('baby_metrics')
    .select('value, created_at')
    .eq('metric_type', 'next_appointment')
    .order('created_at', { ascending: false })
    .limit(10);

  return data || [];
}

async function buildDailySummary() {
  const today = await getTodayMetrics();
  let summary = '📋 TODAY\'S SUMMARY\n\n';
  
  if (today['breastmilk'] || today['formula']) {
    const breast = today['breastmilk'] || 0;
    const formula = today['formula'] || 0;
    const total = breast + formula;
    summary += `🍼 Milk: ${total}ml (Breast: ${breast}ml, Formula: ${formula}ml)\n`;
  }
  if (today['potty']) summary += `💧 Potty: ${today['potty']}\n`;
  if (today['diaper']) summary += `🧻 Diaper: ${today['diaper']}\n`;
  if (today['bath']) summary += `🛁 Bath: Done\n`;
  if (today['oil']) summary += `🛢️ Oil: Done\n`;
  if (today['sleep']) summary += `😴 Sleep: ${today['sleep']}h\n`;
  if (today['weight']) summary += `⚖️ Weight: ${today['weight']}kg\n`;
  if (today['fever']) summary += `🌡️ Fever: ${today['fever']}°F\n`;
  if (today['vaccine']) summary += `💉 Vaccine: Given\n`;
  if (today['next_appointment']) summary += `📅 Appt: ${today['next_appointment']}\n`;

  return summary || 'No metrics logged today';
}

async function buildWeeklySummary() {
  const today = await getTodayMetrics();
  const weekData = await getWeekMetrics();
  const appointments = await getUpcomingAppointments();
  
  let summary = '📊 WEEKLY ROLLING SUMMARY\n\n';

  const dailyAvgs: any = {};
  const weekTotals: any = {};

  weekData.forEach(item => {
    if (typeof item.value === 'number') {
      if (!weekTotals[item.metric_type]) weekTotals[item.metric_type] = 0;
      weekTotals[item.metric_type] += item.value;
    }
  });

  Object.keys(weekTotals).forEach(key => {
    dailyAvgs[key] = (weekTotals[key] / 7).toFixed(1);
  });

  if (today['breastmilk'] || dailyAvgs['breastmilk']) {
    const todayVal = today['breastmilk'] || 0;
    const avgVal = parseFloat(dailyAvgs['breastmilk'] || 0);
    const diffVal = todayVal - avgVal;
    const arrow = diffVal > 0 ? '↑' : diffVal < 0 ? '↓' : '=';
    const diff = diffVal.toFixed(1);
    summary += `🍼 BREASTMILK:\n   Today: ${todayVal}ml\n   Daily Avg: ${avgVal}ml/day\n   ${arrow} ${diffVal > 0 ? '+' : ''}${diff}ml\n\n`;
  }

  if (today['formula'] || dailyAvgs['formula']) {
    const todayVal = today['formula'] || 0;
    const avgVal = parseFloat(dailyAvgs['formula'] || 0);
    const diffVal = todayVal - avgVal;
    const arrow = diffVal > 0 ? '↑' : diffVal < 0 ? '↓' : '=';
    const diff = diffVal.toFixed(1);
    summary += `🍼 FORMULA:\n   Today: ${todayVal}ml\n   Daily Avg: ${avgVal}ml/day\n   ${arrow} ${diffVal > 0 ? '+' : ''}${diff}ml\n\n`;
  }

  if (today['potty'] || dailyAvgs['potty']) {
    const todayVal = today['potty'] || 0;
    const avgVal = parseFloat(dailyAvgs['potty'] || 0);
    const diffVal = todayVal - avgVal;
    const arrow = diffVal > 0 ? '↑' : diffVal < 0 ? '↓' : '=';
    const diff = diffVal.toFixed(1);
    summary += `💧 POTTY:\n   Today: ${todayVal}\n   Daily Avg: ${avgVal}/day\n   ${arrow} ${diffVal > 0 ? '+' : ''}${diff}\n\n`;
  }

  if (today['diaper'] || dailyAvgs['diaper']) {
    const todayVal = today['diaper'] || 0;
    const avgVal = parseFloat(dailyAvgs['diaper'] || 0);
    const diffVal = todayVal - avgVal;
    const arrow = diffVal > 0 ? '↑' : diffVal < 0 ? '↓' : '=';
    const diff = diffVal.toFixed(1);
    summary += `🧻 DIAPER:\n   Today: ${todayVal}\n   Daily Avg: ${avgVal}/day\n   ${arrow} ${diffVal > 0 ? '+' : ''}${diff}\n\n`;
  }

  if (today['bath'] || weekTotals['bath']) {
    const todayVal = today['bath'] ? 1 : 0;
    const weekVal = weekTotals['bath'] || 0;
    summary += `🛁 BATH:\n   Today: ${todayVal}\n   Weekly Total: ${weekVal} times\n\n`;
  }

  if (today['oil'] || weekTotals['oil']) {
    const todayVal = today['oil'] ? 1 : 0;
    const weekVal = weekTotals['oil'] || 0;
    summary += `🛢️ OIL MASSAGE:\n   Today: ${todayVal}\n   Weekly Total: ${weekVal} times\n\n`;
  }

  if (today['sleep'] || dailyAvgs['sleep']) {
    const todayVal = today['sleep'] || 0;
    const avgVal = parseFloat(dailyAvgs['sleep'] || 0);
    const diffVal = todayVal - avgVal;
    const arrow = diffVal > 0 ? '↑' : diffVal < 0 ? '↓' : '=';
    const diff = diffVal.toFixed(1);
    summary += `😴 SLEEP:\n   Today: ${todayVal}h\n   Daily Avg: ${avgVal}h/day\n   ${arrow} ${diffVal > 0 ? '+' : ''}${diff}h\n\n`;
  }

  if (today['weight'] || dailyAvgs['weight']) {
    const todayVal = today['weight'] || 0;
    const avgVal = parseFloat(dailyAvgs['weight'] || 0);
    const diffVal = todayVal - avgVal;
    const arrow = diffVal > 0 ? '↑' : diffVal < 0 ? '↓' : '=';
    const diff = diffVal.toFixed(1);
    summary += `⚖️ WEIGHT:\n   Today: ${todayVal}kg\n   Weekly Avg: ${avgVal}kg\n   ${arrow} ${diffVal > 0 ? '+' : ''}${diff}kg\n\n`;
  }

  if (today['fever'] || weekTotals['fever']) {
    summary += `🌡️ FEVER:\n   Today: ${today['fever'] ? today['fever'] + '°F' : 'None'}\n   Weekly: ${weekTotals['fever'] ? '1+ recorded' : 'None'}\n\n`;
  }

  if (weekTotals['vaccine']) {
    summary += `💉 VACCINE:\n   Today: ${today['vaccine'] ? 'Given' : 'None'}\n   Weekly: ${weekTotals['vaccine']} given\n\n`;
  }

  if (appointments.length > 0) {
    summary += `📅 UPCOMING APPOINTMENTS:\n`;
    appointments.forEach((appt, idx) => {
      if (idx < 5) summary += `   • ${appt.value}\n`;
    });
  }

  return summary || 'No metrics in last 7 days';
}

async function recordSummaryShared(phoneNumber: string, summaryType: string) {
  await supabase.from('baby_metrics').insert({
    metric_type: `${summaryType}_summary_shared`,
    value: 'shared',
    unit: 'once',
    sent_from_phone: phoneNumber,
    created_at: getLondonTime(),
  });
}

async function hasSummaryBeenShared(phoneNumber: string, summaryType: string) {
  const { start, end } = getLondonDate(0);
  const { data } = await supabase
    .from('baby_metrics')
    .select('id')
    .eq('metric_type', `${summaryType}_summary_shared`)
    .eq('sent_from_phone', phoneNumber)
    .gte('created_at', start)
    .lte('created_at', end)
    .limit(1);

  return data && data.length > 0;
}


async function getAllFamilyMemberPhones() {
  return ['+919604898762', '+919914789171', '+919871319008'];
}

async function getFamilyMemberName(phoneNumber: string) {
  const phones: any = {
    '+919604898762': 'Rishi',
    '+919914789171': 'Ichi',
    '+919871319008': 'Shiva',
  };
  return phones[phoneNumber] || 'Family Member';
}

async function broadcastToAllFamilyMembers(message: string) {
  const familyPhones = await getAllFamilyMemberPhones();
  for (const phone of familyPhones) {
    try {
      await sendTwilioMessage(`whatsapp:${phone}`, message);
    } catch (error) {
      console.error(`Failed to send to ${phone}:`, error);
    }
  }
}

async function sendTwilioMessage(fromPhone: string, body: string) {
  try {
    console.log(`[TWILIO] Sending to ${fromPhone}: ${body.substring(0, 50)}`);
    const result = await client.messages.create({
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
      to: fromPhone,
      body: body,
    });
    console.log(`[TWILIO] OK - SID: ${result.sid}`);
    return result;
  } catch (error: any) {
    console.error(`[TWILIO] ERROR: ${error.message}`);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const messageText = formData.get('Body') as string;
  const fromPhone = formData.get('From') as string;
  const phoneNumber = fromPhone?.replace('whatsapp:', '') || '';

  console.log(`[WEBHOOK] Received: ${messageText} from ${phoneNumber}`);

  const lower = messageText.toLowerCase().trim();

  if (lower === 'summary' || lower === 'summary daily' || lower === 'summary today') {
    const alreadyShared = await hasSummaryBeenShared(phoneNumber, 'daily');
    
    if (alreadyShared) {
      await sendTwilioMessage(fromPhone, '⚠️ Daily summary already shared. Request again tomorrow!');
      return NextResponse.json({ success: true });
    }

    const summary = await buildDailySummary();
    await recordSummaryShared(phoneNumber, 'daily');
    
    await sendTwilioMessage(fromPhone, summary);
    return NextResponse.json({ success: true });
  }

  if (lower === 'summary weekly' || lower === 'weekly') {
    const alreadyShared = await hasSummaryBeenShared(phoneNumber, 'weekly');
    
    if (alreadyShared) {
      await sendTwilioMessage(fromPhone, '⚠️ Weekly summary already shared. Request again tomorrow!');
      return NextResponse.json({ success: true });
    }

    const summary = await buildWeeklySummary();
    await recordSummaryShared(phoneNumber, 'weekly');
    
    await sendTwilioMessage(fromPhone, summary);
    return NextResponse.json({ success: true });
  }

  const lines = messageText.split('\n').filter(l => l.trim());
  let reply = '';
  let successCount = 0;

  for (const line of lines) {
    const lower = line.toLowerCase().trim();

    if (lower.startsWith('reduce:') || lower.startsWith('reduce ')) {
      const reduceText = lower.startsWith('reduce:') ? line.substring(7).trim() : line.substring(6).trim();
      const metric = parseMetric(reduceText);
      
      if (metric) {
        const latest = await getLatestMetricForToday(metric.type);
        if (latest && typeof latest.value === 'number' && typeof metric.value === 'number') {
          const newValue = Math.max(0, latest.value - metric.value);
          const { error } = await supabase.from('baby_metrics').update({ value: newValue }).eq('id', latest.id);
          if (!error) {
            successCount++;
            reply += `REDUCED ${metric.type.toUpperCase()}:\n   From: ${latest.value} ${latest.unit}\n   To: ${newValue} ${latest.unit}\n`;
          }
        } else {
          reply += `No ${metric.type} entry found for today\n`;
        }
      }
    }
    else if (lower.startsWith('delete:') || lower.startsWith('delete ')) {
      const deleteText = lower.startsWith('delete:') ? line.substring(7).trim() : line.substring(6).trim();
      const metric = parseMetric(deleteText);
      
      if (metric) {
        const latest = await getLatestMetricForToday(metric.type);
        if (latest) {
          const { error } = await supabase.from('baby_metrics').delete().eq('id', latest.id);
          if (!error) {
            successCount++;
            reply += `DELETED ${metric.type.toUpperCase()}: ${latest.value} ${latest.unit}\n`;
          }
        } else {
          reply += `No ${metric.type} entry found for today\n`;
        }
      }
    }
    else if (lower.startsWith('edit:') || lower.startsWith('edit ')) {
      const editText = lower.startsWith('edit:') ? line.substring(5).trim() : line.substring(4).trim();
      const metric = parseMetric(editText);
      
      if (metric) {
        const latest = await getLatestMetricForToday(metric.type);
        if (latest) {
          const { error } = await supabase.from('baby_metrics').update({ value: metric.value, unit: metric.unit }).eq('id', latest.id);
          if (!error) {
            successCount++;
            reply += `UPDATED ${metric.type.toUpperCase()}:\n   Old: ${latest.value} ${latest.unit}\n   New: ${metric.value} ${metric.unit}\n`;
          }
        } else {
          reply += `No ${metric.type} entry found for today\n`;
        }
      }
    }
    else {
      const { dateStr, metricText, daysOffset } = extractDateAndMetric(line);
      const metric = parseMetric(metricText);

      if (metric) {
        const timestamp = getLondonTime(daysOffset, dateStr);
        await supabase.from('baby_metrics').insert({
          metric_type: metric.type,
          value: metric.value,
          unit: metric.unit,
          sent_from_phone: phoneNumber,
          created_at: timestamp,
        });
        successCount++;
        if (metric.type === 'next_appointment') {
          const appointeeEmojis: any = { 'shiva': '👩', 'rishi': '👨', 'ichi': '👵', 'jaian': '👶' };
          const appointeeNames: any = { 'shiva': 'Shiva', 'rishi': 'Rishi', 'ichi': 'Ichi', 'jaian': 'Jaian' };
          const appointmentFor = metric.appointmentFor || 'jaian';
          const emoji = appointeeEmojis[appointmentFor] || '📅';
          const name = appointeeNames[appointmentFor] || 'Baby';
          reply += `${emoji} ${name}'s appointment: ${metric.value}`;
        } else {
          reply += `${metric.type.toUpperCase()}: ${metric.value} ${metric.unit}`;
        }
        if (dateStr) {
          reply += ` (${dateStr})`;
        } else if (daysOffset > 0) {
          reply += ` (${daysOffset} day${daysOffset > 1 ? 's' : ''} ago)`;
        }
        reply += '\n';
      }
    }
  }

  const finalReply = successCount > 0 
    ? `LOGGED:\n${reply}\nFrom: ${phoneNumber}`
    : `Format not recognized\n\nFrom: ${phoneNumber}`;

  // Broadcast to all family members
  if (successCount > 0) {
    const today = await getTodayMetrics();
    const breast = today['breastmilk'] || 0;
    const formula = today['formula'] || 0;
    const total = breast + formula;
    const senderName = await getFamilyMemberName(phoneNumber);
    const broadcastMsg = `✅ ${senderName}: ${reply.trim()}

📊 Current: ${total}ml total (Breast: ${breast}ml, Formula: ${formula}ml)`;
    await broadcastToAllFamilyMembers(broadcastMsg);
  } else {
    await sendTwilioMessage(fromPhone, finalReply);
  }

  return NextResponse.json({ success: true });
}

export async function GET() {
  return NextResponse.json({ ok: true });
}