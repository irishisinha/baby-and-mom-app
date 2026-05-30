import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { parseMessage } from '@/lib/parser'

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
    console.log('Webhook received:', JSON.stringify(body, null, 2))
    
    const entry = body.entry?.[0]
    const changes = entry?.changes?.[0]
    const value = changes?.value

    if (!value?.messages) {
      return NextResponse.json({ status: 'ok' })
    }

    const message = value.messages[0]
    let senderPhone = value.contacts[0].wa_id
    const messageId = message.id

    console.log('Processing message from:', senderPhone, 'Content:', message.text?.body)

    // Store raw message
    const { error: insertError } = await supabaseAdmin.from('whatsapp_messages').insert({
      phone_number: senderPhone,
      direction: 'inbound',
      message_type: message.type,
      content: message.text?.body || null,
      media_url: message.image?.link || message.audio?.link || null,
      message_id: messageId,
      status: 'received',
    })

    if (insertError) {
      console.error('Insert error:', insertError)
      return NextResponse.json({ status: 'insert_error', error: insertError }, { status: 400 })
    }

    console.log('Message stored successfully')

    // Find family by phone number (try with and without +)
    const phoneWithPlus = senderPhone.startsWith('+') ? senderPhone : '+' + senderPhone
    const phoneWithoutPlus = senderPhone.replace('+', '')

    console.log('Looking for member with phone:', phoneWithPlus, 'or', phoneWithoutPlus)

    const { data: member, error: memberError } = await supabaseAdmin
      .from('family_members')
      .select('family_id, user_id')
      .or(`whatsapp_number.eq.${phoneWithPlus},whatsapp_number.eq.${phoneWithoutPlus}`)
      .single()

    console.log('Member lookup result:', member, memberError)

    if (!member) {
      console.log('No family member found for phone:', senderPhone)
      return NextResponse.json({ status: 'ok' })
    }

    console.log('Found member in family:', member.family_id)

    // Parse message
    const parsed = await parseMessage(
      message.text?.body || '',
      senderPhone,
      member.family_id
    )

    console.log('Parsed result:', parsed)

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
    }

    return NextResponse.json({ status: 'ok' })
  } catch (err) {
    console.error('Webhook error:', err)
    return NextResponse.json({ status: 'error', error: String(err) }, { status: 500 })
  }
}
