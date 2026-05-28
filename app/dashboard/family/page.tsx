'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function FamilyManagement() {
  const [loading, setLoading] = useState(true);
  const [family, setFamily] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);

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

  if (loading) return <div className="p-4">Loading...</div>;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">👨‍👩‍👧 Family Management</h1>
      
      {family && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Family: {family.name}</h2>
          <p className="text-gray-600">Location: {family.country}</p>
          <p className="text-gray-600">Timezone: {family.timezone}</p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">👥 Family Members</h2>
        {members.length === 0 ? (
          <p className="text-gray-500">No other members yet</p>
        ) : (
          <div className="space-y-2">
            {members.map((member) => (
              <div key={member.id} className="border rounded p-3">
                <p className="font-semibold capitalize">{member.role}</p>
              </div>
            ))}
          </div>
        )}
        
        <button className="mt-6 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded">
          + Invite Family Member
        </button>
      </div>
    </div>
  );
}
