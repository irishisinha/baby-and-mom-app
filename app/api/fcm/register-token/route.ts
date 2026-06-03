import { NextRequest, NextResponse } from 'next/server';
import { storeDeviceToken } from '@/lib/fcm-service';

export async function POST(request: NextRequest) {
  try {
    const { fcmToken } = await request.json();

    if (!fcmToken) {
      return NextResponse.json(
        { error: 'FCM token required' },
        { status: 400 }
      );
    }

    // Store token - user info will be filled by client
    const success = await storeDeviceToken('', 'User', fcmToken);

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
