import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { handleCommand } from './commands';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const AUTHORIZED_NUMBERS = ['+919604898762', '+919871319008', '+919914789171'];
const FAMILY_ID = 'df3d99a8-f7a2-44cf-bcb4-9c5f3300caa6';
const BABY_ID = 'e8a7c56c-62c6-442c-94ac-518928c8c07b';

function parseAppointmentMessage(text: string): any {
  const appointmentMatch = text.match(/^Appointment-\s*(.+)$/i);
  if (!appointmentMatch) return null;

  const content = appointmentMatch[1].trim();
  const detailsMatch = content.match(/^(.+?)\s+(\d{1,2})\s+(\w+)\s+(\d{1,2}):(\d{2})\s*(am|pm)\s+(.+)$/i);
  
  if (!detailsMatch) return null;

  const [, description, day, month, hour, minute, ampm, title] = detailsMatch;
  
  let hours = parseInt(hour);
  if (ampm.toLowerCase() === 'pm' && hours !== 12) hours += 12;
  if (ampm.toLowerCase() === 'am' && hours === 12) hours = 0;
  
  const now = new Date();
  const currentYear = now.getFullYear();
  
  const monthMap: { [key: string]: number } = {
    january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
    july: 7, august: 8, september: 9, october: 10, november: 11, december: 12
  };
  
  const monthNum = monthMap[month.toLowerCase()];
  if (!monthNum) return null;

  const dateStr = `${currentYear}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const timeStr = `${String(hours).padStart(2, '0')}:${minute}`;
  const isoDateTime = `${dateStr}T${timeStr}`;

  return {
    title: title.trim(),
    description: description.trim(),
    appointment_date: isoDateTime,
    appointment_time: timeStr,
    isAppointment: true
  };
}

async function getTodayVsYesterdayReport(): Promise<string> {
  try {
    const now = new Date();
    
    // Get today's date in London timezone (do NOT re-parse with new Date())
    const todayStr = now.toLocaleDateString('en-CA', { timeZone: 'Europe/London' });
    
    // Get yesterday's date by subtracting milliseconds from UTC time
    const yesterdayMs = now.getTime() - (24 * 60 * 60 * 1000);
    const yesterdayDate = new Date(yesterdayMs);
    const yesterdayStr = yesterdayDate.toLocaleDateString('en-CA', { timeZone: 'Europe/London' });

    const { data: allData } = await supabase.from('baby_metrics').select('*').eq('family_id', FAMILY_ID).order('created_at', { ascending: false }).limit(500);

    const todayMetrics: Record<string, number[]> = {};
    const yesterdayMetrics: Record<string, number[]> = {};

    if (allData && allData.length > 0) {
      allData.forEach((m: any) => {
        // Only include baby metrics, skip family wellness metrics
        if (m.person_type && m.person_type !== 'baby') return;
        
        const metricDate = new Date(m.created_at).toLocaleDateString('en-CA', { timeZone: 'Europe/London' });
        const value = parseFloat(m.value);
        if (!isNaN(value) && m.metric_type !== 'weight') {
          if (metricDate === todayStr) {
            todayMetrics[m.metric_type] = todayMetrics[m.metric_type] || [];
            todayMetrics[m.metric_type].push(value);
          } else if (metricDate === yesterdayStr) {
            yesterdayMetrics[m.metric_type] = yesterdayMetrics[m.metric_type] || [];
            yesterdayMetrics[m.metric_type].push(value);
          }
        }
      });
    }

    let report = `📊 Jaian (Baby) - Today vs Yesterday\n\nToday (${todayStr}):\n`;
    const allMetrics = new Set([...Object.keys(todayMetrics), ...Object.keys(yesterdayMetrics)]);
    
    if (allMetrics.size === 0) {
      report += 'No baby metrics logged\n';
    } else {
      const feedMetrics = ['formula', 'breastmilk'];
      feedMetrics.forEach((type) => {
        const todayTotal = (todayMetrics[type] || []).reduce((a: number, b: number) => a + b, 0) || 0;
        const yesterdayTotal = (yesterdayMetrics[type] || []).reduce((a: number, b: number) => a + b, 0) || 0;
        report += `  ${type}: ${todayTotal} (yesterday: ${yesterdayTotal})\n`;
      });
    }

    return report;
  } catch (error) {
    console.error('[REPORT-ERR]', error);
    return 'Report: Check dashboard for latest metrics';
  }
}
// Extract time from message (e.g., "at 2:30 pm" or "14:30")
function extractMetricTime(text: string): string | null {
  const patterns = [
    /ats+(d{1,2}):(d{2})s*(am|pm)/i,
    /(d{1,2}):(d{2})s*(am|pm)/i,
    /ats+(d{1,2}):(d{2})/,
    /(d{1,2}):(d{2})(?!d)/
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      let h = parseInt(m[1]);
      const min = m[2];
      const ap = m[3];
      if (ap) {
        if (ap.toLowerCase() === "pm" && h !== 12) h += 12;
        if (ap.toLowerCase() === "am" && h === 12) h = 0;
      }
      return String(h).padStart(2, "0") + ":" + min + ":00";
    }
  }
  return null;
}

function parseMetric(text: string): any {
  let cleanText = text.toLowerCase().trim();
  let personType = 'baby';
  
  // Family members
  if (cleanText.match(/^(shiva|mom|mother)\s+/)) {
    personType = 'mom';
    cleanText = cleanText.replace(/^(shiva|mom|mother)\s+/i, '').trim();
  } else if (cleanText.match(/^(rishi|dad|father)\s+/)) {
    personType = 'dad';
    cleanText = cleanText.replace(/^(rishi|dad|father)\s+/i, '').trim();
  } else if (cleanText.match(/^(ichi|grandmom|grandma)\s+/)) {
    personType = 'grandmom';
    cleanText = cleanText.replace(/^(ichi|grandmom|grandma)\s+/i, '').trim();
  }
  
  // Wellness metrics
  if (personType !== 'baby') {
    if (cleanText.includes('mood')) {
      const moodVal = cleanText.replace(/mood/i, '').trim().split(/\s+/)[0] || 'logged';
      return { metric_type: 'wellness_mood', value: moodVal, unit: 'text', isMetric: true, personType };
    }
    if (cleanText.includes('steps')) {
      const match = cleanText.match(/(\d+)/);
      if (match) return { metric_type: 'wellness_steps', value: match[1], unit: 'steps', isMetric: true, personType };
    }
    if (cleanText.includes('energy')) {
      const match = cleanText.match(/(\d+)/);
      if (match) return { metric_type: 'wellness_energy', value: match[1], unit: '/10', isMetric: true, personType };
    }
    if (cleanText.includes('pain')) {
      const match = cleanText.match(/(\d+)/);
      if (match) return { metric_type: 'wellness_pain', value: match[1], unit: '/10', isMetric: true, personType };
    }
    if (cleanText.includes('sleep')) {
      const match = cleanText.match(/(\d+)/);
      if (match) return { metric_type: 'wellness_sleep', value: match[1], unit: 'hours', isMetric: true, personType };
    }
    if (cleanText.includes('exercise')) {
      const match = cleanText.match(/(\d+)/);
      if (match) return { metric_type: 'wellness_exercise', value: match[1], unit: 'mins', isMetric: true, personType };
    }
    if (cleanText.includes('medication')) {
      const match = cleanText.match(/(\d+)/);
      if (match) return { metric_type: 'wellness_medication', value: match[1], unit: 'count', isMetric: true, personType };
    }
    return null;
  }

  // Baby metrics
  let match = text.match(/formula[\s.]*(\d+)[\s.]*(ml)?/i) || text.match(/(\d+)[\s.]*(ml)[\s.]*formula/i);
  if (match) return { metric_type: 'formula', value: match[1], unit: 'ml', isMetric: true, personType };

  // Breastmilk - "pumped 20ml", "20ml pumped", "breast milk 20"  
  match = text.match(/pumped[\s.]*(\d+)[\s.]*(ml)?/i) || 
          text.match(/(\d+)[\s.]*(ml)[\s.]*pumped/i) ||
          text.match(/breast[\s.]*milk[\s.]*(\d+)[\s.]*(ml)?/i) || 
          text.match(/(\d+)[\s.]*(ml)[\s.]*breast[\s.]*milk/i) ||
          text.match(/breastmilk[\s.]*(\d+)[\s.]*(ml)?/i) || 
          text.match(/(\d+)[\s.]*(ml)[\s.]*breastmilk/i);
  if (match) return { metric_type: 'breastmilk', value: match[1], unit: 'ml', isMetric: true, personType };

  // WeightMetric: true, personType };


  // Breastmilk - pumped, breast milk variations
  match = text.match(/pumped[s.]*(d+)[s.]*(ml)?/i) || text.match(/(d+)[s.]*(ml)[s.]*pumped/i) || text.match(/breast[s.]*milk[s.]*(d+)[s.]*(ml)?/i) || text.match(/(d+)[s.]*(ml)[s.]*breast[s.]*milk/i) || text.match(/breastmilk[s.]*(d+)[s.]*(ml)?/i) || text.match(/(d+)[s.]*(ml)[s.]*breastmilk/i);
  if (match) return { metric_type: 'breastmilk', value: match[1], unit: 'ml', isMetric: true, personType };
  match = text.match(/(\d+(?:[.,]\d+)?)[\s.]*(kg)[\s.]*(w(eight|right)?)?/i) || text.match(/(w(eight|right)?)[\s.]*(\d+(?:[.,]\d+)?)[\s.]*(kg)?/i);
  if (match) {
    let val = match[1] || match[3];
    val = val.replace(',', '.');
    return { metric_type: 'weight', value: val, unit: 'kg', isMetric: true, personType };
  }

  if (/vaccine/i.test(text)) return { metric_type: 'vaccine', value: '1', unit: 'count', isMetric: true, personType };
  if (/diaper/i.test(text)) return { metric_type: 'diaper', value: '1', unit: 'count', isMetric: true, personType };
  if (/bath/i.test(text)) return { metric_type: 'bath', value: '1', unit: 'count', isMetric: true, personType };
  if (/potty/i.test(text)) return { metric_type: 'potty', value: '1', unit: 'count', isMetric: true, personType };
  if (/oil/i.test(text)) return { metric_type: 'oil', value: '1', unit: 'count', isMetric: true, personType };

  match = text.match(/sleep[\s.]*(\d+)[\s.]*(hour|hr)?/i) || text.match(/(\d+)[\s.]*(hour|hr)[\s.]*sleep/i) || text.match(/(\d+)[\s.]*(hour|hr)/i);
  if (match) return { metric_type: 'sleep', value: match[1], unit: 'hours', isMetric: true, personType };

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const params = new URLSearchParams(body);
    
    const messageBody = params.get('Body') || '';
    const fromPhone = params.get('From') || '';

    console.log('[WA-MSG]', { messageBody, fromPhone });

    const normalizedPhone = fromPhone.replace(/\s+/g, '');
    const isAuthorized = AUTHORIZED_NUMBERS.some(num => {
      const normalizedNum = num.replace(/\s+/g, '');
      return normalizedPhone === normalizedNum || normalizedPhone.includes(normalizedNum) || normalizedNum.includes(normalizedPhone);
    });

    if (!isAuthorized) {
      console.log('[WA-UNAUTH]', { fromPhone });
      return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response><Message>Not authorized</Message></Response>', { status: 200, headers: { 'Content-Type': 'application/xml' } });
    }

    // Handle appt command
    if (messageBody.toLowerCase().trim() === 'appt') {
      const apptList = await handleCommand(messageBody, fromPhone, FAMILY_ID);
      if (apptList) {
        return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${apptList}</Message></Response>`, { status: 200, headers: { 'Content-Type': 'application/xml' } });
      }
    }

    // Handle feed command
    if (messageBody.toLowerCase().trim() === 'feed') {
      const feedList = await handleCommand(messageBody, fromPhone, FAMILY_ID);
      if (feedList) {
        return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${feedList}</Message></Response>`, { status: 200, headers: { 'Content-Type': 'application/xml' } });
      }
    }

    const appointmentData = parseAppointmentMessage(messageBody);
    if (appointmentData && appointmentData.isAppointment) {
      try {
        const { data, error } = await supabase.from('appointments').insert({
          user_id: 'df3d99a8-f7a2-44cf-bcb4-9c5f3300caa6',
          doctor: appointmentData.title,
          reason: appointmentData.description,
          appointment_date: appointmentData.appointment_date.split('T')[0],
          appointment_time: appointmentData.appointment_time,
          notes: `WhatsApp`
        }).select();

        if (error) throw error;
        return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>✓ Appt: ${appointmentData.title}</Message></Response>`, { status: 200, headers: { 'Content-Type': 'application/xml' } });
      } catch (e: any) {
        console.error('[APT-ERR]', e);
        return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response><Message>Appt error</Message></Response>', { status: 200, headers: { 'Content-Type': 'application/xml' } });
      }
    }

        // Handle report command
    if (messageBody.toLowerCase().includes('report')) {
      const now = new Date();
      const todayStr = now.toLocaleDateString('en-CA', { timeZone: 'Europe/London' });
      const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toLocaleDateString('en-CA', { timeZone: 'Europe/London' });
      
      const { data: allData } = await supabase.from('baby_metrics').select('*').eq('family_id', FAMILY_ID).limit(500);
      
      const today: Record<string, number> = {}; const yest: Record<string, number> = {};
      if (allData) {
        allData.forEach((m: any) => {
          if (m.metric_type !== 'formula' && m.metric_type !== 'breastmilk') return;
          const d = new Date(m.created_at).toLocaleDateString('en-CA', { timeZone: 'Europe/London' });
          const v = parseFloat(m.value) || 0;
          if (d === todayStr) { today[m.metric_type] = (today[m.metric_type] || 0) + v; }
          else if (d === yesterdayStr) { yest[m.metric_type] = (yest[m.metric_type] || 0) + v; }
        });
      }
      
      let report = `📊 Jaian (Baby) - Today vs Yesterday

Today (${todayStr}):
`;
      const types = ['formula', 'breastmilk'];
      types.forEach((t) => { const tv = today[t] || 0; const yv = yest[t] || 0; report += `  ${t}: ${tv} (yesterday: ${yv})
`; });
      return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${report}</Message></Response>`, { status: 200, headers: { 'Content-Type': 'application/xml' } });
    }

    const metricData = parseMetric(messageBody);
    if (metricData && metricData.isMetric) {
      try {
        const insertData: any = {
          family_id: FAMILY_ID,
          metric_type: metricData.metric_type,
          value: metricData.value,
          unit: metricData.unit,
          person_type: metricData.personType,
          sent_from_phone: fromPhone
        };
        
        // Only add baby_id for baby metrics
        if (metricData.personType === 'baby') {
          insertData.baby_id = BABY_ID;
        }
        
        const { data, error } = await supabase.from('baby_metrics').insert([insertData]).select();

        if (error) {
          console.error('[INSERT-ERR]', { error: error.message, insertData });
          throw error;
        }
        
        return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>✓ ${metricData.value}${metricData.unit} ${metricData.metric_type}</Message></Response>`, { status: 200, headers: { 'Content-Type': 'application/xml' } });
      } catch (e: any) {
        console.error('[METRIC-ERR]', { error: e.message, metricData });
        return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>Error: ${e.message?.substring(0, 30) || 'metric error'}</Message></Response>`, { status: 200, headers: { 'Content-Type': 'application/xml' } });
      }
    }

    return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response><Message>Baby: 30ml formula|5.5kg weight|vaccine|diaper|bath|sleep 2h. Wellness: shiva/mom steps 5000|shiva mood happy|shiva energy 7|shiva pain 3|shiva medication 2|shiva sleep 8. Rishi/Dad & Ichi/Grandmom: same. Appt: Appointment- [desc] [day] [month] [HH:MM am/pm] [title]</Message></Response>', { status: 200, headers: { 'Content-Type': 'application/xml' } });

  } catch (error) {
    console.error('[ERROR]', error);
    return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response><Message>Error</Message></Response>', { status: 200, headers: { 'Content-Type': 'application/xml' } });
  }
}


