'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function BabyTracker() {
  const [loading, setLoading] = useState(true);
  const [babies, setBabies] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          window.location.href = '/login';
          return;
        }

        const { data: familyData } = await supabase
          .from('families')
          .select('id')
          .eq('created_by', user.id)
          .single();

        if (familyData) {
          const { data: babiesData } = await supabase
            .from('babies')
            .select('*')
            .eq('family_id', familyData.id);

          if (babiesData) setBabies(babiesData);

          const { data: eventsData } = await supabase
            .from('baby_events')
            .select('*')
            .eq('family_id', familyData.id)
            .order('occurred_at', { ascending: false })
            .limit(50);

          if (eventsData) setEvents(eventsData);
        }

        setLoading(false);
      } catch (err) {
        console.error('Error:', err);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div className="p-4">Loading...</div>;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">👶 Baby Tracker</h1>
      
      {babies.length === 0 ? (
        <p className="text-gray-500">No babies added yet</p>
      ) : (
        <>
          {babies.map((baby) => (
            <div key={baby.id} className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-2xl font-bold mb-4">{baby.name}</h2>
              <p className="text-gray-600">DOB: {new Date(baby.date_of_birth).toLocaleDateString()}</p>
              
              <div className="mt-6">
                <h3 className="text-lg font-bold mb-3">📊 Events for {baby.name}</h3>
                <div className="space-y-2">
                  {events.filter(e => e.baby_id === baby.id).length === 0 ? (
                    <p className="text-gray-500">No events logged</p>
                  ) : (
                    events.filter(e => e.baby_id === baby.id).map((event) => (
                      <div key={event.id} className="border-l-4 border-blue-500 pl-4 py-2">
                        <p className="font-semibold capitalize">{event.type}: {event.value} {event.unit}</p>
                        <p className="text-xs text-gray-500">{new Date(event.occurred_at).toLocaleString()}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
