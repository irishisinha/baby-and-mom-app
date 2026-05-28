'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function Reports() {
  const [loading, setLoading] = useState(true);
  const [babies, setBabies] = useState<any[]>([]);

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
          .select('id')
          .eq('created_by', user.id)
          .single();

        if (familyData) {
          const { data: babiesData } = await supabase
            .from('babies')
            .select('*')
            .eq('family_id', familyData.id);

          if (babiesData) setBabies(babiesData);
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
      <h1 className="text-3xl font-bold mb-6">📊 Reports</h1>
      
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">📄 Generate Reports</h2>
        <p className="text-gray-600 mb-6">Create PDF reports for pediatrician or OB visits</p>
        
        {babies.length === 0 ? (
          <p className="text-gray-500">No babies to generate reports for</p>
        ) : (
          <div className="space-y-3">
            {babies.map((baby) => (
              <div key={baby.id} className="border rounded p-4 flex justify-between items-center">
                <div>
                  <p className="font-semibold">{baby.name}</p>
                  <p className="text-sm text-gray-600">DOB: {new Date(baby.date_of_birth).toLocaleDateString()}</p>
                </div>
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
                  Generate PDF
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
