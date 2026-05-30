import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { parseMessage } from '../parser/parse'

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
    const senderPhone = value.contacts[0].wa_id
    const messageId = message.id

    // Store raw message
    await supabaseAdmin.from('whatsapp_messages').insert({
      phone_number: senderPhone,
      direction: 'inbound',
      message_type: message.type,
      content: message.text?.body || null,
      media_url: message.image?.link || message.audio?.link || null,
      message_id: messageId,
      status: 'received',
    })

    // Find family by phone number
    const { data: member } = await supabaseAdmin
      .from('family_members')
      .select('family_id, user_id')
      .eq('whatsapp_number', senderPhone)
      .single()

    if (!member) {
      return NextResponse.json({ status: 'no_family' }, { status: 400 })
    }

    // Parse message
    const parsed = await parseMessage(
      message.text?.body || '',
      senderPhone,
      member.family_id
    )

    // Log event based on parsed result
    if (parsed.confidence > 0.8) {
      if (parsed.subject === 'baby' && parsed.baby_id) {
        await supabaseAdmin.from('baby_events').insert({
          baby_id: parsed.baby_id,
          family_id: member.family_id,
          type: parsed.type,
          value: parsed.value,
          unit: parsed.unit,
          notes: parsed.notes,
          logged_by: member.user_id,
          occurred_at: parsed.occurred_at,
          source: 'whatsapp',
          parser_confidence: parsed.confidence,
          raw_input: parsed.raw_input,
        })
      } else if (parsed.subject === 'mother' && parsed.mother_id) {
        await supabaseAdmin.from('mother_events').insert({
          mother_id: parsed.mother_id,
          family_id: member.family_id,
          type: parsed.type,
          value: parsed.value,
          unit: parsed.unit,
          notes: parsed.notes,
          logged_by: member.user_id,
          occurred_at: parsed.occurred_at,
          source: 'whatsapp',
          parser_confidence: parsed.confidence,
          raw_input: parsed.raw_input,
        })
      }

      // Send confirmation
      await sendWhatsAppMessage(senderPhone, `✓ Logged: ${parsed.type}`)
    } else if (parsed.confidence > 0.5) {
      // Ask for clarification
      await sendWhatsAppMessage(
        senderPhone,
        parsed.clarification || 'Could you rephrase? Example: "baby ate 120ml"'
      )
    }

    return NextResponse.json({ status: 'ok' })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

async function sendWhatsAppMessage(phone: string, message: string) {
  const accessToken = process.env.WHATSAPP_API_TOKEN
  const phoneNumberId = process.env.WHATSAPP_BUSINESS_PHONE_ID

  if (!accessToken || !phoneNumberId) {
    console.error('Missing WhatsApp credentials')
    return
  }

  try {
    await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phone,
        type: 'text',
        text: { body: message },
      }),
    })
  } catch (err) {
    console.error('Failed to send WhatsApp message:', err)
  }
}
