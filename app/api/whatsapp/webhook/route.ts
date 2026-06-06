import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const AUTHORIZED_NUMBERS = ['+919604898762', '+919871319008', '+919914789171'];
const PILOT_FAMILY_ID = 'df3d99a8-f7a2-44cf-bcb4-9c5f3300caa6';
const PILOT_BABY_ID = 'e8a7c56c-62c6-442c-94ac-518928c8c07b';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');

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
        reply = 'Commands: 30ml formula | 5.5kg weight | report or r | vaccine';
      }
    }

    const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${reply}</Message></Response>`;
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
