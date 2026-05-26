'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { MotherEvent } from '@/lib/types'

export default function MomTab() {
  const [events, setEvents] = useState<MotherEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('mother_events').select('*').order('occurred_at', { ascending: false }).limit(20)
      setEvents(data || [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="p-8">Loading...</div>
  
  return (
    <div className="p-8">
      <h2 className="text-3xl font-bold mb-6">Postpartum Wellness</h2>
      <div className="bg-purple-50 border border-purple-200 rounded p-4 mb-6">
        <p className="text-sm text-purple-900">Your health data is private and only visible to you and family admins</p>
      </div>
      <div className="bg-white rounded shadow">
        <div className="p-4 border-b font-semibold">Wellness Timeline</div>
        <div className="divide-y">{events.length === 0 ? <div className="p-4 text-gray-500">No entries yet</div> : events.map(e => <div key={e.id} className="p-4"><div className="flex justify-between"><span className="font-semibold">{e.type}</span><span className="text-sm text-gray-500">{new Date(e.occurred_at).toLocaleString()}</span></div></div>)}</div>
      </div>
    </div>
  )
}
