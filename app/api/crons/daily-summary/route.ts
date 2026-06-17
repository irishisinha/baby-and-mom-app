import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'
);

// Vercel Hobby plan only allows one cron run per day, so this fires at a
// fixed 16:00 UTC, which is 5pm London during BST (most of the year) but
// 4pm during GMT (Oct-Mar) — there's no way to track the DST shift exactly
// with a single fixed-UTC trigger on this plan.
function getLondonMidnightUTC(now: Date): Date {
  const ymdFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/London',
    year: 'numeric', month: '2-digit', day: '2-digit'
  });
  const [y, mo, d] = ymdFormatter.format(now).split('-').map(Number);
  const offsetFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/London',
    timeZoneName: 'shortOffset'
  });
  const tzPart = offsetFormatter.formatToParts(now).find(p => p.type === 'timeZoneName')?.value || 'GMT+0';
  const offsetMatch = tzPart.match(/GMT([+-]\d+)?/);
  const offsetMinutes = (offsetMatch && offsetMatch[1] ? parseInt(offsetMatch[1], 10) : 0) * 60;
  return new Date(Date.UTC(y, mo - 1, d, 0, 0, 0) - offsetMinutes * 60000);
}

export async function GET(request: NextRequest) {
  try {
    const now = new Date();
    const todayMidnightUTC = getLondonMidnightUTC(now);

    const { data: metrics } = await supabase
      .from('baby_metrics')
      .select('*')
      .gte('created_at', todayMidnightUTC.toISOString());

    const summary: any = {};
    for (const metric of metrics || []) {
      if (!summary[metric.metric_type]) {
        summary[metric.metric_type] = [];
      }
      summary[metric.metric_type].push(metric.value);
    }

    const formula = summary.formula?.reduce((a: any, b: any) => a + b, 0) || 0;
    const breastmilk = summary.breastmilk?.reduce((a: any, b: any) => a + b, 0) || 0;
    const diapers = summary.diaper?.length || 0;
    const sleepSessions = summary.sleep?.length || 0;
    const weight = summary.weight?.length ? `${summary.weight[summary.weight.length - 1]}kg` : 'Not recorded';

    const title = '📊 5 PM Daily Summary';
    const message = `Formula: ${formula}ml | Breastmilk: ${breastmilk}ml | Diapers: ${diapers} | Sleep: ${sleepSessions} | Weight: ${weight}`;

    try {
      await fetch('https://baby-and-mom-app.vercel.app/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: 'daily-summary',
          title,
          message,
          data: { type: 'daily-summary-5pm' }
        })
      });
    } catch (e) {
      console.error('Notification error:', e);
    }

    return NextResponse.json({
      success: true,
      title,
      message,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Cron error:', error);
    return NextResponse.json({ error: 'Cron failed' }, { status: 500 });
  }
}
