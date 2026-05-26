'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function Reminders() {
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
      <h1 className="text-2xl font-bold mb-4">Reminders</h1>
      <p className="text-gray-600">Set and manage recurring reminders for feeds, vaccines, doctor visits, and more.</p>
    </div>
  );
}
