import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getFamilyTokens(): Promise<string[]> {
  const { data, error } = await supabase
    .from('family_device_tokens')
    .select('fcm_token');

  if (error || !data) return [];
  return data.map(row => row.fcm_token).filter(Boolean);
}

async function sendFamilyNotification(title: string, body: string): Promise<number> {
  try {
    const * as admin = await import('firebase-admin');
    
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          type: process.env.FIREBASE_TYPE,
          project_id: process.env.FIREBASE_PROJECT_ID,
          private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
          private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\n/g, '\n'),
          client_email: process.env.FIREBASE_CLIENT_EMAIL,
          client_id: process.env.FIREBASE_CLIENT_ID,
          auth_uri: process.env.FIREBASE_AUTH_URI,
          token_uri: process.env.FIREBASE_TOKEN_URI,
          auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_CERT_URL,
          client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL,
        } as any),
      });
    }

    const messaging = admin.messaging();
    const tokens = await getFamilyTokens();
    if (tokens.length === 0) return 0;

    const promises = tokens.map(token =>
      messaging
        .send({
          notification: { title, body },
          token: token,
        })
        .catch(() => null)
    );

    const results = await Promise.all(promises);
    return results.filter(r => r !== null).length;
  } catch (error) {
    console.error('[FCM] Error:', error);
    return 0;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { metricType, value, unit } = await request.json();

    if (!metricType || !value) {
      return NextResponse.json({ error: 'Required fields missing' }, { status: 400 });
    }

    const { error } = await supabase.from('baby_metrics').insert({
      family_id: 'df3d99a8-f7a2-44cf-bcb4-9c5f3300caa6',
      baby_id: 'e8a7c56c-62c6-442c-94ac-518928c8c07b',
      metric_type: metricType,
      value: value,
      unit: unit || 'ml',
      recorded_by: 'Dashboard',
    });

    if (error) return NextResponse.json({ error: 'Failed to save' }, { status: 500 });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { data: metrics } = await supabase
      .from('baby_metrics')
      .select('value')
      .gte('created_at', today.toISOString())
      .eq('metric_type', metricType);

    const total = (metrics || []).reduce((sum, m) => sum + (m.value || 0), 0);

    await sendFamilyNotification(
      `✅ You Fed Baby`,
      `${metricType} ${value}${unit || 'ml'} | Total: ${total}${unit || 'ml'}`
    );

    return NextResponse.json({ success: true, total });
  } catch (error) {
    console.error('[Log Metric] Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
