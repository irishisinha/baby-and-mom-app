import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function storeDeviceToken(
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

    console.log(`✅ Device token stored`);
    return true;
  } catch (err) {
    console.error('Error in storeDeviceToken:', err);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { fcmToken } = await request.json();

    if (!fcmToken) {
      return NextResponse.json(
        { error: 'FCM token required' },
        { status: 400 }
      );
    }

    // Store token with generic name
    const success = await storeDeviceToken('', 'Family Member', fcmToken);

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Device registered',
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to store token' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[FCM Register] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
