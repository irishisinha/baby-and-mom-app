'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const METRIC_TYPES = [
  { type: 'breastmilk', label: 'Breastmilk', icon: '🍼' },
  { type: 'formula', label: 'Formula', icon: '🍼' },
  { type: 'potty', label: 'Potty', icon: '💧' },
  { type: 'diaper', label: 'Diaper', icon: '🧻' },
  { type: 'bath', label: 'Bath', icon: '🛁' },
  { type: 'oil', label: 'Oil', icon: '🛢️' },
  { type: 'sleep', label: 'Sleep', icon: '😴' },
  { type: 'weight', label: 'Weight', icon: '⚖️' },
  { type: 'fever', label: 'Fever', icon: '🌡️' },
  { type: 'vaccine', label: 'Vaccine', icon: '💉' },
];

export default function MetricsPage() {
  const [metrics, setMetrics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [editData, setEditData] = useState({
    value: '',
    unit: '',
    notes: ''
  });

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    const { data } = await supabase
      .from('baby_metrics')
      .select('*')
      .order('created_at', { ascending: false });
    setMetrics(data || []);
    setLoading(false);
  };

  const handleEdit = (metric: any) => {
    setEditingId(metric.id);
    setEditData({ value: metric.value, unit: metric.unit, notes: metric.notes || '' });
  };

  const handleSave = async (id: string) => {
    await supabase.from('baby_metrics').update(editData).eq('id', id);
    setMetrics(metrics.map(m => m.id === id ? {...m, ...editData} : m));
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete?')) return;
    await supabase.from('baby_metrics').delete().eq('id', id);
    setMetrics(metrics.filter(m => m.id !== id));
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Metrics</h1>
      <div className="space-y-3">
        {metrics.map(m => (
          <div key={m.id} className="border rounded p-4 bg-gray-50 flex justify-between">
            {editingId === m.id ? (
              <div className="flex-1 space-y-2">
                <input type="number" value={editData.value} onChange={e => setEditData({...editData, value: e.target.value})} className="w-full px-2 py-1 border rounded" />
                <input type="text" value={editData.unit} onChange={e => setEditData({...editData, unit: e.target.value})} className="w-full px-2 py-1 border rounded" />
                <textarea value={editData.notes} onChange={e => setEditData({...editData, notes: e.target.value})} className="w-full px-2 py-1 border rounded"></textarea>
                <div className="flex gap-2">
                  <button onClick={() => handleSave(m.id)} className="px-3 py-1 bg-green-600 text-white rounded text-sm">Save</button>
                  <button onClick={() => setEditingId(null)} className="px-3 py-1 bg-gray-400 text-white rounded text-sm">Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <p className="font-bold">{m.metric_type}: {m.value} {m.unit}</p>
                  <p className="text-xs text-gray-500">{new Date(m.created_at).toLocaleString()}</p>
                  {m.notes && <p className="text-sm text-gray-600">Notes: {m.notes}</p>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(m)} className="px-2 py-1 bg-blue-600 text-white rounded text-sm">Edit</button>
                  <button onClick={() => handleDelete(m.id)} className="px-2 py-1 bg-red-600 text-white rounded text-sm">Delete</button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
