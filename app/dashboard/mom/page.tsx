'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function PostpartumWellness() {
  const [loading, setLoading] = useState(true);
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
          const { data: eventsData } = await supabase
            .from('mother_events')
            .select('*')
            .eq('family_id', familyData.id)
            .order('occurred_at', { ascending: false });

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
      <h1 className="text-3xl font-bold mb-6">👩 Postpartum Wellness</h1>
      
      <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-6">
        <p className="text-sm text-blue-800">🔒 <strong>Private:</strong> Only you and the family admin can see this data.</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">📝 Wellness Entries</h2>
        {events.length === 0 ? (
          <p className="text-gray-500">No wellness entries yet</p>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <div key={event.id} className="border-l-4 border-pink-500 pl-4 py-2">
                <p className="font-semibold capitalize">{event.type}</p>
                <p className="text-sm text-gray-600">{event.value} {event.unit}</p>
                <p className="text-xs text-gray-500">{new Date(event.occurred_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
