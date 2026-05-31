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

function getLondonTime() {
  const now = new Date();
  const londonTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/London' }));
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

async function getMetricForType(metricType: string, daysAgo = 0) {
  const { start, end } = getLondonDate(daysAgo);
  
  const { data, error } = await supabase
    .from('baby_metrics')
    .select('value, unit')
    .eq('metric_type', metricType)
    .gte('created_at', start)
    .lte('created_at', end);

  if (error) {
    console.error('Error fetching metric:', error);
    return null;
  }

  if (!data || data.length === 0) return null;

  // Sum numeric values, get first string value
  const firstVal = data[0];
  if (typeof firstVal.value === 'number') {
    const total = data.reduce((sum: number, item: any) => sum + (item.value || 0), 0);
    return { value: total, unit: firstVal.unit };
  }
  return firstVal;
}

function buildComparisonText(metric: any, todayVal: any, yesterdayVal: any) {
  if (!todayVal) return '';

  let text = `✅ ${metric.type.toUpperCase()}: ${todayVal.value}${todayVal.unit}\n`;
  
  if (yesterdayVal) {
    const diff = todayVal.value - yesterdayVal.value;
    const arrow = diff > 0 ? '↑' : diff < 0 ? '↓' : '=';
    text += `   Yesterday: ${yesterdayVal.value}${yesterdayVal.unit} ${arrow}\n`;
  } else {
    text += `   Yesterday: N/A (first time)\n`;
  }
  
  return text;
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const messageText = formData.get('Body') as string;
  const fromPhone = formData.get('From') as string;
  const phoneNumber = fromPhone?.replace('whatsapp:', '') || '';
  const londonTimestamp = getLondonTime();

  const lines = messageText.split('\n').filter(l => l.trim());
  let reply = '';
  let successCount = 0;

  for (const line of lines) {
    const metric = parseMetric(line);
    if (metric) {
      // Get today's value for this metric
      const todayVal = await getMetricForType(metric.type, 0);
      
      // Get yesterday's value for comparison
      const yesterdayVal = await getMetricForType(metric.type, 1);

      // Insert the new metric
      await supabase.from('baby_metrics').insert({
        metric_type: metric.type,
        value: metric.value,
        unit: metric.unit,
        sent_from_phone: phoneNumber,
        created_at: londonTimestamp,
      });

      successCount++;
      
      // Build comparison text
      const newVal = {
        value: (todayVal?.value || 0) + metric.value,
        unit: metric.unit
      };
      
      reply += buildComparisonText(metric, newVal, yesterdayVal);
    }
  }

  const finalReply = successCount > 0 
    ? `📊 LOGGED TODAY:\n\n${reply}\nFrom: ${phoneNumber}`
    : `❌ Not recognized\n\nFrom: ${phoneNumber}`;

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
