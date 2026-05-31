'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function OnboardingPage() {
  const router = useRouter();
  const [babyName, setBabyName] = useState('');
  const [babyDOB, setBabyDOB] = useState('');
  const [familyMembers, setFamilyMembers] = useState([
    { name: '', phone: '', relationship: '' }
  ]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      setUserId(session.user.id);
    };
    checkAuth();
  }, [router]);

  const handleAddFamily = () => {
    setFamilyMembers([...familyMembers, { name: '', phone: '', relationship: '' }]);
  };

  const handleRemoveFamily = (index: number) => {
    setFamilyMembers(familyMembers.filter((_, i) => i !== index));
  };

  const handleFamilyChange = (index: number, field: string, value: string) => {
    const updated = [...familyMembers];
    updated[index] = { ...updated[index], [field]: value };
    setFamilyMembers(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (!userId) {
        setMessage('User ID not found');
        return;
      }

      if (!babyName.trim()) {
        setMessage('Please enter baby name');
        setLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(
          { id: userId, email: user?.email || '', setup_completed: false },
          { onConflict: 'id' }
        );

      if (profileError) throw profileError;

      const { error: babyError } = await supabase
        .from('babies')
        .insert({
          user_id: userId,
          name: babyName,
          date_of_birth: babyDOB || null
        });

      if (babyError) throw babyError;

      const validFamilyMembers = familyMembers.filter(m => m.name && m.phone);
      if (validFamilyMembers.length > 0) {
        const { error: familyError } = await supabase
          .from('family_members')
          .insert(
            validFamilyMembers.map(m => ({
              user_id: userId,
              name: m.name,
              phone: m.phone,
              relationship: m.relationship || null
            }))
          );

        if (familyError) throw familyError;
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ setup_completed: true })
        .eq('id', userId);

      if (updateError) throw updateError;

      setMessage('Setup complete! Redirecting...');
      setTimeout(() => router.push('/dashboard'), 1500);
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-100 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-4xl font-bold text-center mb-2">Welcome!</h1>
          <p className="text-center text-gray-600 mb-8">Tell us about your baby and family.</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="border-b pb-6">
              <h2 className="text-2xl font-semibold mb-4">Baby Information</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Baby Name *</label>
                <input
                  type="text"
                  value={babyName}
                  onChange={(e) => setBabyName(e.target.value)}
                  placeholder="e.g., Aditya"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
                />
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
                <input
                  type="date"
                  value={babyDOB}
                  onChange={(e) => setBabyDOB(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
                />
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-semibold mb-4">Family Members</h2>
              <p className="text-sm text-gray-600 mb-4">Add family members for WhatsApp updates</p>
              <div className="space-y-4">
                {familyMembers.map((member, idx) => (
                  <div key={idx} className="p-4 border border-gray-200 rounded-lg space-y-3">
                    <div className="flex justify-between">
                      <span className="font-semibold">Member {idx + 1}</span>
                      {familyMembers.length > 1 && (
                        <button type="button" onClick={() => handleRemoveFamily(idx)} className="text-red-600">
                          Remove
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      placeholder="Name"
                      value={member.name}
                      onChange={(e) => handleFamilyChange(idx, 'name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                    />
                    <input
                      type="tel"
                      placeholder="Phone +919876543210"
                      value={member.phone}
                      onChange={(e) => handleFamilyChange(idx, 'phone', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Relationship"
                      value={member.relationship}
                      onChange={(e) => handleFamilyChange(idx, 'relationship', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                    />
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={handleAddFamily}
                className="mt-4 w-full px-4 py-2 border-2 border-dashed border-pink-300 text-pink-600 rounded-lg font-medium"
              >
                + Add Member
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold py-3 rounded-lg"
            >
              {loading ? 'Setting up...' : 'Complete Setup'}
            </button>
          </form>

          {message && <p className={`mt-4 text-center font-medium ${message.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>{message}</p>}
        </div>
      </div>
    </div>
  );
}
