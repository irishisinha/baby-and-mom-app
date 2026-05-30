// app/api/whatsapp/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  console.log('📱 POST request received');
  
  try {
    const formData = await request.formData();
    const messageText = formData.get('Body') as string;
    
    console.log(`Message: ${messageText}`);

    return new NextResponse(JSON.stringify({ 
      success: true, 
      message: `Logged: ${messageText}` 
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error:', error);
    return new NextResponse(JSON.stringify({ error: 'Error' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function GET(request: NextRequest) {
  return new NextResponse('OK', { status: 200 });
}