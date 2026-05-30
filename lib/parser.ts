import { OpenAI } from 'openai'
import { ParsedMessage } from '@/lib/types'
import { supabaseAdmin } from '@/lib/supabase'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function parseMessage(
  text: string,
  phone: string,
  familyId: string
): Promise<ParsedMessage> {
  // Get family context
  const { data: babies } = await supabaseAdmin
    .from('babies')
    .select('id, name')
    .eq('family_id', familyId)
    .limit(5)

  const { data: mothers } = await supabaseAdmin
    .from('mothers')
    .select('id, name')
    .eq('family_id', familyId)
    .limit(5)

  const prompt = `Parse this caregiving log message and extract structured data.

Message: "${text}"

Context:
- Babies in family: ${babies?.map(b => b.name).join(', ') || 'unknown'}
- Mother: ${mothers?.[0]?.name || 'unknown'}

Respond with ONLY valid JSON (no markdown, no explanation):
{
  "subject": "baby" | "mother",
  "baby_name": "name or null",
  "mother_name": "name or null",
  "type": "feed|diaper|sleep|weight|height|poop|vomit|rash|fever|milestone|note|mood|water|meal|medication|symptom|exercise|breastfeeding",
  "value": number or null,
  "unit": "ml|oz|g|cm|hrs|lbs|count|text or null",
  "time": "HH:MM or null (24hr format)",
  "notes": "additional context or null",
  "confidence": 0.0 to 1.0,
  "clarification": "question to ask user if confidence < 0.8, or null"
}

Rules:
- If message is unclear, confidence <= 0.5, clarification = helpful question
- If message is partially clear, confidence 0.5-0.8, clarification = clarifying question
- If message is clear, confidence > 0.8, clarification = null
- Never guess the subject if unclear
- Use context to infer baby/mother name
- Time: if mentioned in message, use that; otherwise null
- Never provide medical advice or diagnose`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 300,
    })

    const jsonStr = response.choices[0].message.content?.trim() || ''
    const parsed = JSON.parse(jsonStr)

    // Map baby/mother names to IDs
    let babyId: string | undefined
    let motherId: string | undefined

    if (parsed.subject === 'baby' && parsed.baby_name) {
      babyId = babies?.find(b => 
        b.name.toLowerCase().includes(parsed.baby_name.toLowerCase())
      )?.id
    }

    if (parsed.subject === 'mother' && parsed.mother_name) {
      motherId = mothers?.find(m => 
        m.name.toLowerCase().includes(parsed.mother_name.toLowerCase())
      )?.id
    }

    const now = new Date()
    let occurredAt = now

    if (parsed.time) {
      const [hours, minutes] = parsed.time.split(':').map(Number)
      occurredAt = new Date(now)
      occurredAt.setHours(hours, minutes, 0, 0)
    }

    return {
      subject: parsed.subject,
      baby_id: babyId,
      mother_id: motherId,
      type: parsed.type,
      value: parsed.value,
      unit: parsed.unit,
      occurred_at: occurredAt.toISOString(),
      notes: parsed.notes,
      confidence: parsed.confidence,
      clarification: parsed.clarification,
      raw_input: text,
    }
  } catch (err) {
    console.error('Parse error:', err)
    return {
      subject: 'baby',
      type: 'note',
      occurred_at: new Date().toISOString(),
      confidence: 0.2,
      clarification: 'Could not understand. Please rephrase: "baby ate 120ml" or "mom slept 4 hours"',
      raw_input: text,
    }
  }
}
