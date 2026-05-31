import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

function parseMetric(text: string) {
  const lower = text.toLowerCase().trim();
  
  if (lower.includes('breastmilk')) {
    const num = lower.match(/(\d+)/);
    if (num) return { type: 'breastmilk', value: parseInt(num[1]), unit: 'ml' };
  }
  if (lower.includes('formula')) {
    const num = lower.match(/(\d+)/);
    if (num) return { type: 'formula', value: parseInt(num[1]), unit: 'ml' };
  }
  if (lower.includes('potty')) return { type: 'potty', value: 1, unit: 'count' };
  if (lower.includes('diaper')) return { type: 'diaper', value: 1, unit: 'count' };
  if (lower.includes('bath')) return { type: 'bath', value: 1, unit: 'done' };
  if (lower.includes('oil')) return { type: 'oil', value: 1, unit: 'done' };
  if (lower.includes('sleep') || lower.includes('nap')) {
    const num = lower.match(/(\d+\.?\d*)\s*(?:hour|hr|h)?/);
    if (num) return { type: 'sleep', value: parseFloat(num[1]), unit: 'hours' };
  }
  if (lower.includes('weight') && !lower.includes('next')) {
    const num = lower.match(/(\d+\.?\d*)\s*kg/);
    if (num) return { type: 'weight', value: parseFloat(num[1]), unit: 'kg' };
  }
  if (lower.includes('fever')) {
    const num = lower.match(/(\d+\.?\d*)/);
    if (num) return { type: 'fever', value: parseFloat(num[1]), unit: 'f' };
  }
  if (lower.includes('vaccine')) return { type: 'vaccine', value: 'Vaccine recorded', unit: 'given' };
  if (lower.includes('doc') || lower.includes('doctor')) return { type: 'doc_notes', value: 'Notes saved', unit: 'notes' };
  if (lower.includes('next') && (lower.includes('appt') || lower.includes('weight') || lower.includes('june') || lower.includes('may'))) {
    return { type: 'next_appointment', value: 'Appointment set', unit: 'scheduled' };
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

function getLondonTime(daysOffset = 0, specificDate?: string) {
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

  if (error) {
    console.error('Error fetching metric:', error);
    return null;
  }

  return data && data.length > 0 ? data[0] : null;
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const messageText = formData.get('Body') as string;
  const fromPhone = formData.get('From') as string;
  const phoneNumber = fromPhone?.replace('whatsapp:', '') || '';

  const lines = messageText.split('\n').filter(l => l.trim());
  let reply = '';
  let successCount = 0;

  for (const line of lines) {
    const lower = line.toLowerCase().trim();

    if (lower.startsWith('edit:') || lower.startsWith('edit ')) {
      const editText = lower.startsWith('edit:') 
        ? line.substring(5).trim() 
        : line.substring(4).trim();
      
      const metric = parseMetric(editText);
      
      if (metric) {
        const latest = await getLatestMetricForToday(metric.type);
        
        if (latest) {
          const { error } = await supabase
            .from('baby_metrics')
            .update({
              value: metric.value,
              unit: metric.unit,
            })
            .eq('id', latest.id);

          if (!error) {
            successCount++;
            reply += `UPDATED ${metric.type.toUpperCase()}:\n`;
            reply += `   Old: ${latest.value}${latest.unit}\n`;
            reply += `   New: ${metric.value}${metric.unit}\n`;
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
        
        reply += `${metric.type.toUpperCase()}: ${metric.value}${metric.unit}`;
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

  await client.messages.create({
    from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
    to: fromPhone,
    body: finalReply,
  });

  return NextResponse.json({ success: true });
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
