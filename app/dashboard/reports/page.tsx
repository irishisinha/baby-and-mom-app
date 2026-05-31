'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const METRIC_TYPES = [
  { type: 'breastmilk', label: 'Breastmilk', icon: '🍼' },
  { type: 'formula', label: 'Formula', icon: '🍼' },
  { type: 'potty', label: 'Potty', icon: '💧' },
  { type: 'diaper', label: 'Diaper', icon: '🧻' },
  { type: 'sleep', label: 'Sleep', icon: '😴' },
  { type: 'weight', label: 'Weight', icon: '⚖️' },
  { type: 'fever', label: 'Fever', icon: '🌡️' },
  { type: 'bath', label: 'Bath', icon: '🛁' },
  { type: 'oil', label: 'Oil', icon: '🛢️' },
];

export default function ReportsPage() {
  const [metrics, setMetrics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [timeRange, setTimeRange] = useState('today');

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const { data } = await supabase
      .from('baby_metrics')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);

    setMetrics(data || []);
    setLoading(false);
  };

  const getMetricLabel = (type: string) => {
    const m = METRIC_TYPES.find(x => x.type === type);
    return m ? m.label : type;
  };

  const getMetricIcon = (type: string) => {
    const m = METRIC_TYPES.find(x => x.type === type);
    return m ? m.icon : '📊';
  };

  const getDateRange = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    if (timeRange === 'today') {
      return { start: today, end: new Date(today.getTime() + 24 * 60 * 60 * 1000) };
    } else if (timeRange === 'week') {
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      return { start: weekAgo, end: new Date(today.getTime() + 24 * 60 * 60 * 1000) };
    }
    return { start: today, end: new Date(today.getTime() + 24 * 60 * 60 * 1000) };
  };

  const filtered = metrics.filter(m => {
    const date = new Date(m.created_at);
    const range = getDateRange();
    const inRange = date >= range.start && date < range.end;
    const typeMatch = filterType === 'all' || m.metric_type === filterType;
    return inRange && typeMatch;
  });

  const grouped: any = {};
  filtered.forEach(m => {
    const type = m.metric_type;
    if (!grouped[type]) grouped[type] = [];
    grouped[type].push(m);
  });

  const stats: any = {};
  Object.keys(grouped).forEach(type => {
    const items = grouped[type];
    const values = items.map((x: any) => parseFloat(x.value)).filter((v: number) => !isNaN(v));
    if (values.length > 0) {
      stats[type] = {
        count: items.length,
        total: values.reduce((a: number, b: number) => a + b, 0),
        avg: (values.reduce((a: number, b: number) => a + b, 0) / values.length).toFixed(1),
        min: Math.min(...values).toFixed(1),
        max: Math.max(...values).toFixed(1),
      };
    } else {
      stats[type] = { count: items.length, total: 0, avg: 0, min: 0, max: 0 };
    }
  });

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">📊 Reports</h1>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex gap-4 flex-wrap mb-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Time Range</label>
            <select value={timeRange} onChange={e => setTimeRange(e.target.value)} className="px-4 py-2 border rounded">
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Filter by Metric</label>
            <select value={filterType} onChange={e => setFilterType(e.target.value)} className="px-4 py-2 border rounded">
              <option value="all">All Metrics</option>
              {METRIC_TYPES.map(m => <option key={m.type} value={m.type}>{m.icon} {m.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {Object.keys(stats).map(type => (
          <div key={type} className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
            <p className="text-lg font-bold mb-3">{getMetricIcon(type)} {getMetricLabel(type)}</p>
            <div className="space-y-2 text-sm">
              <p><span className="text-gray-600">Count:</span> <span className="font-semibold">{stats[type].count}</span></p>
              {stats[type].count > 0 && (
                <>
                  <p><span className="text-gray-600">Total:</span> <span className="font-semibold">{stats[type].total}</span></p>
                  <p><span className="text-gray-600">Average:</span> <span className="font-semibold">{stats[type].avg}</span></p>
                  <p><span className="text-gray-600">Min/Max:</span> <span className="font-semibold">{stats[type].min} / {stats[type].max}</span></p>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-4">Detailed Logs</h2>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-gray-500">No metrics found</p>
          ) : (
            filtered.map(m => (
              <div key={m.id} className="border-l-4 border-blue-400 pl-4 py-2 bg-gray-50">
                <p className="font-semibold">{getMetricIcon(m.metric_type)} {getMetricLabel(m.metric_type)}: {m.value} {m.unit}</p>
                <p className="text-xs text-gray-500">{new Date(m.created_at).toLocaleString()}</p>
                {m.notes && <p className="text-sm text-gray-600 mt-1">📝 {m.notes}</p>}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}