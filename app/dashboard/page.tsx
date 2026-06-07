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
  doctor: string;
  reason: string;
  appointment_date: string;
  appointment_time: string;
  appointee_for?: string;
  notes?: string;
}

interface SummaryStats {
  [key: string]: {
    type: 'count' | 'average';
    value: string;
  };
}

interface DayComparison {
  [key: string]: {
    today: number;
    yesterday: number;
    unit: string;
  };
}

export default function Dashboard() {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [summaryStats, setSummaryStats] = useState<SummaryStats>({});
  const [dayComparison, setDayComparison] = useState<DayComparison>({});
  const [lastWeight, setLastWeight] = useState<{ value: string; date: string } | null>(null);
  const [editingAppointmentId, setEditingAppointmentId] = useState<string | null>(null);
  const [editAppointmentData, setEditAppointmentData] = useState<any>(null);
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
      calculateDayComparison(data as Metric[]);
      calculateLastWeight(data as Metric[]);
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

    const validMetricTypes = [
      'breastmilk',
      'formula',
      'sleep',
      'weight',
      'bath',
      'oil',
      'diaper',
      'potty',
      'fever',
      'vaccine',
      'doctor_notes',
    ];

    const last7Days = metricsData.filter((m) => {
      const metricDate = new Date(m.created_at);
      const isValidMetric = validMetricTypes.includes(m.metric_type);
      const isWithinRange = metricDate >= sevenDaysAgo;
      return isValidMetric && isWithinRange;
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

  const calculateLastWeight = (metricsData: Metric[]) => {
    const weightMetrics = metricsData
      .filter((m) => m.metric_type === 'weight')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    if (weightMetrics.length > 0) {
      setLastWeight({
        value: weightMetrics[0].value.toString(),
        date: weightMetrics[0].created_at
      });
    }
  };

    const calculateDayComparison = (metricsData: Metric[]) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    today.setHours(0, 0, 0, 0);
    yesterday.setHours(0, 0, 0, 0);

    const comparison: DayComparison = {};
    const metricsMap = new Map<string, { today: number[]; yesterday: number[] }>();

    metricsData.forEach((m) => {
      // Skip weight - it's a reading, not additive
      if (m.metric_type === 'weight') return;
      
      const metricDate = new Date(m.created_at);
      metricDate.setHours(0, 0, 0, 0);

      if (
        metricDate.getTime() === today.getTime() ||
        metricDate.getTime() === yesterday.getTime()
      ) {
        if (!metricsMap.has(m.metric_type)) {
          metricsMap.set(m.metric_type, { today: [], yesterday: [] });
        }

        const mapEntry = metricsMap.get(m.metric_type)!;
        const value = parseFloat(m.value.toString());

        if (metricDate.getTime() === today.getTime()) {
          mapEntry.today.push(value);
        } else {
          mapEntry.yesterday.push(value);
        }
      }
    });

    const validMetricTypes = [
      'breastmilk',
      'formula',
      'sleep',
      'weight',
      'bath',
      'oil',
      'diaper',
      'potty',
    ];

    const countMetrics = ['bath', 'oil', 'diaper', 'potty'];

    metricsMap.forEach((values, type) => {
      if (!validMetricTypes.includes(type)) return;

      let todayTotal = 0;
      let yesterdayTotal = 0;

      if (countMetrics.includes(type)) {
        todayTotal = values.today.length;
        yesterdayTotal = values.yesterday.length;
      } else {
        todayTotal = values.today.reduce((a, b) => a + b, 0);
        yesterdayTotal = values.yesterday.reduce((a, b) => a + b, 0);
      }

      const unit =
        type === 'breastmilk' || type === 'formula'
          ? 'ml'
          : type === 'sleep'
          ? 'h'
          : type === 'weight'
          ? 'kg'
          : '';

      comparison[type] = {
        today: todayTotal,
        yesterday: yesterdayTotal,
        unit,
      };
    });

    setDayComparison(comparison);
  };

  const getDateStatus = (createdAt: string): { badge: string; color: string; timestamp: string } => {
    const metricDate = new Date(createdAt);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    metricDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    yesterday.setHours(0, 0, 0, 0);

    const timestamp = new Date(createdAt).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    if (metricDate.getTime() === today.getTime()) {
      return {
        badge: 'Today',
        color: 'bg-green-100 text-green-800 border-l-4 border-green-600',
        timestamp,
      };
    } else if (metricDate.getTime() === yesterday.getTime()) {
      return {
        badge: 'Yesterday',
        color: 'bg-yellow-100 text-yellow-800 border-l-4 border-yellow-600',
        timestamp,
      };
    } else {
      const dateStr = metricDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      return {
        badge: dateStr,
        color: 'bg-gray-100 text-gray-800 border-l-4 border-gray-600',
        timestamp,
      };
    }
  };

  const getAppointmentUrgency = (appointmentDate: string): { label: string; color: string } => {
    const apptDate = new Date(appointmentDate);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    apptDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    tomorrow.setHours(0, 0, 0, 0);

    if (apptDate.getTime() === today.getTime()) {
      return {
        label: 'Today!',
        color: 'bg-red-100 text-red-800 border-l-4 border-red-600',
      };
    } else if (apptDate.getTime() === tomorrow.getTime()) {
      return {
        label: 'Tomorrow',
        color: 'bg-orange-100 text-orange-800 border-l-4 border-orange-600',
      };
    } else {
      const daysUntil = Math.floor(
        (apptDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysUntil > 0) {
        return {
          label: `In ${daysUntil} days`,
          color: 'bg-blue-100 text-blue-800 border-l-4 border-blue-600',
        };
      } else {
        return {
          label: 'Past',
          color: 'bg-gray-100 text-gray-800 border-l-4 border-gray-600',
        };
      }
    }
  };

  const getComparisonColor = (today: number, yesterday: number): string => {
    if (today > yesterday) {
      return 'text-green-600';
    } else if (today < yesterday) {
      return 'text-red-600';
    }
    return 'text-gray-600';
  };

  const getComparisonBgColor = (today: number, yesterday: number): string => {
    if (today > yesterday) {
      return 'bg-green-50 border-green-200';
    } else if (today < yesterday) {
      return 'bg-red-50 border-red-200';
    }
    return 'bg-gray-50 border-gray-200';
  };

  const upcomingAppointments = appointments
    .filter((a) => {
      const apptDate = new Date(a.appointment_date);
      const today = new Date();
      apptDate.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);
      return apptDate.getTime() >= today.getTime();
    })
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
      calculateDayComparison([data[0] as Metric, ...metrics]);
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

  const deleteAppointment = async (id: string) => {
    if (confirm('Delete this appointment?')) {
      try {
        const response = await fetch(`/api/appointments/${id}`, { method: 'DELETE' });
        if (response.ok) {
          setAppointments(appointments.filter(a => a.id !== id));
        }
      } catch (error) {
        console.error('Failed to delete appointment:', error);
      }
    }
  };

  if (loading) {

    const updateAppointment = async (id: string) => {
    if (!editAppointmentData.doctor || !editAppointmentData.appointment_date || !editAppointmentData.appointment_time) {
      alert('Please fill required fields');
      return;
    }
    try {
      const response = await fetch('/api/appointments/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          doctor: editAppointmentData.doctor,
          reason: editAppointmentData.reason,
          appointment_date: editAppointmentData.appointment_date,
          appointment_time: editAppointmentData.appointment_time,
          notes: editAppointmentData.notes
        })
      });
      if (response.ok) {
        setEditingAppointmentId(null);
        setEditAppointmentData(null);
        await fetchAppointments();
      }
    } catch (error) {
      console.error('Error updating:', error);
    }
  };

  const deleteAppointmentFromDashboard = async (id: string) => {
    if (confirm('Delete this appointment?')) {
      try {
        await fetch(`/api/appointments/${id}`, { method: 'DELETE' });
        setAppointments(appointments.filter(a => a.id !== id));
      } catch (error) {
        console.error('Error deleting:', error);
      }
    }
  };

  const fetchAppointments = async () => {
    try {
      const response = await fetch('/api/appointments');
      const result = await response.json();
      if (result.data) setAppointments(result.data);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    }
  };

    return (
      <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-gray-600 text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-4xl font-bold mb-8 text-gray-800">Dashboard</h1>

      {/* 7-Day Summary Stats Grid */}
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

      {/* Today vs Yesterday Comparison Grid */}
      {Object.keys(dayComparison).length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold mb-4 text-gray-800">Today vs Yesterday</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Object.entries(dayComparison).map(([type, data]) => (
              <div
                key={type}
                className={`rounded-lg p-4 border transition-colors ${getComparisonBgColor(
                  data.today,
                  data.yesterday
                )}`}
              >
                <p className="text-xs font-semibold text-gray-600 uppercase mb-3 tracking-wide">
                  {type}
                </p>
                <div className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs text-gray-600 font-medium">Today:</span>
                    <span className="text-lg font-bold text-gray-900">
                      {data.today}
                    </span>
                    {data.unit && (
                      <span className="text-xs text-gray-500">{data.unit}</span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs text-gray-600 font-medium">Yesterday:</span>
                    <span className="text-lg font-bold text-gray-600">
                      {data.yesterday}
                    </span>
                    {data.unit && (
                      <span className="text-xs text-gray-500">{data.unit}</span>
                    )}
                  </div>
                  <div className="pt-2 border-t border-gray-300 mt-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${getComparisonColor(
                        data.today,
                        data.yesterday
                      )}`}>
                        {data.today > data.yesterday && (
                          <>
                            <span>↑</span> +{data.today - data.yesterday} {data.unit}
                          </>
                        )}
                        {data.today < data.yesterday && (
                          <>
                            <span>↓</span> -{data.yesterday - data.today} {data.unit}
                          </>
                        )}
                        {data.today === data.yesterday && (
                          <span>= No change</span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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

        {/* Recent Metrics with Today/Yesterday Badges */}
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
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs font-semibold px-2 py-1 rounded ${dateStatus.color}`}>
                            {dateStatus.badge}
                          </span>
                          <p className="text-xs text-gray-500">{dateStatus.timestamp}</p>
                        </div>
                      </div>
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
                const urgency = getAppointmentUrgency(a.appointment_date);
                return (
                  <div
                    key={a.id}
                    className={`rounded-lg p-3 ${urgency.color}`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{a.doctor}</p>
                        <p className="text-xs opacity-90">{a.reason}</p>
                      </div>
                      <div className="flex gap-1 ml-2">
                        <button
                          onClick={() => alert('Go to Appointments page to edit: /dashboard/appointments')}
                          className="text-xs bg-blue-600 text-white px-2 py-1 rounded font-semibold hover:bg-blue-700"
                          title="Edit"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => deleteAppointment(a.id)}
                          className="text-xs bg-white bg-opacity-70 hover:bg-opacity-100 px-2 py-1 rounded text-red-600"
                          title="Delete"
                        >
                          🗑️
                        </button>
                        <span className="text-xs font-bold bg-white bg-opacity-70 px-2 py-1 rounded whitespace-nowrap">
                          {urgency.label}
                        </span>
                      </div>
                    </div>
                    <div className="text-xs opacity-90">
                      <p>
                        {new Date(a.appointment_date).toLocaleDateString(
                          'en-US',
                          {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          }
                        )}
                      </p>
                      {a.appointment_time && (
                        <p className="font-semibold">{a.appointment_time}</p>
                      )}
                    </div>
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
      </div>
    </div>
  );
}
