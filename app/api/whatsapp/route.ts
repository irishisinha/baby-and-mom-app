// Cache purged rebuild
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { handleCommand } from './commands';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-role-key',
  { auth: { persistSession: false } }
);

const AUTHORIZED_NUMBERS = ['+919604898762', '9604898762', '+919871319008', '9871319008', '+919914789171', '9914789171'];
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

const COMMANDS_HELP = `ðŸ“‹ AVAILABLE COMMANDS:

ðŸ‘¶ BABY METRICS (default person if not specified):
• Formula: "30ml formula" or "formula 30"
• Breastmilk: "20ml breast milk" or "pumped 20"
• Weight: "5.5kg" or "weight 5.5"
• Medicine: "baby paracetamol", "baby nebulization 2", "paracetamol" (baby is default)
• Vaccine: "vaccine"
• Diaper: "diaper" or "nappy"
• Bath: "bath"
• Potty: "0530 potty" (with time) or "potty"
• Oil: "oil"
• Sleep: "1 pm sleep" or "1 pm sleeping" (start), "2:30 pm sleep end" or "2:30 pm sleeping end" (end), or legacy "sleep 2 hours"
• Time format: "0640 pm - 90ml formula" or "0500 baby nebulization"

ðŸ‘© MOM/SHIVA METRICS (start with "shiva", "mom", or "mother"):
• Weight: "shiva weight 65kg"
• Measurements: "shiva chest 90cm|waist 70cm|hips 95cm|bust 95cm"
• Steps: "shiva steps 5000"
• Energy: "shiva energy 7" (1-10 scale)
• Pain: "shiva pain 3" (1-10 scale)
• Sleep: "shiva sleep 8" (hours)
• Mood: "shiva mood happy" or "tired" etc.
• Medicine: "mom paracetamol", "mom cough 2" (person-specific medicine)
• Medication: "shiva medication 2" (count)
• Exercise: "shiva exercise 30" OR "shiva yoga 45" OR "shiva running 30"
  Types: yoga|running|walking|cycling|gym|swimming|pilates|dance|cardio|strength|stretching|hiking

ðŸ‘¨ DAD/RISHI & ðŸ‘µ GRANDMOM/ICHI:
Same format as MOM: "rishi steps 5000" or "ichi mood happy"

ðŸ”… APPOINTMENTS:
• Quick: “appt [day] [month] [time] [person] [title]”
  Examples: “appt 18 sept 1330 rishi checkup” or “appt 15 july 3pm mom vaccine”
• Full: “Appointment- checkup 15 July 2:30pm Pediatrician”

ðŸ” COMMANDS:
• "appt" - Show upcoming appointments
• "feed" - Show today's feed logs
• "report" - Show today vs yesterday summary
• "medsreport" - Show medicines today vs yesterday (baby & mom)`;


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

  // Simple format: "appt [day] [month] [HHMM or H:MM] [person] [title...]"
  // e.g. "appt 18 sept 1330 rishi checkup" or "appt 18 sept 2pm mom vaccine"
  const simpleMatch = trimmed.match(/^appt\s+(\d{1,2})\s+(\w+)\s+([\d:]+)\s+(?:(am|pm)\s+)?(\w+)\s+(.+)$/i);
  if (simpleMatch) {
    const [, day, month, timeStr, ampm, person, title] = simpleMatch;
    const monthNum = MONTH_MAP[month.toLowerCase()];
    if (!monthNum) {
      return { error: true, message: `Invalid month: ${month}` };
    }

    let hours = 0, minutes = 0;
    if (timeStr.includes(':')) {
      const [h, m] = timeStr.split(':').map(x => parseInt(x, 10));
      hours = h;
      minutes = m;
    } else {
      // HHMM format like 1330
      const num = parseInt(timeStr, 10);
      hours = Math.floor(num / 100);
      minutes = num % 100;
    }

    if (hours > 23 || minutes > 59) {
      return { error: true, message: `Invalid time: ${timeStr}` };
    }
    if (ampm) {
      const am = ampm.toLowerCase() === 'am';
      if (!am && hours !== 12) hours += 12;
      if (am && hours === 12) hours = 0;
    }

    const description = `${person} - ${title}`;
    return buildAppointment(title.trim(), description, day, monthNum, hours, minutes);
  }

  // Detect if user tried appt format but got it wrong
  if (trimmed.match(/^appt\s+/i)) {
    return { error: true, message: 'Format: appt [day] [month] [time] [person] [title]\nExample: appt 18 sept 1330 rishi checkup' };
  }

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


// Convert a wall-clock time (hours/minutes) in a specified timezone into the correct
// UTC Date instant, using `referenceNow` to determine the current calendar date and DST offset.
function wallTimeToUTC(hours: number, minutes: number, timeZone: string, referenceNow: Date): Date {
  const ymdFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit'
  })
  const [y, mo, d] = ymdFormatter.format(referenceNow).split('-').map(Number)

  // For Europe/London, use hardcoded offset (0 in winter, 1 in summer)
  let offsetMinutes = 0
  if (timeZone === 'Europe/London') {
    // UK summer time: last Sunday of March to last Sunday of October
    const month = mo - 1 // 0-11
    const dayOfMonth = d
    const dayOfWeek = new Date(Date.UTC(y, month, dayOfMonth)).getUTCDay()

    // Simplified: UK is in BST (GMT+1) from late March to late October
    const isInBST = (month > 2 && month < 9) ||
                    (month === 2 && dayOfMonth > 24) ||
                    (month === 9 && dayOfMonth < 24)
    offsetMinutes = isInBST ? 60 : 0
  } else {
    // Fallback: try to extract from Intl
    const offsetFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'shortOffset'
    })
    const tzPart = offsetFormatter.formatToParts(referenceNow).find(p => p.type === 'timeZoneName')?.value || 'GMT+0'
    const offsetMatch = tzPart.match(/GMT([+-]\d+)(?::(\d+))?/)
    offsetMinutes = (offsetMatch && offsetMatch[1] ? parseInt(offsetMatch[1], 10) : 0) * 60 + (offsetMatch && offsetMatch[2] ? parseInt(offsetMatch[2], 10) : 0)
  }

  return new Date(Date.UTC(y, mo - 1, d, hours, minutes, 0) - offsetMinutes * 60000)
}

function extractTimeFromMessage(text: string): Date | null {
  const trimmed = text.trim()

  // Family convention: "HHMM[ am/pm][ -] description"
  // e.g. "0640 pm - 90 ml formula", "0845 pm 90 ml formula", "0810- paracetamol", "640pm-90ml formula", "530 am 90 ml formula"
  // For 4-digit numbers, REQUIRE am/pm or must be in HHMM format (not a year like 2015)
  // For 3-digit numbers, optional am/pm, separator is optional (dash/colon/space)
  const prefixMatch = trimmed.match(/^(\d{3,4})\s*(am|pm|a\.m\.|p\.m\.)?\s*?[-:\s]/i)

  let hours: number | null = null
  let minutes: number | null = null
  let meridiem = ''

  if (prefixMatch) {
    const digits = prefixMatch[1]
    const ampm = (prefixMatch[2] || '').toLowerCase().replace(/\./g, '')

    // For 4-digit numbers, require am/pm or it must be valid 24h time (00-23:00-59)
    if (digits.length === 4) {
      // 4-digit format: HHMM (e.g., 0640, 2015)
      const h = parseInt(digits.slice(0, 2), 10)
      const m = parseInt(digits.slice(2), 10)

      // Only accept if: has am/pm, or is valid 24h time (h <= 23 and m <= 59)
      // This prevents treating years like "2015" as times
      if ((ampm === 'pm' || ampm === 'am') || (h <= 23 && m <= 59)) {
        if (h <= 23 && m <= 59) {
          hours = h
          minutes = m
          if (ampm === 'pm') meridiem = 'PM'
          else if (ampm === 'am') meridiem = 'AM'
        }
      }
    } else {
      // 3-digit format: HMM (e.g., 640 for 6:40)
      const h = parseInt(digits.slice(0, 1), 10)
      const m = parseInt(digits.slice(1), 10)

      if (h <= 23 && m <= 59) {
        hours = h
        minutes = m
        if (ampm === 'pm') meridiem = 'PM'
        else if (ampm === 'am') meridiem = 'AM'
      }
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

  // Handle 12-hour format ” only convert if hours is in 12h range (< 13)
  // "1630 pm" should stay as 16:30 (already 24h), not become 28:30
  if (meridiem === 'PM' && hours < 12) hours += 12
  if (meridiem === 'AM' && hours === 12) hours = 0

  return wallTimeToUTC(hours, minutes, 'Europe/London', new Date())
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
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
    // Exercise types: "yoga 45", "running 30", "walking 20", "gym 60", etc.
    const exerciseTypes = ['yoga', 'running', 'walking', 'cycling', 'gym', 'swimming', 'pilates', 'dance', 'cardio', 'strength', 'stretching', 'hiking'];
    for (const exType of exerciseTypes) {
      if (cleanText.includes(exType)) {
        const match = cleanText.match(/(\d+)/);
        if (match) {
          const duration = match[1];
          return { metric_type: 'wellness_exercise', value: `${exType}:${duration}`, unit: 'mins', isMetric: true, personType };
        }
      }
    }
    if (cleanText.includes('medication')) {
      const match = cleanText.match(/(\d+)/);
      if (match) return { metric_type: 'wellness_medication', value: match[1], unit: 'count', isMetric: true, personType };
    }
    // Weight and measurements for family members (mom, dad, grandmom)
    let match = cleanText.match(/(\d+(?:[.,]\d+)?)[\s.]*(kg)[\s.]*(w(eight|right)?)?/i) || cleanText.match(/(w(eight|right)?)[\s.]*(\d+(?:[.,]\d+)?)[\s.]*(kg)?/i);
    if (match) {
      const val = (/^\d/.test(match[1]) ? match[1] : match[3]).replace(',', '.');
      return { metric_type: 'weight', value: val, unit: 'kg', isMetric: true, personType };
    }

    match = cleanText.match(/(chest|waist|hips|bust)[\s.]*(\d+(?:[.,]\d+)?)[\s.]*(cm)?/i) || cleanText.match(/(\d+(?:[.,]\d+)?)[\s.]*(cm)[\s.]*(chest|waist|hips|bust)/i);
    if (match) {
      const measureType = (/^\d/.test(match[1]) ? match[3] : match[1]).toLowerCase();
      const val = (/^\d/.test(match[1]) ? match[1] : match[2]).replace(',', '.');
      if (['chest', 'waist', 'hips', 'bust'].includes(measureType)) {
        return { metric_type: `measurement_${measureType}`, value: val, unit: 'cm', isMetric: true, personType };
      }
    }
    return null;
  }

  // Baby metrics
  let match = text.match(/formula[\s.]*(\d+)[\s.]*(ml)?/i) || text.match(/(\d+)[\s.]*(ml)[\s.]*formula/i);
  if (match) return { metric_type: 'formula', value: match[1], unit: 'ml', isMetric: true, personType };

  // Baby Medicine - "paracetamol", "baby paracetamol 2", "mom ibuprofen", "0810- paracetamol"
  let medicinePerson = 'baby';
  let medicineText = cleanText;
  if (cleanText.match(/^(baby|mom|mother)\s+/)) {
    const personMatch = cleanText.match(/^(baby|mom|mother)\s+/);
    medicinePerson = personMatch![1].toLowerCase() === 'baby' ? 'baby' : 'mom';
    medicineText = cleanText.replace(/^(baby|mom|mother)\s+/i, '').trim();
  }

  const medicineKeywords = ['medicine', 'paracetamol', 'ibuprofen', 'calpol', 'aspirin', 'antibiotic', 'nebulization', 'cough', 'fever'];
  const medicineMatch = medicineText.match(new RegExp(`(${medicineKeywords.join('|')})`, 'i'));
  if (medicineMatch) {
    const medicineName = medicineMatch[1];
    // Extract optional dosage number (e.g., "paracetamol 2" → dosage=2)
    const dosageMatch = medicineText.match(/(?:paracetamol|ibuprofen|calpol|aspirin|antibiotic|medicine|nebulization|cough|fever)\s+(\d+)/i);
    const dosage = dosageMatch ? dosageMatch[1] : '1';
    return { metric_type: 'medicine', value: medicineName.toLowerCase(), unit: 'dose', isMetric: true, personType: medicinePerson };
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

  // Measurements - "chest 90cm", "waist 70cm", "hips 95cm", "bust 95cm"
  match = text.match(/(chest|waist|hips|bust)[\s.]*(\d+(?:[.,]\d+)?)[\s.]*(cm)?/i) || text.match(/(\d+(?:[.,]\d+)?)[\s.]*(cm)[\s.]*(chest|waist|hips|bust)/i);
  if (match) {
    const measureType = (/^\d/.test(match[1]) ? match[3] : match[1]).toLowerCase();
    const val = (/^\d/.test(match[1]) ? match[1] : match[2]).replace(',', '.');
    if (['chest', 'waist', 'hips', 'bust'].includes(measureType)) {
      return { metric_type: `measurement_${measureType}`, value: val, unit: 'cm', isMetric: true, personType };
    }
  }

  if (/vaccine/i.test(text)) return { metric_type: 'vaccine', value: '1', unit: 'count', isMetric: true, personType };
  if (/diaper|nappy/i.test(text)) return { metric_type: 'diaper', value: '1', unit: 'count', isMetric: true, personType };
  if (/bath/i.test(text)) return { metric_type: 'bath', value: 'yes', unit: 'confirmation', isMetric: true, personType };
  if (/potty/i.test(text)) return { metric_type: 'potty', value: 'logged', unit: 'time', isMetric: true, personType };
  if (/oil/i.test(text)) return { metric_type: 'oil', value: 'yes', unit: 'confirmation', isMetric: true, personType };

  // Sleep: "1 pm sleep" or "sleeping" (start) vs "sleep end" or "sleeping end" (end)
  if (/(sleep|sleeping)/i.test(text)) {
    const isSleepEnd = /\bend\b/i.test(text);
    const sleepPhase = isSleepEnd ? 'end' : 'start';
    // Store as numeric (value col is numeric type): 1=start, 0=end; actual time in created_at
    const sleepValue = isSleepEnd ? '0' : '1';
    return { metric_type: 'sleep', value: sleepValue, unit: sleepPhase, isMetric: true, personType };
  }

  // Legacy: duration format "sleep 2 hours" still supported
  match = text.match(/(\d+)[\s.]*(hour|hr)/i);
  if (match && /sleep/i.test(text)) return { metric_type: 'sleep', value: match[1], unit: 'hours', isMetric: true, personType };

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const params = new URLSearchParams(body);

    const messageBody = params.get('Body') || '';
    const fromPhone = params.get('From') || '';
    const messageSid = params.get('MessageSid') || '';

    console.log('[WA-MSG]', { messageBody, fromPhone, messageSid });

    const normalizedPhone = fromPhone.replace(/^whatsapp:/, '').replace(/\s+/g, '');
    const isAuthorized = AUTHORIZED_NUMBERS.includes(normalizedPhone);

    console.log('[AUTH-CHECK]', { normalizedPhone, isAuthorized, authorizedNumbers: AUTHORIZED_NUMBERS });

    if (!isAuthorized) {
      console.log('[WA-UNAUTH]', { fromPhone, normalizedPhone, authorizedNumbers: AUTHORIZED_NUMBERS });
      return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response><Message>Not authorized</Message></Response>', { status: 200, headers: { 'Content-Type': 'application/xml' } });
    }

    // Handle appt command
    if (messageBody.toLowerCase().trim() === 'appt') {
      const apptList = await handleCommand(messageBody, fromPhone, FAMILY_ID);
      if (apptList) {
        return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(apptList)}</Message></Response>`, { status: 200, headers: { 'Content-Type': 'application/xml' } });
      }
    }

    // Handle feed command
    if (messageBody.toLowerCase().trim() === 'feed') {
      const feedList = await handleCommand(messageBody, fromPhone, FAMILY_ID);
      if (feedList) {
        return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(feedList)}</Message></Response>`, { status: 200, headers: { 'Content-Type': 'application/xml' } });
      }
    }

    // Handle report command
    if (messageBody.toLowerCase().trim() === 'report') {
      const report = await handleCommand(messageBody, fromPhone, FAMILY_ID);
      if (report) {
        return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(report)}</Message></Response>`, { status: 200, headers: { 'Content-Type': 'application/xml' } });
      }
    }

    // Handle medsreport command
    if (messageBody.toLowerCase().trim() === 'medsreport') {
      const medsReport = await handleCommand(messageBody, fromPhone, FAMILY_ID);
      if (medsReport) {
        return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(medsReport)}</Message></Response>`, { status: 200, headers: { 'Content-Type': 'application/xml' } });
      }
    }

    const appointmentData = parseAppointmentMessage(messageBody);

    // Handle appt format errors
    if (appointmentData && appointmentData.error) {
      return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(appointmentData.message)}</Message></Response>`, { status: 200, headers: { 'Content-Type': 'application/xml' } });
    }

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
        return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>âœ“ Appt: ${escapeXml(appointmentData.title)}</Message></Response>`, { status: 200, headers: { 'Content-Type': 'application/xml' } });
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


    const metricData = parseMetric(messageBody);
    console.log('[PARSE-METRIC]', { messageBody, metricData });
    if (metricData && metricData.isMetric) {
      try {
        const extractedTime = extractTimeFromMessage(messageBody)
        console.log('[TIME-EXTRACT]', { messageBody, extractedTime: extractedTime?.toISOString(), extractedTimeLocal: extractedTime?.toLocaleString('en-GB', { timeZone: 'Europe/London' }) });
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

        // Deduplication: check for identical metric with same timestamp logged recently
        // Use the insertData.created_at (extracted time) to find duplicates
        const metricTimestamp = insertData.created_at;
        const { data: recentDuplicates } = await supabase
          .from('baby_metrics')
          .select('id')
          .eq('family_id', FAMILY_ID)
          .eq('metric_type', metricData.metric_type)
          .eq('value', metricData.value)
          .eq('person_type', metricData.personType)
          .eq('created_at', metricTimestamp)
          .limit(1);

        if (recentDuplicates && recentDuplicates.length > 0) {
          console.log('[DUPLICATE-METRIC]', { metricData, insertData, duplicateFound: true });
          return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>[OK] ${metricData.value}${metricData.unit} ${metricData.metric_type}</Message></Response>`, { status: 200, headers: { 'Content-Type': 'application/xml' } });
        }

        const { data, error } = await supabase.from('baby_metrics').insert([insertData]).select();

        if (error) {
          console.error('[INSERT-ERR]', { error: error.message, insertData });
          throw error;
        }
        
        const responseMsg = `[OK] ${metricData.value}${metricData.unit} ${metricData.metric_type}`;
        console.log('[METRIC-SUCCESS]', { responseMsg, metricData });
        return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(responseMsg)}</Message></Response>`, { status: 200, headers: { 'Content-Type': 'application/xml' } });
      } catch (e: any) {
        console.error('[METRIC-ERR]', { error: e.message, metricData });
        return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>Error: ${escapeXml(e.message?.substring(0, 30) || 'metric error')}</Message></Response>`, { status: 200, headers: { 'Content-Type': 'application/xml' } });
      }
    }

    return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(COMMANDS_HELP)}</Message></Response>`, { status: 200, headers: { 'Content-Type': 'application/xml' } });

  } catch (error) {
    console.error('[ERROR]', error);
    return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response><Message>Error</Message></Response>', { status: 200, headers: { 'Content-Type': 'application/xml' } });
  }
}






