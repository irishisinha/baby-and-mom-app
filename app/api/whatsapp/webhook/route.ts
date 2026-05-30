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

    if (!member) {
      console.log('No member found for phone:', senderPhone)
      return NextResponse.json({ status: 'ok' })
    }

    // Store message first
    const { error: insertError } = await supabaseAdmin
      .from('whatsapp_messages')
      .insert({
        phone_number: senderPhone,
        message_text: messageText,
        family_id: member.family_id,
      })

    if (insertError) {
      console.error('Message insert error:', insertError)
      return NextResponse.json({ status: 'error', error: insertError }, { status: 500 })
    }

    console.log('Message saved, now parsing...')

    // Parse message
    try {
      const parsed = await parseMessage(
        messageText,
        senderPhone,
        member.family_id
      )

      console.log('Parsed result:', parsed)

      // Log event based on parsed result
      if (parsed.confidence > 0.8) {
        if (parsed.subject === 'baby' && parsed.baby_id) {
          const { error: eventError } = await supabaseAdmin.from('baby_events').insert({
            baby_id: parsed.baby_id,
            family_id: member.family_id,
            type: parsed.type,
            value: parsed.value,
            unit: parsed.unit,
            occurred_at: parsed.occurred_at,
            created_by: member.user_id,
          })
          if (eventError) console.error('Baby event error:', eventError)
          else console.log('Baby event logged')
        } else if (parsed.subject === 'mother' && parsed.mother_id) {
          const { error: eventError } = await supabaseAdmin.from('mother_events').insert({
            mother_id: parsed.mother_id,
            family_id: member.family_id,
            type: parsed.type,
            value: parsed.value,
            unit: parsed.unit,
            occurred_at: parsed.occurred_at,
            created_by: member.user_id,
          })
          if (eventError) console.error('Mother event error:', eventError)
          else console.log('Mother event logged')
        } else {
          console.log('No baby_id or mother_id found in parsed data')
        }
      } else {
        console.log('Confidence too low:', parsed.confidence, '- clarification needed:', parsed.clarification)
      }
    } catch (parseErr) {
      console.error('Parse error:', parseErr)
      return NextResponse.json({ status: 'parse_error', error: String(parseErr) }, { status: 500 })
    }

    return NextResponse.json({ status: 'ok' })
  } catch (err) {
    console.error('Webhook error:', err)
    return NextResponse.json({ status: 'error', error: String(err) }, { status: 500 })
  }
}
