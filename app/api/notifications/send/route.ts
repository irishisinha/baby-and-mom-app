import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { topic, title, message } = body;

    if (!topic || !title || !message) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    console.log(`[FCM-SEND] Topic: ${topic}, Title: ${title}`);

    // Send via Firebase Admin SDK (imported from firebase-admin)
    try {
      const admin = require('firebase-admin');
      
      if (admin.apps && admin.apps.length > 0) {
        const fcmResponse = await admin.messaging().send({
          notification: {
            title: title,
            body: message,
          },
          topic: topic,
          webpush: {
            notification: {
              title: title,
              body: message,
              icon: '/favicon.ico',
              badge: '/favicon.ico',
              vibrate: [100, 50, 100],
            },
          },
        });

        console.log('[FCM-SUCCESS] Message sent:', fcmResponse);
        return NextResponse.json({
          success: true,
          messageId: fcmResponse,
          title,
          message,
        });
      }
    } catch (fcmError) {
      console.error('[FCM-ERROR]', fcmError);
    }

    // Fallback: just log it
    console.log('[NOTIFICATION-LOGGED]', { topic, title, message });
    return NextResponse.json({
      success: true,
      title,
      message,
      method: 'logged',
    });
  } catch (error: any) {
    console.error('[SEND-ERROR]', error);
    return NextResponse.json(
      { error: error.message || 'Failed' },
      { status: 500 }
    );
  }
}
