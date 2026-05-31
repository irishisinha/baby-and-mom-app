'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const TIMEZONES = ['Europe/London', 'Europe/Paris', 'Asia/Kolkata', 'America/New_York'];

export default function FamilyManagement() {
  const [userId, setUserId] = useState<string | null>(null);
  const [babies, setBabies] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [editingBabyId, setEditingBabyId] = useState<string | null>(null);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);

  const [babyForm, setBabyForm] = useState({ name: '', dob: '' });
  const [memberForm, setMemberForm] = useState({ name: '', phone: '', timezone: 'Europe/London' });

  useEffect(() => {
    const fetch = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      
      const { data: b } = await supabase.from('babies').select('*').eq('user_id', user.id);
      setBabies(b || []);
      
      const { data: m } = await supabase.from('family_members').select('*').eq('user_id', user.id);
      setMembers(m || []);
    };
    fetch();
  }, []);

  const addBaby = async (e: any) => {
    e.preventDefault();
    if (!userId || !babyForm.name) return;
    const { data } = await supabase.from('babies').insert([{ user_id: userId, name: babyForm.name, date_of_birth: babyForm.dob }]).select();
    if (data) { setBabies([...babies, data[0]]); setBabyForm({ name: '', dob: '' }); }
  };

  const editBaby = async (id: string, name: string, dob: string) => {
    await supabase.from('babies').update({ name, date_of_birth: dob }).eq('id', id);
    setBabies(babies.map(b => b.id === id ? { ...b, name, date_of_birth: dob } : b));
    setEditingBabyId(null);
  };

  const deleteBaby = async (id: string) => {
    if (confirm('Delete?')) {
      await supabase.from('babies').delete().eq('id', id);
      setBabies(babies.filter(b => b.id !== id));
    }
  };

  const addMember = async (e: any) => {
    e.preventDefault();
    if (!userId) return;
    const { data } = await supabase.from('family_members').insert([{ user_id: userId, ...memberForm }]).select();
    if (data) { setMembers([...members, data[0]]); setMemberForm({ name: '', phone: '', timezone: 'Europe/London' }); }
  };

  const editMember = async (id: string, data: any) => {
    await supabase.from('family_members').update(data).eq('id', id);
    setMembers(members.map(m => m.id === id ? { ...m, ...data } : m));
    setEditingMemberId(null);
  };

  const deleteMember = async (id: string) => {
    if (confirm('Delete?')) {
      await supabase.from('family_members').delete().eq('id', id);
      setMembers(members.filter(m => m.id !== id));
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Family Management</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-4">Babies</h2>
          <form onSubmit={addBaby} className="space-y-3 mb-6 pb-6 border-b">
            <input type="text" value={babyForm.name} onChange={e => setBabyForm({...babyForm, name: e.target.value})} placeholder="Baby name" required className="w-full px-4 py-2 border rounded" />
            <input type="date" value={babyForm.dob} onChange={e => setBabyForm({...babyForm, dob: e.target.value})} className="w-full px-4 py-2 border rounded" />
            <button type="submit" className="w-full bg-pink-600 text-white font-bold py-2 rounded">Add Baby</button>
          </form>
          
          <div className="space-y-3">
            {babies.map(b => (
              <div key={b.id} className="border rounded p-4 bg-gray-50">
                {editingBabyId === b.id ? (
                  <div className="space-y-2">
                    <input type="text" defaultValue={b.name} onChange={e => {}} className="w-full px-2 py-1 border rounded text-sm" />
                    <input type="date" defaultValue={b.date_of_birth} onChange={e => {}} className="w-full px-2 py-1 border rounded text-sm" />
                    <button onClick={() => setEditingBabyId(null)} className="px-3 py-1 bg-green-600 text-white rounded text-sm">Save</button>
                  </div>
                ) : (
                  <div className="flex justify-between">
                    <div><p className="font-bold">{b.name}</p><p className="text-sm text-gray-600">{b.date_of_birth}</p></div>
                    <div className="flex gap-2"><button onClick={() => setEditingBabyId(b.id)} className="px-2 py-1 bg-blue-600 text-white rounded text-sm">Edit</button><button onClick={() => deleteBaby(b.id)} className="px-2 py-1 bg-red-600 text-white rounded text-sm">Delete</button></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-4">Family Members</h2>
          <form onSubmit={addMember} className="space-y-3 mb-6 pb-6 border-b">
            <input type="text" value={memberForm.name} onChange={e => setMemberForm({...memberForm, name: e.target.value})} placeholder="Name" required className="w-full px-4 py-2 border rounded" />
            <input type="tel" value={memberForm.phone} onChange={e => setMemberForm({...memberForm, phone: e.target.value})} placeholder="Phone" required className="w-full px-4 py-2 border rounded" />
            <select value={memberForm.timezone} onChange={e => setMemberForm({...memberForm, timezone: e.target.value})} className="w-full px-4 py-2 border rounded">
              {TIMEZONES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <button type="submit" className="w-full bg-blue-600 text-white font-bold py-2 rounded">Add Member</button>
          </form>

          <div className="space-y-3">
            {members.map(m => (
              <div key={m.id} className="border rounded p-4 bg-gray-50">
                <div className="flex justify-between">
                  <div><p className="font-bold">{m.name}</p><p className="text-sm text-gray-600">{m.phone}</p><p className="text-sm text-gray-600">{m.timezone}</p></div>
                  <div className="flex gap-2"><button onClick={() => editMember(m.id, {})} className="px-2 py-1 bg-blue-600 text-white rounded text-sm">Edit</button><button onClick={() => deleteMember(m.id)} className="px-2 py-1 bg-red-600 text-white rounded text-sm">Delete</button></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}