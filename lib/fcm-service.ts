'use server';

import { messaging } from './firebase-admin';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

/**
 * Get all family device tokens
 */
export async function getFamilyTokens(): Promise<string[]> {
  const { data, error } = await supabase
    .from('family_device_tokens')
    .select('fcm_token');

  if (error || !data) {
    console.error('Error fetching tokens:', error);
    return [];
  }

  return data.map(row => row.fcm_token).filter(Boolean);
}

/**
 * Store device token when user registers
 */
export async function storeDeviceToken(
  phoneNumber: string,
  name: string,
  fcmToken: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('family_device_tokens')
      .upsert(
        {
          phone_number: phoneNumber,
          name: name,
          fcm_token: fcmToken,
          registered_at: new Date().toISOString(),
        },
        { onConflict: 'phone_number' }
      );

    if (error) {
      console.error('Error storing token:', error);
      return false;
    }

    console.log(`✅ Device token stored for ${name}`);
    return true;
  } catch (err) {
    console.error('Error in storeDeviceToken:', err);
    return false;
  }
}

/**
 * Send notification to all family members
 */
export async function sendFamilyNotification(
  payload: NotificationPayload
): Promise<number> {
  try {
    const tokens = await getFamilyTokens();

    if (tokens.length === 0) {
      console.warn('No device tokens found');
      return 0;
    }

    console.log(`[FCM] Sending to ${tokens.length} devices:`, payload.title);

    const message = {
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data || {},
    };

    // Send to each token
    const promises = tokens.map(token =>
      messaging
        .send({
          ...message,
          token: token,
        })
        .catch(err => {
          console.error(`Failed to send to ${token}:`, err.message);
          return null;
        })
    );

    const results = await Promise.all(promises);
    const successCount = results.filter(r => r !== null).length;

    console.log(`[FCM] ✅ Sent to ${successCount}/${tokens.length} devices`);
    return successCount;
  } catch (error) {
    console.error('[FCM] Error sending notifications:', error);
    return 0;
  }
}

/**
 * Send metric update notification
 */
export async function notifyMetricUpdate(
  senderName: string,
  metricType: string,
  value: number,
  unit: string,
  todayTotal: number
): Promise<void> {
  const payload: NotificationPayload = {
    title: `✅ ${senderName} Fed Baby`,
    body: `${metricType.charAt(0).toUpperCase() + metricType.slice(1)} ${value}${unit} | Total today: ${todayTotal}${unit}`,
    data: {
      metric_type: metricType,
      value: value.toString(),
      sender_name: senderName,
    },
  };

  await sendFamilyNotification(payload);
}

/**
 * Send daily summary notification
 */
export async function notifyDailySummary(
  summary: string,
  stats: {
    total: number;
    breast: number;
    formula: number;
    diapers: number;
  }
): Promise<void> {
  const breastPercent = stats.total > 0 ? ((stats.breast / stats.total) * 100).toFixed(0) : 0;
  const formulaPercent = stats.total > 0 ? ((stats.formula / stats.total) * 100).toFixed(0) : 0;

  const payload: NotificationPayload = {
    title: '📊 Daily Summary',
    body: `Total: ${stats.total}ml | Breast: ${stats.breast}ml (${breastPercent}%) | Formula: ${stats.formula}ml (${formulaPercent}%)`,
    data: {
      total: stats.total.toString(),
      breast: stats.breast.toString(),
      formula: stats.formula.toString(),
      diapers: stats.diapers.toString(),
    },
  };

  await sendFamilyNotification(payload);
}

/**
 * Send appointment reminder notification
 */
export async function notifyAppointment(
  personName: string,
  type: string,
  date: string,
  time: string
): Promise<void> {
  const payload: NotificationPayload = {
    title: `📋 Appointment Logged`,
    body: `${type} - ${personName} | ${date} at ${time}`,
    data: {
      appointment_type: type,
      person_name: personName,
      date: date,
      time: time,
    },
  };

  await sendFamilyNotification(payload);
}
