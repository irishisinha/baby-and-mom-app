'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { PILOT_FAMILY_ID } from '@/lib/pilot-user';

export default function MomWellnessPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [form, setForm] = useState({
    event_type: 'recovery',
    value: '',
    notes: ''
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    const { data } = await supabase
      .from('mother_events')
      .select('*')
      .eq('family_id', PILOT_FAMILY_ID)
      .order('occurred_at', { ascending: false })
      .limit(20);

    setEvents(data || []);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.event_type || !form.value) return;

    const { error } = await supabase.from('mother_events').insert([{
      family_id: PILOT_FAMILY_ID,
      event_type: form.event_type,
      value: form.value,
      notes: form.notes,
      occurred_at: new Date().toISOString()
    }]);

    if (!error) {
      setForm({ event_type: 'recovery', value: '', notes: '' });
      fetchEvents();
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from('mother_events').delete().eq('id', id);
    fetchEvents();
  };

  const getEmoji = (type: string) => {
    const emojis: any = {
      recovery: '💪',
      mood: '😊',
      sleep: '😴',
      health_check: '🏥',
      medication: '💊',
      exercise: '🏃',
      feeding: '🍼',
      energy: '⚡',
      pain: '🤕',
      notes: '📝'
    };
    return emojis[type] || '📝';
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">👩 Mom Wellness Tracker</h1>

      {/* Add Event Form */}
      <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">✨ Log Wellness Update</h2>
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <select
              value={form.event_type}
              onChange={(e) => setForm({ ...form, event_type: e.target.value })}
              className="border rounded px-3 py-2 bg-white"
            >
              <option value="recovery">💪 Recovery</option>
              <option value="mood">😊 Mood</option>
              <option value="sleep">😴 Sleep (hours)</option>
              <option value="health_check">🏥 Health Check</option>
              <option value="medication">💊 Medication</option>
              <option value="exercise">🏃 Exercise</option>
              <option value="energy">⚡ Energy Level</option>
              <option value="pain">🤕 Pain Level</option>
              <option value="feeding">🍼 Feeding Notes</option>
              <option value="notes">📝 General Notes</option>
            </select>

            <input
              type="text"
              placeholder="Value (e.g., Good, 7 hours, 5/10)"
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
              className="border rounded px-3 py-2"
            />

            <button
              type="submit"
              className="bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded px-4 py-2 font-semibold hover:shadow-lg"
            >
              Add Update
            </button>
          </div>

          <textarea
            placeholder="Additional notes (optional)"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="w-full border rounded px-3 py-2 text-sm"
            rows={2}
          />
        </form>
      </div>

      {/* Events List */}
      <div className="space-y-3">
        <h2 className="text-xl font-bold mb-4">📋 Wellness History</h2>
        {events.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No wellness updates yet</p>
        ) : (
          events.map((event) => (
            <div
              key={event.id}
              className="bg-white rounded-lg shadow p-4 border-l-4 border-pink-500 hover:shadow-md transition"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">{getEmoji(event.event_type)}</span>
                    <span className="font-bold text-lg capitalize">
                      {event.event_type.replace('_', ' ')}: {event.value}
                    </span>
                  </div>
                  {event.notes && (
                    <p className="text-gray-600 text-sm ml-10">{event.notes}</p>
                  )}
                  <p className="text-xs text-gray-400 ml-10 mt-1">
                    {new Date(event.occurred_at).toLocaleString('en-GB', {
                      timeZone: 'Europe/London',
                      hour: '2-digit',
                      minute: '2-digit',
                      day: '2-digit',
                      month: '2-digit'
                    })}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(event.id)}
                  className="text-red-500 hover:text-red-700 text-sm font-semibold ml-4"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* WhatsApp Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-8">
        <p className="text-sm text-blue-800">
          <strong>💬 WhatsApp:</strong> Send updates like: <br/>
          "mom recovery good" • "mom sleep 8h" • "mom mood happy" • "mom pain 3/10"
        </p>
      </div>
    </div>
  );
}
