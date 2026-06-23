// Cache purged rebuild
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { handleCommand } from './commands';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-role-key',
  { auth: { persistSession: false } }
);

const AUTHORIZED_NUMBERS = ['+919604898762', '+919871319008', '+919914789171'];
const FAMILY_ID = 'df3d99a8-f7a2-44cf-bcb4-9c5f3300caa6';
const BABY_ID = 'e8a7c56c-62c6-442c-94ac-518928c8c07b';
const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';

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

// NOTE: Defined via regex literal .source (not a "\\b" string escape) because Next.js's
// SWC compiler mis-serializes "\\b" inside template literals used with `new RegExp(...)`,
// turning it into a literal backspace character and silently breaking word-boundary matches.
const WORD_BOUNDARY = /\b/.source;

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

  // Legacy format: "Appointment- [desc] [day] [month] [HH:MM am/pm] [title]"
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

  // Natural format: "[title] appointment [on] [DD(st/nd/rd/th)] [of] [month] [at] [H[:MM][am/pm]] [description]"
  // e.g. "Shiva appointment 9th July 3pm", "appointment for Shiva on 9 July at 3:30pm with Dr Smith"
  if (!/\bappointment\b/i.test(trimmed)) return null;

  const naturalMatch = trimmed.match(new RegExp(
    `^(?:(?!appointment${WORD_BOUNDARY})(.+?)\\s+)?appointment${WORD_BOUNDARY}\\s*(?:on\\s+|for\\s+)?(?:the\\s+)?(?:([A-Za-z][A-Za-z\\s]*?)\\s+)?(?:` +
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


// Convert a Europe/London wall-clock time (hours/minutes) into the correct
// UTC Date instant. The calendar date is always the date the message was
// received (`referenceNow`'s London date) — deliberately not guessed from
// whether the time-of-day looks "in the future," since that heuristic was
// itself a source of off-by-one-day bugs (e.g. a message processed a few
// seconds before its literal target minute getting bumped back a day).
// The family always logs feeds at/near the time they happen, so the date
// stored is simply the date stated independently of the parsed time.
function londonWallTimeToUTC(hours: number, minutes: number, referenceNow: Date): Date {
  const ymdFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/London',
    year: 'numeric', month: '2-digit', day: '2-digit'
  })
  const [y, mo, d] = ymdFormatter.format(referenceNow).split('-').map(Number)

  const offsetFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/London',
    timeZoneName: 'shortOffset'
  })
  const tzPart = offsetFormatter.formatToParts(referenceNow).find(p => p.type === 'timeZoneName')?.value || 'GMT+0'
  const offsetMatch = tzPart.match(/GMT([+-]\d+)?/)
  const offsetMinutes = (offsetMatch && offsetMatch[1] ? parseInt(offsetMatch[1], 10) : 0) * 60

  return new Date(Date.UTC(y, mo - 1, d, hours, minutes, 0) - offsetMinutes * 60000)
}

// Optional explicit date prefix ahead of the time, e.g. "22/06 2330 - 20ml formula"
// or "22/06/2026 11:30pm - ...". Uses "/" specifically (never "-") since "-" is
// already the family's time/description separator and would collide otherwise.
function extractLeadingDate(text: string): { day: number; month: number; year: number | null; remainder: string } | null {
  const m = text.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\s+(.+)$/)
  if (!m) return null

  const day = parseInt(m[1], 10)
  const month = parseInt(m[2], 10)
  if (day < 1 || day > 31 || month < 1 || month > 12) return null

  let year: number | null = null
  if (m[3]) {
    year = parseInt(m[3], 10)
    if (year < 100) year += 2000
  }

  return { day, month, year, remainder: m[4] }
}

// Parses just the hour/minute-of-day out of text — no date, no UTC conversion.
function parseTimeOfDay(text: string): { hours: number; minutes: number } | null {
  const trimmed = text.trim()

  // Family convention: "HHMM[ am/pm] - description" or "HHMM- description"
  // e.g. "0640 pm - 90 ml formula", "0810- paracetamol", "640pm-90ml formula"
  const prefixMatch = trimmed.match(/^(\d{3,4})\s*(am|pm|a\.m\.|p\.m\.)?\s*[-:]\s*/i)

  let hours: number | null = null
  let minutes: number | null = null
  let meridiem = ''

  if (prefixMatch) {
    const digits = prefixMatch[1]
    const h = digits.length === 4 ? parseInt(digits.slice(0, 2), 10) : parseInt(digits.slice(0, 1), 10)
    const m = digits.length === 4 ? parseInt(digits.slice(2), 10) : parseInt(digits.slice(1), 10)

    if (h <= 23 && m <= 59) {
      hours = h
      minutes = m
      const ampm = (prefixMatch[2] || '').toLowerCase().replace(/\./g, '')
      if (ampm === 'pm') meridiem = 'PM'
      else if (ampm === 'am') meridiem = 'AM'
    }
  }

  if (hours === null) {
    // Fallback: time mentioned anywhere in the message, e.g. "2:47pm", "14:47", "2.47pm"
    const timePatterns = [
      /(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(?:am|pm|a\.m\.|p\.m\.)?/i, // 2:47pm, 14:47
      /(\d{1,2})\.(\d{2})\s*(?:am|pm)?/i, // 2.47 format
    ]

    for (const pattern of timePatterns) {
      const match = trimmed.match(pattern)
      if (match) {
        // Check for am/pm after the time
        const afterTime = trimmed.substring(match.index! + match[0].length, match.index! + match[0].length + 5)
        if (afterTime.toLowerCase().includes('pm') || afterTime.toLowerCase().includes('p.m')) meridiem = 'PM'
        else if (afterTime.toLowerCase().includes('am') || afterTime.toLowerCase().includes('a.m')) meridiem = 'AM'
        else if (match[0].toLowerCase().includes('pm')) meridiem = 'PM'
        else if (match[0].toLowerCase().includes('am')) meridiem = 'AM'

        hours = parseInt(match[1], 10)
        minutes = parseInt(match[2], 10)
        break
      }
    }

    // Bare hour + am/pm with no minutes, e.g. "11 am", "11am for 90 ml formula"
    if (hours === null) {
      const bareMatch = trimmed.match(/(\d{1,2})\s*(am|pm|a\.m\.|p\.m\.)/i)
      if (bareMatch) {
        hours = parseInt(bareMatch[1], 10)
        minutes = 0
        const ampm = bareMatch[2].toLowerCase().replace(/\./g, '')
        meridiem = ampm === 'pm' ? 'PM' : 'AM'
      }
    }
  }

  if (hours === null || minutes === null) return null

  // Handle 12-hour format — only convert if hours is in 12h range (< 13)
  // "1630 pm" should stay as 16:30 (already 24h), not become 28:30
  if (meridiem === 'PM' && hours < 12) hours += 12
  if (meridiem === 'AM' && hours === 12) hours = 0

  return { hours, minutes }
}

// Builds the UTC instant for an explicit Europe/London calendar date + wall time.
// No "is this in the future" guessing needed — the date was stated explicitly.
function londonDateTimeToUTC(day: number, month: number, year: number, hours: number, minutes: number): Date {
  // First pass at 0 offset, just to find the correct BST/GMT offset for that date
  // (DST can differ from "now" if backdating across a March/October boundary).
  const approx = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0))
  const offsetFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/London',
    timeZoneName: 'shortOffset'
  })
  const tzPart = offsetFormatter.formatToParts(approx).find(p => p.type === 'timeZoneName')?.value || 'GMT+0'
  const offsetMatch = tzPart.match(/GMT([+-]\d+)?/)
  const offsetMinutes = (offsetMatch && offsetMatch[1] ? parseInt(offsetMatch[1], 10) : 0) * 60

  return new Date(approx.getTime() - offsetMinutes * 60000)
}

function extractTimeFromMessage(text: string): Date | null {
  const trimmed = text.trim()
  const dateMatch = extractLeadingDate(trimmed)
  const searchText = dateMatch ? dateMatch.remainder : trimmed

  const timeOfDay = parseTimeOfDay(searchText)
  if (!timeOfDay) return null

  if (dateMatch) {
    const year = dateMatch.year ?? new Date().getFullYear()
    return londonDateTimeToUTC(dateMatch.day, dateMatch.month, year, timeOfDay.hours, timeOfDay.minutes)
  }

  return londonWallTimeToUTC(timeOfDay.hours, timeOfDay.minutes, new Date())
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

  // Baby Medicine - "paracetamol", "medicine paracetamol", "0810- paracetamol"
  if (cleanText.match(/medicine|paracetamol|ibuprofen|calpol|aspirin|antibiotic/i)) {
    const medicineMatch = cleanText.match(/([a-z]+)/i);
    if (medicineMatch) {
      return { metric_type: 'medicine', value: medicineMatch[1], unit: 'given', isMetric: true, personType };
    }
  }

  // Breastmilk - "pumped 20ml", "20ml pumped", "breast milk 20"  
  match = text.match(/pumped[\s.]*(\d+)[\s.]*(ml)?/i) || 
          text.match(/(\d+)[\s.]*(ml)[\s.]*pumped/i) ||
          text.match(/breast[\s.]*milk[\s.]*(\d+)[\s.]*(ml)?/i) || 
          text.match(/(\d+)[\s.]*(ml)[\s.]*breast[\s.]*milk/i) ||
          text.match(/breastmilk[\s.]*(\d+)[\s.]*(ml)?/i) || 
          text.match(/(\d+)[\s.]*(ml)[\s.]*breastmilk/i);
  if (match) return { metric_type: 'breastmilk', value: match[1], unit: 'ml', isMetric: true, personType };

  // Weight - "5.5kg", "5.5 kg weight", "weight 5.5kg"
  match = text.match(/(\d+(?:[.,]\d+)?)[\s.]*(kg)[\s.]*(w(eight|right)?)?/i) || text.match(/(w(eight|right)?)[\s.]*(\d+(?:[.,]\d+)?)[\s.]*(kg)?/i);
  if (match) {
    const val = (/^\d/.test(match[1]) ? match[1] : match[3]).replace(',', '.');
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

    // Handle report command
    if (messageBody.toLowerCase().trim() === 'report') {
      const report = await handleCommand(messageBody, fromPhone, FAMILY_ID);
      if (report) {
        return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${report}</Message></Response>`, { status: 200, headers: { 'Content-Type': 'application/xml' } });
      }
    }

    const appointmentData = parseAppointmentMessage(messageBody);
    if (appointmentData && appointmentData.isAppointment) {
      try {
        const { data, error } = await supabase.from('appointments').insert({
          user_id: SYSTEM_USER_ID,
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
    if (messageBody.toLowerCase().includes('status')) {
      return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>Formula: 300ml
Breastmilk: 0ml
Total: 300ml</Message></Response>`, { status: 200, headers: { 'Content-Type': 'application/xml' } });
    }


    const leadingDate = extractLeadingDate(messageBody.trim())
    const metricData = parseMetric(leadingDate ? leadingDate.remainder : messageBody);
    if (metricData && metricData.isMetric) {
      try {
        const extractedTime = extractTimeFromMessage(messageBody)
        const insertData: any = {
          family_id: FAMILY_ID,
          metric_type: metricData.metric_type,
          value: metricData.value,
          unit: metricData.unit,
          person_type: metricData.personType,
          sent_from_phone: fromPhone,
          created_at: extractedTime ? extractedTime.toISOString() : new Date().toISOString()
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
        
        const roundTripped = data?.[0]?.created_at;
        return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>✓ ${metricData.value}${metricData.unit} ${metricData.metric_type} [DBG sent=${insertData.created_at} db=${roundTripped}]</Message></Response>`, { status: 200, headers: { 'Content-Type': 'application/xml' } });
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


