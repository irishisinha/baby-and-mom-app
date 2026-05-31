'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { PILOT_USER_ID, PILOT_FAMILY_ID } from '@/lib/pilot-user';

export default function BabyTracker() {
  const [loading, setLoading] = useState(true);
  const [babies, setBabies] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: babiesData } = await supabase
          .from('babies')
          .select('*')
          .eq('created_by', PILOT_USER_ID)
          .order('date_of_birth', { ascending: false });

        if (babiesData) setBabies(babiesData);
        setLoading(false);
      } catch (err) {
        console.error('Error:', err);
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">👶 Baby Tracker</h1>
      
      {babies.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500 text-lg">No babies found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {babies.map(baby => (
            <div key={baby.id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-blue-900">{baby.name}</h2>
                  <p className="text-gray-600 mt-2">📅 DOB: {baby.date_of_birth}</p>
                  <p className="text-sm text-gray-500 mt-2">Added: {new Date(baby.created_at).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-4xl">👶</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}