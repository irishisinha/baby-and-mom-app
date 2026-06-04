import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const AUTHORIZED_NUMBERS = [
  '+919604898762',
  '+919871319008',
  '+919914789171',
];

const PILOT_FAMILY_ID = 'df3d99a8-f7a2-44cf-bcb4-9c5f3300caa6';
const PILOT_BABY_ID = 'e8a7c56c-62c6-442c-94ac-518928c8c07b';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

function parseMetric(text: string) {
  const lower = text.toLowerCase().trim();
  
  const numberMatch = lower.match(/(\d+)\s*ml/);
  const number = numberMatch ? parseInt(numberMatch[1]) : null;

  const weightMatch = lower.match(/(\d+(?:\.\d+)?)\s*kg/);
  const weight = weightMatch ? parseFloat(weightMatch[1]) : null;

  if (lower.includes('formula')) {
    return number ? { type: 'formula', value: number, unit: 'ml' } : null;
  }
  if (lower.includes('breastmilk') || lower.includes('breast milk')) {
    return number ? { type: 'breastmilk', value: number, unit: 'ml' } : null;
  }
  if (lower.includes('weight')) {
    return weight ? { type: 'weight', value: weight, unit: 'kg' } : null;
  }
  if (lower.includes('vaccine')) {
    return { type: 'vaccine', value: 1, unit: 'done' };
  }
  if (lower.includes('diaper')) {
    return { type: 'diaper', value: 1, unit: 'count' };
  }
  if (lower.includes('sleep')) {
    return { type: 'sleep', value: 1, unit: 'session' };
  }
  if (lower.includes('bath')) {
    return { type: 'bath', value: 1, unit: 'times' };
  }
  if (lower.includes('potty')) {
    return { type: 'potty', value: 1, unit: 'count' };
  }
  if (lower.includes('oil')) {
    return { type: 'oil', value: 1, unit: 'times' };
  }

  return null;
}

function getLondonTime() {
  const now = new Date();
  const londonTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/London' }));
  return londonTime.toISOString();
}

async function sendNotification(title: string, message: string) {
  try {
    await fetch('https://baby-and-mom-app.vercel.app/api/notifications/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic: 'baby-metrics',
        title,
        message,
        data: { type: 'metric-logged' }
      })
    });
  } catch (error) {
    console.error('Notification error:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const messageText = formData.get('Body') as string;
    const fromPhone = formData.get('From') as string;
    const phoneNumber = fromPhone?.replace('whatsapp:', '') || '';

    const cleanPhone = '+' + phoneNumber.replace(/\D/g, '');
    if (!AUTHORIZED_NUMBERS.includes(cleanPhone)) {
      const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Not authorized</Message></Response>`;
      return new NextResponse(twiml, {
        status: 200,
        headers: { 'Content-Type': 'application/xml' }
      });
    }

    let reply = '';
    const metric = parseMetric(messageText);

    if (metric) {
      const { error } = await supabase.from('baby_metrics').insert({
        family_id: PILOT_FAMILY_ID,
        baby_id: PILOT_BABY_ID,
        metric_type: metric.type,
        value: metric.value,
        unit: metric.unit,
        sent_from_phone: phoneNumber,
        created_at: getLondonTime()
      });

      if (error) {
        console.error('Insert error:', error);
        reply = `Error: ${error.message}`;
      } else {
        reply = `✓ Logged: ${metric.type} ${metric.value} ${metric.unit}`;
        
        await sendNotification(
          '👶 Metric Logged!',
          `${metric.type.charAt(0).toUpperCase() + metric.type.slice(1)}: ${metric.value} ${metric.unit}`
        );
      }
    } else {
      reply = 'Try: "30ml formula", "5.5kg weight", or "vaccine"';
    }

    const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${reply}</Message></Response>`;
    return new NextResponse(twiml, {
      status: 200,
      headers: { 'Content-Type': 'application/xml' }
    });
  } catch (error: any) {
    console.error('Webhook error:', error);
    const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Error processing message</Message></Response>`;
    return new NextResponse(twiml, {
      status: 200,
      headers: { 'Content-Type': 'application/xml' }
    });
  }
}

export async function GET() {
  return new NextResponse('Webhook is running', {
    status: 200,
    headers: { 'Content-Type': 'text/plain' }
  });
}
