'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { PILOT_USER_ID, PILOT_FAMILY_ID } from '@/lib/pilot-user';

export default function AppointmentsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    doctor: '',
    reason: '',
    date: '',
    time: '',
    notes: ''
  });

  useEffect(() => {
    const fetchAppointments = async () => {
      setUserId(PILOT_USER_ID);

      try {
        const response = await fetch('/api/appointments');
        const result = await response.json();
        setAppointments(result.data || []);
      } catch (err) {
        console.error('Error fetching appointments:', err);
        setAppointments([]);
      }
    };
    fetchAppointments();
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
      setShowForm(false);
    }
  };

  const handleQuickAdd = async (forWho: string) => {
    const date = prompt('Enter appointment date (YYYY-MM-DD):');
    if (!date) return;
    const time = prompt('Enter appointment time (HH:MM):', '10:00');
    const reason = prompt('Reason for appointment:', '');
    const doctor = prompt('Doctor/Clinic name:', forWho + ' Appointment');
    
    if (doctor && date) {
      const { data } = await supabase
        .from('appointments')
        .insert([{
          user_id: userId,
          doctor: doctor,
          reason: reason || '',
          appointment_date: date,
          appointment_time: time || '',
          notes: `For: ${forWho}`
        }])
        .select();

      if (data) {
        setAppointments([...appointments, data[0]]);
      }
    }
  };

  const handleDelete = async (apptId: string) => {
    if (confirm('Delete?')) {
      await supabase.from('appointments').delete().eq('id', apptId);
      setAppointments(appointments.filter(a => a.id !== apptId));
    }
  };

  // Separate upcoming and past appointments
  const now = new Date();
  const upcomingAppts = appointments.filter(a => new Date(a.appointment_date) >= now).sort((a, b) => new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime());
  const pastAppts = appointments.filter(a => new Date(a.appointment_date) < now).sort((a, b) => new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime());

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">📅 Appointments</h1>

      {/* Quick Action Buttons */}
      <div className="mb-8 p-4 bg-blue-50 rounded-lg">
        <p className="text-sm font-semibold text-gray-700 mb-3">Quick Schedule:</p>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => handleQuickAdd('Jaian (Baby)')} className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 font-semibold text-sm">+ Baby Appointment</button>
          <button onClick={() => handleQuickAdd('Shiva (Mom)')} className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 font-semibold text-sm">+ Mom Appointment</button>
          <button onClick={() => handleQuickAdd('Rishi (Dad)')} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-semibold text-sm">+ Dad Appointment</button>
          <button onClick={() => handleQuickAdd('Grandmom')} className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 font-semibold text-sm">+ Grandmom Appointment</button>
          <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-semibold text-sm">✏️ Custom</button>
        </div>
      </div>

      {/* Custom Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">Add Custom Appointment</h2>
          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="text" value={form.doctor} onChange={e => setForm({...form, doctor: e.target.value})} placeholder="Doctor/Clinic" required className="px-4 py-2 border rounded" />
            <input type="text" value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} placeholder="Reason" className="px-4 py-2 border rounded" />
            <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} required className="px-4 py-2 border rounded" />
            <input type="time" value={form.time} onChange={e => setForm({...form, time: e.target.value})} className="px-4 py-2 border rounded" />
            <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Notes" className="md:col-span-2 px-4 py-2 border rounded" />
            <button type="submit" className="bg-blue-600 text-white font-bold py-2 rounded">Save</button>
            <button type="button" onClick={() => setShowForm(false)} className="bg-gray-400 text-white font-bold py-2 rounded">Cancel</button>
          </form>
        </div>
      )}

      {/* Upcoming Appointments */}
      {upcomingAppts.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4 text-blue-600">⏰ Upcoming</h2>
          <div className="space-y-3">
            {upcomingAppts.map(appt => {
              const apptDate = new Date(appt.appointment_date);
              const daysUntil = Math.ceil((apptDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              return (
                <div key={appt.id} className="bg-blue-50 border-l-4 border-blue-600 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      {appt.appointee_for && <p className="text-xs font-semibold text-purple-600 mb-1">👤 {appt.appointee_for}</p>}
                      <p className="font-bold text-lg">{appt.doctor}</p>
                      {appt.reason && <p className="text-sm text-gray-600">Reason: {appt.reason}</p>}
                      <p className="text-sm text-gray-600 mt-1">📅 {apptDate.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })} {appt.appointment_time && 'at ' + appt.appointment_time}</p>
                      <p className="text-xs text-blue-600 font-semibold mt-1">{daysUntil === 0 ? 'Today!' : daysUntil === 1 ? 'Tomorrow' : `In ${daysUntil} days`}</p>
                      {appt.notes && <p className="text-sm text-gray-600 mt-2">📝 {appt.notes}</p>}
                    </div>
                    <button onClick={() => handleDelete(appt.id)} className="px-3 py-1 bg-red-600 text-white rounded text-sm font-semibold">Delete</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Past Appointments */}
      {pastAppts.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-4 text-gray-600">✅ Past Appointments</h2>
          <div className="space-y-3">
            {pastAppts.map(appt => (
              <div key={appt.id} className="bg-gray-50 border-l-4 border-gray-400 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1 opacity-75">
                    {appt.appointee_for && <p className="text-xs font-semibold text-gray-600 mb-1">👤 {appt.appointee_for}</p>}
                    <p className="font-bold text-lg">{appt.doctor}</p>
                    {appt.reason && <p className="text-sm text-gray-600">Reason: {appt.reason}</p>}
                    <p className="text-sm text-gray-600 mt-1">📅 {new Date(appt.appointment_date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })} {appt.appointment_time && 'at ' + appt.appointment_time}</p>
                    {appt.notes && <p className="text-sm text-gray-600 mt-2">📝 {appt.notes}</p>}
                  </div>
                  <button onClick={() => handleDelete(appt.id)} className="px-3 py-1 bg-red-600 text-white rounded text-sm font-semibold">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {appointments.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500 text-lg">No appointments scheduled yet</p>
          <p className="text-gray-400 text-sm mt-2">Use quick buttons above to schedule one!</p>
        </div>
      )}
    </div>
  );
}
