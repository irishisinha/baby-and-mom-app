'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { PILOT_USER_ID } from '@/lib/pilot-user';

const TIMEZONES = ['Europe/London', 'Europe/Paris', 'Asia/Kolkata', 'America/New_York'];

export default function FamilyManagement() {
  const [userId, setUserId] = useState<string | null>(null);
  const [babies, setBabies] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [editingBabyId, setEditingBabyId] = useState<string | null>(null);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editBabyData, setEditBabyData] = useState({ name: '', dob: '' });
  const [editMemberData, setEditMemberData] = useState({ name: '', phone: '', timezone: 'Europe/London' });

  const [babyForm, setBabyForm] = useState({ name: '', dob: '' });
  const [memberForm, setMemberForm] = useState({ name: '', phone: '', timezone: 'Europe/London' });

  useEffect(() => {
    const fetch = async () => {
      setUserId(PILOT_USER_ID);
      
      const { data: b } = await supabase.from('babies').select('*').eq('user_id', PILOT_USER_ID);
      setBabies(b || []);
      
      const { data: m } = await supabase.from('family_members').select('*').eq('user_id', PILOT_USER_ID);
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

  const saveBabyEdit = async (id: string) => {
    if (!editBabyData.name) return;
    await supabase.from('babies').update({ name: editBabyData.name, date_of_birth: editBabyData.dob }).eq('id', id);
    setBabies(babies.map(b => b.id === id ? { ...b, name: editBabyData.name, date_of_birth: editBabyData.dob } : b));
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

  const saveMemberEdit = async (id: string) => {
    if (!editMemberData.name || !editMemberData.phone) return;
    await supabase.from('family_members').update({ name: editMemberData.name, phone: editMemberData.phone, timezone: editMemberData.timezone }).eq('id', id);
    setMembers(members.map(m => m.id === id ? { ...m, ...editMemberData } : m));
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
      <h1 className="text-3xl font-bold mb-8">👨‍👩‍👧‍👦 Family Management</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Babies Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-4">👶 Babies</h2>
          <form onSubmit={addBaby} className="space-y-3 mb-6 pb-6 border-b">
            <input type="text" value={babyForm.name} onChange={e => setBabyForm({...babyForm, name: e.target.value})} placeholder="Baby name" required className="w-full px-4 py-2 border rounded" />
            <input type="date" value={babyForm.dob} onChange={e => setBabyForm({...babyForm, dob: e.target.value})} className="w-full px-4 py-2 border rounded" />
            <button type="submit" className="w-full bg-pink-600 text-white font-bold py-2 rounded">+ Add Baby</button>
          </form>
          
          <div className="space-y-3 mt-4">
            {babies.length === 0 ? <p className="text-gray-400 italic">No babies added yet</p> : babies.map(b => (
              <div key={b.id} className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50 hover:shadow-md transition">
                {editingBabyId === b.id ? (
                  <div className="space-y-2">
                    <input type="text" value={editBabyData.name} onChange={e => setEditBabyData({...editBabyData, name: e.target.value})} className="w-full px-2 py-1 border rounded text-sm" />
                    <input type="date" value={editBabyData.dob} onChange={e => setEditBabyData({...editBabyData, dob: e.target.value})} className="w-full px-2 py-1 border rounded text-sm" />
                    <div className="flex gap-2">
                      <button onClick={() => saveBabyEdit(b.id)} className="flex-1 px-3 py-1 bg-green-600 text-white rounded text-sm">Save</button>
                      <button onClick={() => setEditingBabyId(null)} className="flex-1 px-3 py-1 bg-gray-600 text-white rounded text-sm">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-lg font-bold text-blue-900">{b.name}</p>
                      <p className="text-sm text-gray-600">📅 DOB: {b.date_of_birth}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setEditingBabyId(b.id); setEditBabyData({ name: b.name, dob: b.date_of_birth }); }} className="px-2 py-1 bg-blue-600 text-white rounded text-sm">Edit</button>
                      <button onClick={() => deleteBaby(b.id)} className="px-2 py-1 bg-red-600 text-white rounded text-sm">Delete</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Family Members Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-4">👥 Family Members</h2>
          <form onSubmit={addMember} className="space-y-3 mb-6 pb-6 border-b">
            <input type="text" value={memberForm.name} onChange={e => setMemberForm({...memberForm, name: e.target.value})} placeholder="Name" required className="w-full px-4 py-2 border rounded" />
            <input type="tel" value={memberForm.phone} onChange={e => setMemberForm({...memberForm, phone: e.target.value})} placeholder="Phone" required className="w-full px-4 py-2 border rounded" />
            <select value={memberForm.timezone} onChange={e => setMemberForm({...memberForm, timezone: e.target.value})} className="w-full px-4 py-2 border rounded">
              {TIMEZONES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <button type="submit" className="w-full bg-blue-600 text-white font-bold py-2 rounded">+ Add Member</button>
          </form>

          <div className="space-y-3 mt-4">
            {members.length === 0 ? <p className="text-gray-400 italic">No family members added yet</p> : members.map(m => (
              <div key={m.id} className="border-2 border-purple-200 rounded-lg p-4 bg-purple-50 hover:shadow-md transition">
                {editingMemberId === m.id ? (
                  <div className="space-y-2">
                    <input type="text" value={editMemberData.name} onChange={e => setEditMemberData({...editMemberData, name: e.target.value})} className="w-full px-2 py-1 border rounded text-sm" />
                    <input type="tel" value={editMemberData.phone} onChange={e => setEditMemberData({...editMemberData, phone: e.target.value})} className="w-full px-2 py-1 border rounded text-sm" />
                    <select value={editMemberData.timezone} onChange={e => setEditMemberData({...editMemberData, timezone: e.target.value})} className="w-full px-2 py-1 border rounded text-sm">
                      {TIMEZONES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <div className="flex gap-2">
                      <button onClick={() => saveMemberEdit(m.id)} className="flex-1 px-3 py-1 bg-green-600 text-white rounded text-sm">Save</button>
                      <button onClick={() => setEditingMemberId(null)} className="flex-1 px-3 py-1 bg-gray-600 text-white rounded text-sm">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-lg font-bold text-purple-900">{m.name}</p>
                      <p className="text-sm text-gray-600">📱 {m.phone}</p>
                      <p className="text-sm text-gray-600">🕐 {m.timezone}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setEditingMemberId(m.id); setEditMemberData({ name: m.name, phone: m.phone, timezone: m.timezone }); }} className="px-2 py-1 bg-blue-600 text-white rounded text-sm">Edit</button>
                      <button onClick={() => deleteMember(m.id)} className="px-2 py-1 bg-red-600 text-white rounded text-sm">Delete</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}