'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface Metric {
  id: string;
  metric_type: string;
  value: number;
  unit: string;
  created_at: string;
}

interface Appointment {
  id: string;
  title: string;
  appointment_date: string;
  time?: string;
  notes?: string;
}

interface SummaryStats {
  [key: string]: {
    type: 'count' | 'average';
    value: string;
  };
}

export default function Dashboard() {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [summaryStats, setSummaryStats] = useState<SummaryStats>({});
  const [loading, setLoading] = useState(true);
  const [newMetric, setNewMetric] = useState({
    type: 'breastmilk',
    value: '',
    unit: 'ml',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      await Promise.all([fetchMetrics(), fetchAppointments()]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetrics = async () => {
    const { data, error } = await supabase
      .from('baby_metrics')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (data && !error) {
      setMetrics(data as Metric[]);
      calculateSummaryStats(data as Metric[]);
    }
  };

  const fetchAppointments = async () => {
    try {
      const response = await fetch('/api/appointments');
      const result = await response.json();
      if (result.data && Array.isArray(result.data)) {
        setAppointments(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch appointments:', error);
    }
  };

  const calculateSummaryStats = (metricsData: Metric[]) => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const last7Days = metricsData.filter((m) => {
      const metricDate = new Date(m.created_at);
      return metricDate >= sevenDaysAgo;
    });

    const countMetrics = ['bath', 'oil'];
    const stats: SummaryStats = {};

    const groupedByType = last7Days.reduce(
      (acc, m) => {
        if (!acc[m.metric_type]) {
          acc[m.metric_type] = [];
        }
        acc[m.metric_type].push(m);
        return acc;
      },
      {} as Record<string, Metric[]>
    );

    Object.entries(groupedByType).forEach(([type, typeMetrics]) => {
      if (countMetrics.includes(type)) {
        stats[type] = {
          type: 'count',
          value: `${typeMetrics.length} times`,
        };
      } else {
        const values = typeMetrics.map((m) => parseFloat(m.value.toString()));
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        stats[type] = {
          type: 'average',
          value: `${avg.toFixed(1)} avg`,
        };
      }
    });

    setSummaryStats(stats);
  };

  const getDateStatus = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const dateOnly = date.toDateString();
    const todayOnly = today.toDateString();
    const yesterdayOnly = yesterday.toDateString();

    if (dateOnly === todayOnly) {
      return {
        label: 'Today',
        color: 'bg-green-100 text-green-800',
      };
    } else if (dateOnly === yesterdayOnly) {
      return {
        label: 'Yesterday',
        color: 'bg-yellow-100 text-yellow-800',
      };
    } else {
      return {
        label: date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
        color: 'bg-gray-100 text-gray-800',
      };
    }
  };

  const getAppointmentStatus = (appointmentDate: string) => {
    const apptDate = new Date(appointmentDate);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const apptDateOnly = apptDate.toDateString();
    const todayOnly = today.toDateString();
    const tomorrowOnly = tomorrow.toDateString();

    if (apptDateOnly === todayOnly) {
      return {
        label: 'Today!',
        color: 'bg-red-100 text-red-800 border-l-4 border-red-600',
      };
    } else if (apptDateOnly === tomorrowOnly) {
      return {
        label: 'Tomorrow',
        color: 'bg-orange-100 text-orange-800 border-l-4 border-orange-600',
      };
    } else {
      const daysUntil = Math.floor(
        (apptDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );
      return {
        label: `In ${daysUntil} days`,
        color: 'bg-blue-100 text-blue-800 border-l-4 border-blue-600',
      };
    }
  };

  const upcomingAppointments = appointments
    .filter((a) => new Date(a.appointment_date) >= new Date())
    .slice(0, 5);

  const handleQuickAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newMetric.value) return;

    const { data, error } = await supabase
      .from('baby_metrics')
      .insert([
        {
          metric_type: newMetric.type,
          value: parseFloat(newMetric.value),
          unit: newMetric.unit,
          created_at: new Date().toISOString(),
        },
      ])
      .select();

    if (!error && data && data.length > 0) {
      setMetrics([data[0] as Metric, ...metrics]);
      setNewMetric({ type: 'breastmilk', value: '', unit: 'ml' });
      calculateSummaryStats([data[0] as Metric, ...metrics]);
    }
  };

  const handleEdit = async (id: string, newValue: string) => {
    const numValue = parseFloat(newValue);
    if (isNaN(numValue)) return;

    const { error } = await supabase
      .from('baby_metrics')
      .update({ value: numValue })
      .eq('id', id);

    if (!error) {
      setMetrics(
        metrics.map((m) =>
          m.id === id ? { ...m, value: numValue } : m
        )
      );
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this metric?')) return;

    const { error } = await supabase
      .from('baby_metrics')
      .delete()
      .eq('id', id);

    if (!error) {
      setMetrics(metrics.filter((m) => m.id !== id));
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-gray-600 text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-4xl font-bold mb-8 text-gray-800">Dashboard</h1>

      {/* 7-Day Summary Stats */}
      {Object.keys(summaryStats).length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold mb-4 text-gray-800">7-Day Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Object.entries(summaryStats).map(([type, stat]) => (
              <div
                key={type}
                className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200 shadow-sm"
              >
                <p className="text-xs font-semibold text-gray-600 uppercase mb-2 tracking-wide">
                  {type}
                </p>
                <p className="text-lg font-bold text-blue-900">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Quick Add Metric Form */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4 text-gray-800">Quick Add</h2>
          <form onSubmit={handleQuickAdd} className="space-y-3">
            <select
              value={newMetric.type}
              onChange={(e) =>
                setNewMetric({ ...newMetric, type: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800"
            >
              <option value="breastmilk">Breastmilk</option>
              <option value="formula">Formula</option>
              <option value="potty">Potty</option>
              <option value="diaper">Diaper</option>
              <option value="sleep">Sleep</option>
              <option value="weight">Weight</option>
              <option value="bath">Bath</option>
              <option value="oil">Oil</option>
            </select>

            <input
              type="number"
              value={newMetric.value}
              onChange={(e) =>
                setNewMetric({ ...newMetric, value: e.target.value })
              }
              placeholder="Value"
              step="0.1"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
            />

            <input
              type="text"
              value={newMetric.unit}
              onChange={(e) =>
                setNewMetric({ ...newMetric, unit: e.target.value })
              }
              placeholder="Unit (ml, oz, etc.)"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
            />

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200"
            >
              Add Metric
            </button>
          </form>
        </div>

        {/* Recent Metrics */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">Recent Metrics</h2>
            <Link
              href="/dashboard/metrics"
              className="text-blue-600 hover:text-blue-800 text-xs font-semibold"
            >
              View All →
            </Link>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {metrics.length > 0 ? (
              metrics.slice(0, 5).map((m) => {
                const dateStatus = getDateStatus(m.created_at);
                return (
                  <div
                    key={m.id}
                    className="border border-gray-200 rounded-lg p-3 bg-gray-50 hover:bg-gray-100 transition"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <p className="font-semibold text-sm text-gray-800">
                          {m.metric_type}: {m.value} {m.unit}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(m.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <span
                        className={`text-xs font-semibold px-2 py-1 rounded ml-2 whitespace-nowrap ${dateStatus.color}`}
                      >
                        {dateStatus.label}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          const v = prompt('New value', m.value.toString());
                          if (v) handleEdit(m.id, v);
                        }}
                        className="flex-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(m.id)}
                        className="flex-1 px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-gray-500 text-sm text-center py-4">
                No metrics yet
              </p>
            )}
          </div>
        </div>

        {/* Next Appointments */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">Next Appointments</h2>
            <Link
              href="/dashboard/appointments"
              className="text-blue-600 hover:text-blue-800 text-xs font-semibold"
            >
              View All →
            </Link>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {upcomingAppointments.length > 0 ? (
              upcomingAppointments.map((a) => {
                const apptStatus = getAppointmentStatus(a.appointment_date);
                return (
                  <div
                    key={a.id}
                    className={`rounded-lg p-3 ${apptStatus.color}`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <p className="font-semibold text-sm">{a.title}</p>
                      <span className="text-xs font-bold bg-white bg-opacity-70 px-2 py-1 rounded">
                        {apptStatus.label}
                      </span>
                    </div>
                    <p className="text-xs opacity-90">
                      {new Date(a.appointment_date).toLocaleDateString(
                        'en-US',
                        {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        }
                      )}
                    </p>
                    {a.time && (
                      <p className="text-xs opacity-90 font-semibold">
                        {a.time}
                      </p>
                    )}
                    {a.notes && (
                      <p className="text-xs opacity-75 italic mt-1">{a.notes}</p>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="text-gray-500 text-sm text-center py-4">
                No upcoming appointments
              </p>
            )}
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4 text-gray-800">Quick Links</h2>
          <div className="space-y-2">
            <Link
              href="/dashboard/metrics"
              className="block px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded-lg transition border border-blue-200"
            >
              All Metrics
            </Link>
            <Link
              href="/dashboard/appointments"
              className="block px-4 py-3 bg-green-50 hover:bg-green-100 text-green-700 font-semibold rounded-lg transition border border-green-200"
            >
              Appointments
            </Link>
            <Link
              href="/dashboard/profile"
              className="block px-4 py-3 bg-purple-50 hover:bg-purple-100 text-purple-700 font-semibold rounded-lg transition border border-purple-200"
            >
              Baby Profile
            </Link>
            <Link
              href="/dashboard/settings"
              className="block px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition border border-gray-300"
            >
              Settings
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
