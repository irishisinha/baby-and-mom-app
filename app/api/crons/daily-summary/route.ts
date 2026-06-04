import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export async function GET(request: NextRequest) {
  try {
    const now = new Date();
    const todayDate = now.toLocaleDateString();

    const { data: metrics } = await supabase
      .from('baby_metrics')
      .select('*')
      .gte('created_at', todayDate);

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
