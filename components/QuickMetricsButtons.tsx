'use client';

import { useState } from 'react';

interface QuickMetricsProps {
  onMetricAdded?: () => void;
}

export function QuickMetricsButtons({ onMetricAdded }: QuickMetricsProps) {
  const [showForm, setShowForm] = useState<'formula' | 'breast' | 'diaper' | null>(null);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (type: string) => {
    try {
      setLoading(true);
      const message = `${type} ${amount}ml`;

      const response = await fetch('/api/whatsapp/log-metric', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metricType: type,
          value: parseInt(amount),
          unit: 'ml',
        }),
      });

      if (response.ok) {
        setAmount('');
        setShowForm(null);
        onMetricAdded?.();
        alert(`✅ ${type} recorded and family notified!`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to log metric');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-2 mb-4">
      {/* Formula Button */}
      <button
        onClick={() => setShowForm('formula')}
        className="bg-blue-100 text-blue-900 px-4 py-3 rounded hover:bg-blue-200 font-medium"
      >
        🍼 Add Formula
      </button>

      {/* Breast Milk Button */}
      <button
        onClick={() => setShowForm('breast')}
        className="bg-pink-100 text-pink-900 px-4 py-3 rounded hover:bg-pink-200 font-medium"
      >
        🤱 Add Breast
      </button>

      {/* Diaper Change Button */}
      <button
        onClick={() => setShowForm('diaper')}
        className="bg-yellow-100 text-yellow-900 px-4 py-3 rounded hover:bg-yellow-200 font-medium col-span-2"
      >
        🧷 Diaper Change
      </button>

      {/* Form Modal */}
      {showForm && (
        <div className="col-span-2 bg-gray-50 border border-gray-300 rounded p-4 mt-2">
          <h3 className="font-bold mb-2">Add {showForm.toUpperCase()}</h3>
          
          {showForm !== 'diaper' && (
            <>
              <label className="block text-sm mb-1">Amount (ml)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g., 60"
                className="border rounded px-3 py-2 w-full mb-3 text-black"
                min="0"
              />
            </>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => handleSubmit(showForm)}
              disabled={loading || (showForm !== 'diaper' && !amount)}
              className="flex-1 bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? '...' : '✓ Save & Notify'}
            </button>
            <button
              onClick={() => { setShowForm(null); setAmount(''); }}
              className="flex-1 bg-gray-400 text-white px-3 py-2 rounded hover:bg-gray-500"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
