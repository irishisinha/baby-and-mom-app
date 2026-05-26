'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function DashboardHome() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        window.location.href = '/login';
        return;
      }

      setUser(user);
      
      // Fetch events
      const { data, error: eventsError } = await supabase
        .from('baby_events')
        .select('*')
        .order('occurred_at', { ascending: false })
        .limit(20);

      if (!eventsError && data) {
        setEvents(data);
      }

      setLoading(false);
    };

    checkAuth();
  }, []);

  if (loading) return <div className="p-4">Loading...</div>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Home</h1>
      <div className="space-y-4">
        {events.length === 0 ? (
          <p className="text-gray-500">No events logged yet. Start logging from WhatsApp!</p>
        ) : (
          events.map((event) => (
            <div key={event.id} className="border rounded p-3 bg-gray-50">
              <p className="font-semibold">{event.type}</p>
              <p className="text-sm text-gray-600">{new Date(event.occurred_at).toLocaleString()}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
