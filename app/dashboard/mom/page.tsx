'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function PostpartumWellness() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        window.location.href = '/login';
        return;
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  if (loading) return <div className="p-4">Loading...</div>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Postpartum Wellness</h1>
      <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
        <p className="text-sm text-blue-800">🔒 <strong>Private:</strong> Only you and the family admin can see this data.</p>
      </div>
      <p className="text-gray-600">Track mood, sleep, hydration, and recovery</p>
    </div>
  );
}
