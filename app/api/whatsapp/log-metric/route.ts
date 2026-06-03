import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as admin from 'firebase-admin';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Initialize Firebase Admin
if (!admin.apps.length) {
  const serviceAccount = {
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
  };

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
  });
}

const messaging = admin.messaging();

async function getFamilyTokens(): Promise<string[]> {
  const { data, error } = await supabase
    .from('family_device_tokens')
    .select('fcm_token');

  if (error || !data) return [];
  return data.map(row => row.fcm_token).filter(Boolean);
}

async function sendFamilyNotification(title: string, body: string, data?: Record<string, string>): Promise<number> {
  try {
    const tokens = await getFamilyTokens();
    if (tokens.length === 0) return 0;

    const promises = tokens.map(token =>
      messaging
        .send({
          notification: { title, body },
          data: data || {},
          token: token,
        })
        .catch((err: any) => {
          console.error(`Failed to send to ${token}:`, err.message);
          return null;
        })
    );

    const results = await Promise.all(promises);
    const successCount = results.filter(r => r !== null).length;
    console.log(`[FCM] ✅ Sent to ${successCount}/${tokens.length} devices`);
    return successCount;
  } catch (error) {
    console.error('[FCM] Error:', error);
    return 0;
  }
}

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
    await sendFamilyNotification(
      `✅ You Fed Baby`,
      `${metricType} ${value}${unit || 'ml'} | Total today: ${total}${unit || 'ml'}`,
      {
        metric_type: metricType,
        value: value.toString(),
      }
    );

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
