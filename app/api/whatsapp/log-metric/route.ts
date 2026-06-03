import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { notifyMetricUpdate } from '@/lib/fcm-service';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { metricType, value, unit } = await request.json();

    if (!metricType || !value) {
      return NextResponse.json(
        { error: 'Metric type and value required' },
        { status: 400 }
      );
    }

    // Save to database
    const { error } = await supabase
      .from('baby_metrics')
      .insert({
        family_id: 'df3d99a8-f7a2-44cf-bcb4-9c5f3300caa6',
        baby_id: 'e8a7c56c-62c6-442c-94ac-518928c8c07b',
        metric_type: metricType,
        value: value,
        unit: unit || 'ml',
        recorded_by: 'Dashboard',
      });

    if (error) {
      console.error('Error saving metric:', error);
      return NextResponse.json(
        { error: 'Failed to save metric' },
        { status: 500 }
      );
    }

    // Get today's total
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: metrics } = await supabase
      .from('baby_metrics')
      .select('value')
      .gte('created_at', today.toISOString())
      .eq('metric_type', metricType);

    const total = (metrics || []).reduce((sum, m) => sum + (m.value || 0), 0);

    // Send FCM notification
    await notifyMetricUpdate('You', metricType, value, unit || 'ml', total);

    return NextResponse.json({
      success: true,
      message: 'Metric logged and family notified',
      total: total,
    });
  } catch (error) {
    console.error('[Log Metric] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
