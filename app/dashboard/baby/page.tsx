'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Baby, BabyEvent } from '@/lib/types'

export default function BabyTab() {
  const [babies, setBabies] = useState<Baby[]>([])
  const [events, setEvents] = useState<BabyEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: bData } = await supabase.from('babies').select('*').limit(1)
      const { data: eData } = await supabase.from('baby_events').select('*').order('occurred_at', { ascending: false }).limit(20)
      setBabies(bData || [])
      setEvents(eData || [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="p-8">Loading...</div>
  
  return (
    <div className="p-8">
      <h2 className="text-3xl font-bold mb-6">Baby Tracker</h2>
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-4 rounded shadow"><div className="text-sm text-gray-600">Total Events</div><div className="text-3xl font-bold">{events.length}</div></div>
        <div className="bg-white p-4 rounded shadow"><div className="text-sm text-gray-600">Babies</div><div className="text-3xl font-bold">{babies.length}</div></div>
      </div>
      <div className="bg-white rounded shadow">
        <div className="p-4 border-b font-semibold">Recent Events</div>
        <div className="divide-y">{events.map(e => <div key={e.id} className="p-4"><div className="flex justify-between"><span className="font-semibold">{e.type}</span><span className="text-sm text-gray-500">{new Date(e.occurred_at).toLocaleString()}</span></div></div>)}</div>
      </div>
    </div>
  )
}
