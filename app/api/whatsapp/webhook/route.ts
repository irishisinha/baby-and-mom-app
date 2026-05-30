import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const WEBHOOK_VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || ''

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === WEBHOOK_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 })
  }

  return new Response('Forbidden', { status: 403 })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    
    const entry = body.entry?.[0]
    const changes = entry?.changes?.[0]
    const value = changes?.value

    if (!value?.messages) {
      return NextResponse.json({ status: 'ok' })
    }

    const message = value.messages[0]
    let senderPhone = value.contacts[0].wa_id
    const messageText = message.text?.body || ''

    console.log('Message received:', { senderPhone, messageText })

    // Find family by phone number
    const phoneWithPlus = senderPhone.startsWith('+') ? senderPhone : '+' + senderPhone
    const phoneWithoutPlus = senderPhone.replace('+', '')

    const { data: member, error: memberError } = await supabaseAdmin
      .from('family_members')
      .select('family_id, user_id')
      .or(`whatsapp_number.eq.${phoneWithPlus},whatsapp_number.eq.${phoneWithoutPlus}`)
      .single()

    console.log('Member:', member, memberError)

    if (!member) {
      console.log('No member found')
      return NextResponse.json({ status: 'ok' })
    }

    // Store message
    const { error: insertError, data } = await supabaseAdmin
      .from('whatsapp_messages')
      .insert({
        phone_number: senderPhone,
        message_text: messageText,
        family_id: member.family_id,
      })
      .select()

    console.log('Insert result:', { data, insertError })

    if (insertError) {
      console.error('Insert error:', insertError)
      return NextResponse.json({ status: 'error', error: insertError }, { status: 500 })
    }

    console.log('Message saved successfully')
    return NextResponse.json({ status: 'ok' })
  } catch (err) {
    console.error('Webhook error:', err)
    return NextResponse.json({ status: 'error', error: String(err) }, { status: 500 })
  }
}
