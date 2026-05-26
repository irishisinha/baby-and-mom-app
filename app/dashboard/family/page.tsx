'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function FamilyManagement() {
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
      <h1 className="text-2xl font-bold mb-4">Family Management</h1>
      <p className="text-gray-600">Invite family members and manage their access</p>
    </div>
  );
}
