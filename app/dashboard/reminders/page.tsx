'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function Reminders() {
  const [loading, setLoading] = useState(true);
  const [reminders, setReminders] = useState<any[]>([]);

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
          const { data: remindersData } = await supabase
            .from('reminders')
            .select('*')
            .eq('family_id', familyData.id)
            .order('scheduled_at', { ascending: true });

          if (remindersData) setReminders(remindersData);
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
      <h1 className="text-3xl font-bold mb-6">🔔 Reminders</h1>
      
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">⏰ Upcoming Reminders</h2>
        {reminders.length === 0 ? (
          <p className="text-gray-500">No reminders set yet</p>
        ) : (
          <div className="space-y-3">
            {reminders.map((reminder) => (
              <div key={reminder.id} className="border-l-4 border-yellow-500 pl-4 py-2">
                <p className="font-semibold">{reminder.type}</p>
                <p className="text-sm text-gray-600">{reminder.description}</p>
                <p className="text-xs text-gray-500">{new Date(reminder.scheduled_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
