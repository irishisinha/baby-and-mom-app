import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const AUTHORIZED_NUMBERS = ['+919604898762', '+919871319008', '+919914789171'];

// Twilio rejects the whole TwiML reply (error 12200) if the message body
// contains raw XML special characters, so every dynamic value must be escaped.
function escapeXml(text: string): string {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
const PILOT_FAMILY_ID = 'df3d99a8-f7a2-44cf-bcb4-9c5f3300caa6';
const PILOT_BABY_ID = 'e8a7c56c-62c6-442c-94ac-518928c8c07b';
const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key');

const MONTH_MAP: { [key: string]: number } = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

const MONTH_PATTERN = '(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';

function buildAppointment(title: string, description: string, day: string, monthNum: number, hours: number, minutes: number): any {
  const currentYear = new Date().getFullYear();
  const dateStr = `${currentYear}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

  return {
    title: title.trim(),
    description: description.trim(),
    appointment_date: `${dateStr}T${timeStr}`,
    appointment_time: timeStr,
    isAppointment: true
  };
}

function parseAppointmentMessage(text: string): any {
  const trimmed = text.trim();

  const strictMatch = trimmed.match(/^Appointment-\s*(.+)$/i);
  if (strictMatch) {
    const detailsMatch = strictMatch[1].trim().match(/^(.+?)\s+(\d{1,2})\s+(\w+)\s+(\d{1,2}):(\d{2})\s*(am|pm)\s+(.+)$/i);
    if (!detailsMatch) return null;

    const [, description, day, month, hour, minute, ampm, title] = detailsMatch;
    const monthNum = MONTH_MAP[month.toLowerCase()];
    if (!monthNum) return null;

    let hours = parseInt(hour, 10);
    if (ampm.toLowerCase() === 'pm' && hours !== 12) hours += 12;
    if (ampm.toLowerCase() === 'am' && hours === 12) hours = 0;

    return buildAppointment(title, description, day, monthNum, hours, parseInt(minute, 10));
  }

  if (!/\bappointment\b/i.test(trimmed)) return null;

  const naturalMatch = trimmed.match(new RegExp(
    `^(?:(.+?)\\s+)?appointment\\b\\s*(?:on\\s+|for\\s+)?(?:the\\s+)?(?:([A-Za-z][A-Za-z\\s]*?)\\s+)?(?:` +
      `(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?(${MONTH_PATTERN})` +
      `|(${MONTH_PATTERN})\\s+(\\d{1,2})(?:st|nd|rd|th)?` +
    `)\\s*(?:at\\s+)?(\\d{1,2})(?:[:.](\\d{2}))?\\s*(am|pm|a\\.m\\.|p\\.m\\.)?\\s*(.*)$`,
    'i'
  ));
  if (!naturalMatch) return null;

  const [, leadingTitle, middleTitle, day1, month1, month2, day2, hourStr, minuteStr, ampmRaw, rest] = naturalMatch;
  const day = day1 || day2;
  if (parseInt(day, 10) < 1 || parseInt(day, 10) > 31) return null;
  const monthNum = MONTH_MAP[(month1 || month2).toLowerCase()];
  if (!monthNum) return null;

  let hours = parseInt(hourStr, 10);
  const minutes = minuteStr ? parseInt(minuteStr, 10) : 0;
  if (hours > 23 || minutes > 59) return null;

  const ampm = (ampmRaw || '').toLowerCase().replace(/\./g, '');
  if (ampm === 'pm' && hours !== 12) hours += 12;
  if (ampm === 'am' && hours === 12) hours = 0;

  return buildAppointment(leadingTitle || middleTitle || 'Appointment', rest.trim() || 'Appointment', day, monthNum, hours, minutes);
}

function parseMetric(text: string) {
  const lower = text.toLowerCase().trim();
  const numberMatch = lower.match(/(\d+)\s*ml/);
  const number = numberMatch ? parseInt(numberMatch[1]) : null;
  const weightMatch = lower.match(/(\d+(?:\.\d+)?)\s*kg/);
  const weight = weightMatch ? parseFloat(weightMatch[1]) : null;

  if (lower.includes('formula')) return number ? { type: 'formula', value: number, unit: 'ml' } : null;
  if (lower.includes('breastmilk') || lower.includes('breast milk')) return number ? { type: 'breastmilk', value: number, unit: 'ml' } : null;
  if (lower.includes('weight')) return weight ? { type: 'weight', value: weight, unit: 'kg' } : null;
  if (lower.includes('vaccine')) return { type: 'vaccine', value: 1, unit: 'done' };
  if (lower.includes('diaper')) return { type: 'diaper', value: 1, unit: 'count' };
  if (lower.includes('sleep')) return { type: 'sleep', value: 1, unit: 'session' };
  if (lower.includes('bath')) return { type: 'bath', value: 1, unit: 'times' };
  if (lower.includes('potty')) return { type: 'potty', value: 1, unit: 'count' };
  if (lower.includes('oil')) return { type: 'oil', value: 1, unit: 'times' };
  return null;
}

function getLondonTime() {
  const now = new Date();
  return new Date(now.toLocaleString('en-US', { timeZone: 'Europe/London' })).toISOString();
}

async function sendNotification(title: string, message: string) {
  try {
    await fetch('https://baby-and-mom-app.vercel.app/api/notifications/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: 'baby-metrics', title, message, data: { type: 'metric-logged' } })
    });
  } catch (e) { console.error('Notification error:', e); }
}

async function generateReport(): Promise<string> {
  try {
    const { data: metrics } = await supabase.from('baby_metrics').select('*').order('created_at', { ascending: false }).limit(200);
    const now = new Date();
    const todayDate = now.toLocaleDateString();
    const yesterdayDate = new Date(now.getTime() - 86400000).toLocaleDateString();

    const todayMetrics = (metrics || []).filter(m => new Date(m.created_at).toLocaleDateString() === todayDate);
    const yesterdayMetrics = (metrics || []).filter(m => new Date(m.created_at).toLocaleDateString() === yesterdayDate);

    const getTotal = (arr: any[], type: string) => arr.filter(m => m.metric_type === type).reduce((sum, m) => sum + (m.value || 0), 0);
    const getCount = (arr: any[], type: string) => arr.filter(m => m.metric_type === type).length;

    const tF = getTotal(todayMetrics, 'formula');
    const yF = getTotal(yesterdayMetrics, 'formula');
    const tB = getTotal(todayMetrics, 'breastmilk');
    const yB = getTotal(yesterdayMetrics, 'breastmilk');
    const tD = getCount(todayMetrics, 'diaper');
    const yD = getCount(yesterdayMetrics, 'diaper');
    const tS = getCount(todayMetrics, 'sleep');
    const yS = getCount(yesterdayMetrics, 'sleep');

    const msg = `📊 DAY vs YESTERDAY\n\nFormula: ${tF}ml (was ${yF}ml) ${tF > yF ? '+' + (tF-yF) : (tF-yF)}ml\nBreastmilk: ${tB}ml (was ${yB}ml) ${tB > yB ? '+' + (tB-yB) : (tB-yB)}ml\nDiapers: ${tD} (was ${yD}) ${tD > yD ? '+' + (tD-yD) : (tD-yD)}\nSleep: ${tS} sessions (was ${yS}) ${tS > yS ? '+' + (tS-yS) : (tS-yS)}`;

    await sendNotification('📊 Report: Today vs Yesterday', `Formula ${tF}ml vs ${yF}ml | Breastmilk ${tB}ml vs ${yB}ml`);
    return msg;
  } catch (e) {
    console.error('Report error:', e);
    return 'Error generating report';
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const messageText = formData.get('Body') as string;
    const fromPhone = formData.get('From');
    const phoneNumber = (fromPhone as any)?.replace('whatsapp:', '') || '';

    const cleanPhone = '+' + phoneNumber.replace(/\D/g, '');
    if (!AUTHORIZED_NUMBERS.includes(cleanPhone)) {
      return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>Not authorized</Message></Response>`, {
        status: 200, headers: { 'Content-Type': 'application/xml' }
      });
    }

    let reply = '';

    // Check for appointments first
    const appointmentData = parseAppointmentMessage(messageText);
    if (appointmentData && appointmentData.isAppointment) {
      try {
        const { error } = await supabase.from('appointments').insert({
          user_id: SYSTEM_USER_ID,
          doctor: appointmentData.title,
          reason: appointmentData.description,
          appointment_date: appointmentData.appointment_date.split('T')[0],
          appointment_time: appointmentData.appointment_time,
          notes: 'WhatsApp'
        });

        if (error) throw error;
        return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>✓ Appt: ${escapeXml(appointmentData.title)}</Message></Response>`, { status: 200, headers: { 'Content-Type': 'application/xml' } });
      } catch (e: any) {
        console.error('[APT-ERR]', e);
        return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response><Message>Appt error</Message></Response>', { status: 200, headers: { 'Content-Type': 'application/xml' } });
      }
    }

    // Then check for report/commands
    if (messageText.toLowerCase().includes('report') || messageText.toLowerCase() === 'r') {
      reply = await generateReport();
    } else {
      const metric = parseMetric(messageText);

      if (metric) {
        const { error } = await supabase.from('baby_metrics').insert({
          family_id: PILOT_FAMILY_ID, baby_id: PILOT_BABY_ID, metric_type: metric.type,
          value: metric.value, unit: metric.unit, sent_from_phone: phoneNumber, created_at: getLondonTime()
        });

        if (error) {
          reply = `Error: ${error.message}`;
        } else {
          reply = `✓ Logged: ${metric.type} ${metric.value} ${metric.unit}`;
          await sendNotification('👶 Metric Logged!', `${metric.type}: ${metric.value} ${metric.unit}`);
        }
      } else {
        reply = 'Commands: 30ml formula|5.5kg weight|report or r|vaccine|diaper. Appt: Shiva Appointment 9th July 3pm or Appointment- desc day month HH:MMam title';
      }
    }

    const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(reply)}</Message></Response>`;
    return new NextResponse(twiml, { status: 200, headers: { 'Content-Type': 'application/xml' } });
  } catch (error) {
    console.error('Webhook error:', error);
    const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Error</Message></Response>`;
    return new NextResponse(twiml, { status: 200, headers: { 'Content-Type': 'application/xml' } });
  }
}

export async function GET() {
  return new NextResponse('Webhook running', { status: 200, headers: { 'Content-Type': 'text/plain' } });
}
