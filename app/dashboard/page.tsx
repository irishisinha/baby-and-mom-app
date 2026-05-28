'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function DashboardHome() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [babies, setBabies] = useState<any[]>([]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error || !user) {
          window.location.href = '/login';
          return;
        }

        setUser(user);

        // Fetch user's family
        const { data: userRow } = await supabase
          .from('users')
          .select('id')
          .eq('id', user.id)
          .single();

        if (!userRow) {
          // Create user record if doesn't exist
          await supabase.from('users').insert([{ id: user.id, email: user.email }]);
        }

        // Fetch family
        const { data: familyData } = await supabase
          .from('families')
          .select('id')
          .eq('created_by', user.id)
          .single();

        if (familyData) {
          // Fetch babies
          const { data: babiesData } = await supabase
            .from('babies')
            .select('*')
            .eq('family_id', familyData.id);

          if (babiesData) setBabies(babiesData);

          // Fetch recent events
          const { data: eventsData } = await supabase
            .from('baby_events')
            .select('*')
            .eq('family_id', familyData.id)
            .order('occurred_at', { ascending: false })
            .limit(20);

          if (eventsData) setEvents(eventsData);
        }

        setLoading(false);
      } catch (err) {
        console.error('Error:', err);
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (loading) return <div className="p-4">Loading...</div>;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">👶 Baby & Mom Care Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">Total Babies</p>
          <p className="text-3xl font-bold text-blue-600">{babies.length}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">Recent Events</p>
          <p className="text-3xl font-bold text-green-600">{events.length}</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">Status</p>
          <p className="text-3xl font-bold text-purple-600">✅ Active</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">📝 Recent Events</h2>
        {events.length === 0 ? (
          <p className="text-gray-500">No events logged yet. Start logging from WhatsApp!</p>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <div key={event.id} className="border-l-4 border-blue-500 pl-4 py-2">
                <p className="font-semibold capitalize">{event.type}</p>
                <p className="text-sm text-gray-600">
                  {event.value} {event.unit}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(event.occurred_at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
