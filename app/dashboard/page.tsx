'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function Dashboard() {
  const [metrics, setMetrics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMetric, setNewMetric] = useState({ type: 'breastmilk', value: '', unit: 'ml' });

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    const { data } = await supabase
      .from('baby_metrics')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    setMetrics(data || []);
    setLoading(false);
  };

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMetric.value) return;

    const { data, error } = await supabase
      .from('baby_metrics')
      .insert([{
        metric_type: newMetric.type,
        value: newMetric.value,
        unit: newMetric.unit,
        created_at: new Date().toISOString()
      }])
      .select();

    if (!error && data) {
      setMetrics([data[0], ...metrics]);
      setNewMetric({ type: 'breastmilk', value: '', unit: 'ml' });
    }
  };

  const handleEdit = async (id: string, newValue: string) => {
    await supabase.from('baby_metrics').update({ value: newValue }).eq('id', id);
    setMetrics(metrics.map(m => m.id === id ? {...m, value: newValue} : m));
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete?')) return;
    await supabase.from('baby_metrics').delete().eq('id', id);
    setMetrics(metrics.filter(m => m.id !== id));
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6">
      <h1 className="text-4xl font-bold mb-8">👶 Dashboard</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-4">Quick Add Metric</h2>
          <form onSubmit={handleQuickAdd} className="space-y-3">
            <select value={newMetric.type} onChange={e => setNewMetric({...newMetric, type: e.target.value})} className="w-full px-4 py-2 border rounded">
              <option value="breastmilk">🍼 Breastmilk</option>
              <option value="formula">🍼 Formula</option>
              <option value="potty">💧 Potty</option>
              <option value="diaper">🧻 Diaper</option>
              <option value="sleep">😴 Sleep</option>
              <option value="weight">⚖️ Weight</option>
            </select>
            <input type="number" value={newMetric.value} onChange={e => setNewMetric({...newMetric, value: e.target.value})} placeholder="Value" step="0.1" required className="w-full px-4 py-2 border rounded" />
            <input type="text" value={newMetric.unit} onChange={e => setNewMetric({...newMetric, unit: e.target.value})} placeholder="Unit" className="w-full px-4 py-2 border rounded" />
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded">Add</button>
          </form>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Recent Metrics</h2>
            <Link href="/dashboard/metrics" className="text-blue-600 hover:underline text-sm">View all →</Link>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {metrics.slice(0, 5).map(m => (
              <div key={m.id} className="border rounded p-3 bg-gray-50 flex justify-between items-center text-sm">
                <div>
                  <p className="font-semibold">{m.metric_type}: {m.value} {m.unit}</p>
                  <p className="text-xs text-gray-500">{new Date(m.created_at).toLocaleString()}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => {const v = prompt('New value', m.value); if(v) handleEdit(m.id, v);}} className="px-2 py-1 bg-blue-600 text-white text-xs rounded">Edit</button>
                  <button onClick={() => handleDelete(m.id)} className="px-2 py-1 bg-red-600 text-white text-xs rounded">Del</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
