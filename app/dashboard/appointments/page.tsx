'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editNotes, setEditNotes] = useState('');

  useEffect(() => {
    loadAppointments();
  }, []);

  async function loadAppointments() {
    try {
      const { data } = await supabase
        .from('appointments')
        .select('*')
        .order('appointment_date', { ascending: true });
      
      if (data) setAppointments(data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading appointments:', error);
      setLoading(false);
    }
  }

  async function saveNotes(id) {
    try {
      await supabase
        .from('appointments')
        .update({ notes: editNotes })
        .eq('id', id);
      
      setEditingId(null);
      await loadAppointments();
    } catch (error) {
      console.error('Error saving notes:', error);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-600">Loading appointments...</p>
      </div>
    );
  }

  return (
    <div className="pb-24 md:pb-0 min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">📅 Appointments</h1>

        <div className="space-y-4">
          {appointments.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <p className="text-gray-500">No appointments scheduled yet</p>
            </div>
          ) : (
            appointments.map(appt => (
              <div key={appt.id} className="bg-white border-l-4 border-blue-500 rounded-lg p-6 shadow-md hover:shadow-lg transition">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900">{appt.title}</h3>
                    <p className="text-gray-600 mt-1">{appt.description}</p>
                  </div>
                  <p className="text-sm font-semibold text-blue-600 whitespace-nowrap ml-4">
                    {new Date(appt.appointment_date).toLocaleDateString()} {new Date(appt.appointment_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </p>
                </div>

                {editingId === appt.id ? (
                  <div className="mt-4 bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <label className="text-sm font-semibold text-gray-700 mb-2 block">Notes for this appointment</label>
                    <textarea
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      placeholder="Add any notes, observations, or follow-ups needed..."
                      className="w-full border border-gray-300 rounded-lg p-3 text-gray-900 mb-3"
                      rows={4}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveNotes(appt.id)}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold"
                      >
                        Save Notes
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded-lg"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4">
                    {appt.notes ? (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-3">
                        <p className="text-sm font-semibold text-yellow-900 mb-2">📝 Notes:</p>
                        <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">{appt.notes}</p>
                      </div>
                    ) : (
                      <p className="text-gray-400 text-sm italic mb-3">No notes added yet</p>
                    )}
                    <button
                      onClick={() => {
                        setEditingId(appt.id);
                        setEditNotes(appt.notes || '');
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold"
                    >
                      {appt.notes ? '✏️ Edit Notes' : '➕ Add Notes'}
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
