'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function FamilyManagement() {
  const [loading, setLoading] = useState(true);
  const [family, setFamily] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);
  
  const [formData, setFormData] = useState({
    memberEmail: '',
    whatsappNumber: '',
    role: 'member'
  });
  const [submitted, setSubmitted] = useState(false);

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
          .select('*')
          .eq('created_by', user.id)
          .single();

        if (familyData) {
          setFamily(familyData);

          const token = btoa(JSON.stringify({ family_id: familyData.id, created_at: new Date().toISOString() }));
          setInviteLink(window.location.origin + '/join/' + token);

          const { data: membersData } = await supabase
            .from('family_members')
            .select('*')
            .eq('family_id', familyData.id);

          if (membersData) setMembers(membersData);
        }

        setLoading(false);
      } catch (err) {
        console.error('Error:', err);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!family) return;

    try {
      const { data, error } = await supabase
        .from('family_members')
        .insert([{
          family_id: family.id,
          email: formData.memberEmail,
          whatsapp_number: formData.whatsappNumber,
          role: formData.role,
          user_id: null
        }])
        .select();

      if (!error && data) {
        setMembers([...members, data[0]]);
        setSubmitted(true);
        setFormData({ memberEmail: '', whatsappNumber: '', role: 'member' });
        setTimeout(() => setSubmitted(false), 3000);
      }
    } catch (err) {
      console.error('Error:', err);
    }
  };

  if (loading) return <div className="p-4">Loading...</div>;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Family Management</h1>

      {family && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow p-6 mb-6 border border-blue-200">
          <h2 className="text-2xl font-bold mb-2">{family.name}</h2>
          <div className="grid grid-cols-2 gap-4 text-gray-700">
            <div>
              <p className="text-sm text-gray-600">Location</p>
              <p className="font-semibold">{family.country}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Timezone</p>
              <p className="font-semibold">{family.timezone}</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">Invite Family Members</h2>
        <p className="text-gray-600 mb-4">Share this link with your nanny, grandparents, or other family members</p>
        
        <div className="flex gap-2 mb-4">
          <input 
            type="text" 
            value={inviteLink} 
            readOnly 
            className="flex-1 px-4 py-2 border rounded bg-gray-50 text-sm"
          />
          <button 
            onClick={copyToClipboard}
            className={`px-6 py-2 rounded font-semibold transition ${copied ? 'bg-green-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
          >
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">Add Family Member</h2>
        <form onSubmit={handleAddMember} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Email</label>
            <input 
              type="email" 
              value={formData.memberEmail}
              onChange={(e) => setFormData({...formData, memberEmail: e.target.value})}
              placeholder="nanny@example.com"
              className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">WhatsApp Number</label>
            <input 
              type="tel" 
              value={formData.whatsappNumber}
              onChange={(e) => setFormData({...formData, whatsappNumber: e.target.value})}
              placeholder="+1 (555) 123-4567"
              className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Role</label>
            <select 
              value={formData.role}
              onChange={(e) => setFormData({...formData, role: e.target.value})}
              className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500"
            >
              <option value="nanny">Nanny</option>
              <option value="grandparent">Grandparent</option>
              <option value="pediatrician">Pediatrician</option>
              <option value="member">Family Member</option>
            </select>
          </div>

          {submitted && (
            <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-2 rounded text-sm">
              Invitation sent successfully!
            </div>
          )}

          <button 
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded"
          >
            Send Invite
          </button>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Family Members</h2>
        {members.length === 0 ? (
          <p className="text-gray-500">No members yet. Use invite link above.</p>
        ) : (
          <div className="space-y-3">
            {members.map((member) => (
              <div key={member.id} className="border rounded p-4">
                <p className="font-semibold capitalize">{member.role}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
