'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function AppointmentsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    doctor: '',
    reason: '',
    date: '',
    time: '',
    notes: ''
  });

  useEffect(() => {
    const fetch = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data } = await supabase
        .from('appointments')
        .select('*')
        .eq('user_id', user.id)
        .order('appointment_date', { ascending: true });

      setAppointments(data || []);
    };
    fetch();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !form.doctor || !form.date) return;

    const { data } = await supabase
      .from('appointments')
      .insert([{
        user_id: userId,
        doctor: form.doctor,
        reason: form.reason,
        appointment_date: form.date,
        appointment_time: form.time,
        notes: form.notes
      }])
      .select();

    if (data) {
      setAppointments([...appointments, data[0]]);
      setForm({ doctor: '', reason: '', date: '', time: '', notes: '' });
    }
  };

  const handleDelete = async (apptId: string) => {
    if (confirm('Delete?')) {
      await supabase.from('appointments').delete().eq('id', apptId);
      setAppointments(appointments.filter(a => a.id !== apptId));
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">📅 Appointments</h1>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-2xl font-bold mb-4">Add Appointment</h2>
        <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input type="text" value={form.doctor} onChange={e => setForm({...form, doctor: e.target.value})} placeholder="Doctor/Clinic" required className="px-4 py-2 border rounded" />
          <input type="text" value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} placeholder="Reason" className="px-4 py-2 border rounded" />
          <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} required className="px-4 py-2 border rounded" />
          <input type="time" value={form.time} onChange={e => setForm({...form, time: e.target.value})} className="px-4 py-2 border rounded" />
          <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Notes" className="md:col-span-2 px-4 py-2 border rounded" />
          <button type="submit" className="md:col-span-2 bg-blue-600 text-white font-bold py-2 rounded">Add</button>
        </form>
      </div>

      <div className="space-y-3">
        {appointments.map(appt => (
          <div key={appt.id} className="bg-white border rounded-lg p-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <p className="font-bold text-lg">{appt.doctor}</p>
                {appt.reason && <p className="text-sm text-gray-600">Reason: {appt.reason}</p>}
                <p className="text-sm text-gray-600 mt-1">📅 {new Date(appt.appointment_date).toLocaleDateString()} {appt.appointment_time && 'at ' + appt.appointment_time}</p>
                {appt.notes && <p className="text-sm text-gray-600 mt-2">📝 {appt.notes}</p>}
              </div>
              <button onClick={() => handleDelete(appt.id)} className="px-3 py-1 bg-red-600 text-white rounded text-sm font-semibold">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
