import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-service-role-key"
)

const FAMILY_ID = "df3d99a8-f7a2-44cf-bcb4-9c5f3300caa6"

export async function GET(request: NextRequest) {
  try {
    const { data: reminders, error } = await supabaseAdmin
      .from("reminders")
      .select("*")
      .eq("family_id", FAMILY_ID)
      .order("reminder_time", { ascending: true })

    if (error) throw error
    return NextResponse.json({ reminders })
  } catch (error) {
    console.error("[REMINDERS-ERR]", error)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, reminder_time, message, enabled } = body

    const { data, error } = await supabaseAdmin
      .from("reminders")
      .insert({
        family_id: FAMILY_ID,
        type,
        reminder_time,
        message,
        enabled: enabled ?? true,
      })
      .select()

    if (error) throw error
    return NextResponse.json({ reminder: data?.[0] })
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, enabled, message } = body

    const { data, error } = await supabaseAdmin
      .from("reminders")
      .update({ enabled, message })
      .eq("id", id)
      .eq("family_id", FAMILY_ID)
      .select()

    if (error) throw error
    return NextResponse.json({ reminder: data?.[0] })
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 })

    const { error } = await supabaseAdmin
      .from("reminders")
      .delete()
      .eq("id", id)
      .eq("family_id", FAMILY_ID)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
