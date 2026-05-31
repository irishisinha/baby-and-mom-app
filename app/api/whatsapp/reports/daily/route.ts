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

export async function POST(request: NextRequest) {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Get today's metrics
    const { data: todayData } = await supabase
      .from('baby_metrics')
      .select('metric_type, value, unit')
      .gte('created_at', today.toISOString())
      .lt('created_at', new Date(today.getTime() + 86400000).toISOString());

    // Get yesterday's metrics
    const { data: yesterdayData } = await supabase
      .from('baby_metrics')
      .select('metric_type, value, unit')
      .gte('created_at', yesterday.toISOString())
      .lt('created_at', today.toISOString());

    // Calculate totals
    const todayMetrics = aggregateMetrics(todayData || []);
    const yesterdayMetrics = aggregateMetrics(yesterdayData || []);

    // Build report
    const report = buildReport(todayMetrics, yesterdayMetrics, now);

    // Send via WhatsApp (you'll need to store the family phone number)
    // For now, we'll just log it
    console.log('📊 Report:', report);

    return NextResponse.json({ 
      success: true, 
      report,
      todayMetrics,
      yesterdayMetrics
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}

function aggregateMetrics(data: any[]) {
  const metrics: any = {};
  data.forEach((item) => {
    if (!metrics[item.metric_type]) {
      metrics[item.metric_type] = 0;
    }
    metrics[item.metric_type] += item.value || 1;
  });
  return metrics;
}

function buildReport(today: any, yesterday: any, time: Date) {
  let report = `📊 BABY CARE UPDATE - ${time.toLocaleDateString()}, ${time.toLocaleTimeString()}\n\n`;

  const metricTypes = ['milk', 'potty', 'diaper', 'bath'];
  
  metricTypes.forEach((type) => {
    const todayVal = today[type] || 0;
    const yesterdayVal = yesterday[type] || 0;
    const diff = todayVal - yesterdayVal;
    const arrow = diff > 0 ? '↑' : diff < 0 ? '↓' : '✓';

    report += `${type.toUpperCase()}:\n`;
    report += `  Today: ${todayVal}\n`;
    report += `  Yesterday: ${yesterdayVal}\n`;
    report += `  ${arrow} ${diff > 0 ? '+' : ''}${diff}\n\n`;
  });

  return report;
}