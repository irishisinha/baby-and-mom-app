'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { BabyEvent, MotherEvent } from '@/lib/types'

export default function DashboardHome() {
  const [babyEvents, setBabyEvents] = useState<BabyEvent[]>([])
  const [motherEvents, setMotherEvents] = useState<MotherEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadEvents = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      // Load recent baby events
      const { data: baby } = await supabase
        .from('baby_events')
        .select('*')
        .order('occurred_at', { ascending: false })
        .limit(10)

      // Load recent mother events
      const { data: mother } = await supabase
        .from('mother_events')
        .select('*')
        .order('occurred_at', { ascending: false })
        .limit(10)

      setBabyEvents(baby || [])
      setMotherEvents(mother || [])
      setLoading(false)
    }

    loadEvents()

    // Subscribe to realtime updates
    const babySubscription = supabase
      .channel('baby_events')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'baby_events' }, (payload) => {
        setBabyEvents(prev => [payload.new as BabyEvent, ...prev.slice(0, 9)])
      })
      .subscribe()

    const motherSubscription = supabase
      .channel('mother_events')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mother_events' }, (payload) => {
        setMotherEvents(prev => [payload.new as MotherEvent, ...prev.slice(0, 9)])
      })
      .subscribe()

    return () => {
      babySubscription.unsubscribe()
      motherSubscription.unsubscribe()
    }
  }, [])

  if (loading) {
    return <div className="p-8">Loading...</div>
  }

  const allEvents = [
    ...babyEvents.map(e => ({ ...e, subject: 'baby' })),
    ...motherEvents.map(e => ({ ...e, subject: 'mother' })),
  ].sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime())

  return (
    <div className="p-8">
      <h2 className="text-3xl font-bold mb-6">Timeline</h2>

      <div className="space-y-4">
        {allEvents.length === 0 ? (
          <p className="text-gray-500">No events yet. Start logging with WhatsApp or the app!</p>
        ) : (
          allEvents.map(event => (
            <div key={event.id} className={`p-4 rounded-lg border-l-4 ${
              event.subject === 'baby' ? 'border-pink-500 bg-pink-50' : 'border-purple-500 bg-purple-50'
            }`}>
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-sm font-medium text-gray-600">
                    {event.subject === 'baby' ? '👶' : '👩'} {event.type}
                  </span>
                  {event.value && <span className="ml-2 text-lg font-semibold">{event.value} {event.unit}</span>}
                  {event.notes && <p className="text-gray-700 mt-1">{event.notes}</p>}
                </div>
                <span className="text-sm text-gray-500">
                  {new Date(event.occurred_at).toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
