'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'
);

interface Appointment {
  id: string;
  title?: string;
  doctor?: string;
  description?: string;
  reason?: string;
  appointment_date: string;
  appointment_time?: string;
  notes?: string;
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({ 
    doctor: '', 
    reason: '', 
    appointment_date: '', 
    appointment_time: '' 
  });
  const [loading, setLoading] = useState(true);

  const FAMILY_ID = 'df3d99a8-f7a2-44cf-bcb4-9c5f3300caa6';
  const BABY_ID = 'e8a7c56c-62c6-442c-94ac-518928c8c07b';

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    try {
      const response = await fetch('/api/appointments');
      const result = await response.json();
      if (result.data) setAppointments(result.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveEdit = async () => {
    if (!editForm.doctor || !editForm.appointment_date || !editForm.appointment_time) {
      alert('Title, date, time required');
      return;
    }
    try {
      const response = await fetch('/api/appointments/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingId,
          doctor: editForm.doctor,
          reason: editForm.reason || '',
          appointment_date: editForm.appointment_date,
          appointment_time: editForm.appointment_time,
          notes: editForm.notes || ''
        })
      });
      if (response.ok) {
        alert('Updated!');
        setEditingId(null);
        await loadAppointments();
      }
    } catch (error) {
      alert('Error updating');
    }
  };

  const deleteAppointment = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"?`)) return;
    try {
      await fetch(`/api/appointments/${id}`, { method: 'DELETE' });
      alert('Deleted!');
      await loadAppointments();
    } catch (error) {
      alert('Error deleting');
    }
  };

  const createAppointment = async () => {
    if (!createForm.doctor || !createForm.appointment_date || !createForm.appointment_time) {
      alert('Title, date, time required');
      return;
    }
    try {
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: createForm.doctor,
          description: createForm.reason,
          appointment_date: createForm.appointment_date,
          appointment_time: createForm.appointment_time
        })
      });
      const result = await response.json();
      if (response.ok) {
        alert('Created!');
        setShowCreateForm(false);
        setCreateForm({ doctor: '', reason: '', appointment_date: '', appointment_time: '' });
        await loadAppointments();
      } else {
        alert(`Error: ${result.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      alert(`Error creating: ${error.message}`);
    }
  };

  // Get today's date in India timezone
  const getLondonToday = () => {
    const now = new Date();
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(now);
  };

  const today = getLondonToday();
  
  // Split appointments into upcoming and previous
  const upcoming = appointments
    .filter((appt) => appt.appointment_date.split('T')[0] >= today)
    .sort((a, b) => a.appointment_date.localeCompare(b.appointment_date));

  const previous = appointments
    .filter((appt) => appt.appointment_date.split('T')[0] < today)
    .sort((a, b) => b.appointment_date.localeCompare(a.appointment_date));

  if (loading) return <div className="p-4 text-center">Loading...</div>;

  const AppointmentCard = (appt: Appointment) => (
    <div key={appt.id}>
      {editingId === appt.id ? (
        <div className="bg-yellow-50 p-4 rounded border-2 border-yellow-300">
          <h3 className="font-bold mb-3">Editing: {appt.doctor}</h3>
          <div className="space-y-2">
            <input 
              type="text" 
              value={editForm.doctor} 
              onChange={(e) => setEditForm({ ...editForm, doctor: e.target.value })} 
              className="w-full border rounded px-2 py-1 text-sm" 
            />
            <input 
              type="text" 
              value={editForm.reason} 
              onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })} 
              className="w-full border rounded px-2 py-1 text-sm" 
            />
            <input 
              type="date" 
              value={editForm.appointment_date} 
              onChange={(e) => setEditForm({ ...editForm, appointment_date: e.target.value })} 
              className="w-full border rounded px-2 py-1 text-sm" 
            />
            <input 
              type="time" 
              value={editForm.appointment_time} 
              onChange={(e) => setEditForm({ ...editForm, appointment_time: e.target.value })} 
              className="w-full border rounded px-2 py-1 text-sm" 
            />
            <div className="flex gap-2">
              <button 
                onClick={saveEdit} 
                className="flex-1 bg-green-600 text-white py-1 rounded text-sm font-semibold hover:bg-green-700"
              >
                Save
              </button>
              <button 
                onClick={() => setEditingId(null)} 
                className="flex-1 bg-gray-400 text-white py-1 rounded text-sm hover:bg-gray-500"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="border-l-4 border-blue-500 bg-blue-50 p-4 rounded flex justify-between items-start">
          <div className="flex-1">
            <h3 className="font-bold text-lg">{appt.doctor}</h3>
            <p className="text-sm text-gray-600">{appt.reason}</p>
            <p className="text-xs text-gray-500 mt-1">
              {new Date(appt.appointment_date).toLocaleDateString()} at {appt.appointment_time}
            </p>
            {appt.notes && <p className="text-xs bg-yellow-100 p-1 rounded mt-2">{appt.notes}</p>}
          </div>
          <div className="flex gap-2 ml-2">
            <button 
              onClick={() => { setEditingId(appt.id); setEditForm(appt); }} 
              className="bg-blue-600 text-white px-2 py-1 rounded text-sm font-semibold hover:bg-blue-700"
            >
              ✏️
            </button>
            <button 
              onClick={() => deleteAppointment(appt.id, appt.doctor || 'Appointment')} 
              className="bg-red-600 text-white px-2 py-1 rounded text-sm font-semibold hover:bg-red-700"
            >
              🗑️
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="pb-24 md:pb-0 p-4 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Appointments</h1>
        <button 
          onClick={() => setShowCreateForm(!showCreateForm)} 
          className="bg-green-600 text-white px-4 py-2 rounded font-semibold hover:bg-green-700"
        >
          {showCreateForm ? 'Cancel' : 'New'}
        </button>
      </div>

      {showCreateForm && (
        <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Create Appointment</h2>
          <div className="space-y-3">
            <input 
              type="text" 
              placeholder="Title" 
              value={createForm.doctor} 
              onChange={(e) => setCreateForm({ ...createForm, doctor: e.target.value })} 
              className="w-full border rounded px-3 py-2" 
            />
            <input 
              type="text" 
              placeholder="Description" 
              value={createForm.reason} 
              onChange={(e) => setCreateForm({ ...createForm, reason: e.target.value })} 
              className="w-full border rounded px-3 py-2" 
            />
            <input 
              type="date" 
              value={createForm.appointment_date} 
              onChange={(e) => setCreateForm({ ...createForm, appointment_date: e.target.value })} 
              className="w-full border rounded px-3 py-2" 
            />
            <input 
              type="time" 
              value={createForm.appointment_time} 
              onChange={(e) => setCreateForm({ ...createForm, appointment_time: e.target.value })} 
              className="w-full border rounded px-3 py-2" 
            />
            <button 
              onClick={createAppointment} 
              className="w-full bg-green-600 text-white py-2 rounded font-semibold hover:bg-green-700"
            >
              Save
            </button>
          </div>
        </div>
      )}

      {/* Upcoming Appointments - Earliest to Latest */}
      <div className="bg-white rounded-lg p-6 mb-6 shadow">
        <h2 className="text-2xl font-bold mb-4">📅 Upcoming Appointments (Earliest First)</h2>
        {upcoming.length === 0 ? (
          <p className="text-gray-500">No upcoming appointments</p>
        ) : (
          <div className="space-y-3">
            {upcoming.map(AppointmentCard)}
          </div>
        )}
      </div>

      {/* Previous Appointments - Latest to Earliest */}
      <div className="bg-white rounded-lg p-6 shadow">
        <h2 className="text-2xl font-bold mb-4">📋 Previous Appointments (Latest First)</h2>
        {previous.length === 0 ? (
          <p className="text-gray-500">No previous appointments</p>
        ) : (
          <div className="space-y-3">
            {previous.map(AppointmentCard)}
          </div>
        )}
      </div>
    </div>
  );
}
