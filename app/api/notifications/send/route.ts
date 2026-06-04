import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { topic, title, message, data } = body;

    if (!topic || !title || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    console.log(`[NOTIFICATION] ${topic}: ${title} - ${message}`);

    return NextResponse.json({
      success: true,
      topic,
      title,
      message,
      sentAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    );
  }
}
