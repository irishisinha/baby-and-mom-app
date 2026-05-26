'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function BabyTracker() {
  const [loading, setLoading] = useState(true);
  const [babies, setBabies] = useState<any[]>([]);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        window.location.href = '/login';
        return;
      }

      // Fetch babies
      const { data } = await supabase
        .from('babies')
        .select('*')
        .order('date_of_birth', { ascending: false });

      if (data) setBabies(data);
      setLoading(false);
    };

    checkAuth();
  }, []);

  if (loading) return <div className="p-4">Loading...</div>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Baby Tracker</h1>
      <p className="text-gray-600">Track feeds, diapers, sleep, and milestones</p>
    </div>
  );
}
