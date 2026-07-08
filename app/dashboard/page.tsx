'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'
);

interface Metric {
  id: string;
  metric_type: string;
  value: string;
  unit: string;
  created_at: string;
  person_type?: string;
}

interface Appointment {
  id: string;
  title?: string;
  doctor?: string;
  description?: string;
  reason?: string;
  appointment_date: string;
  appointment_time?: string;
  notes?: string;
}

interface SummaryStats {
  [key: string]: { avg: number; count: number; prevWeekAvg?: number; change?: number };
}

interface DayComparison {
  [key: string]: { today: number; yesterday: number; unit: string };
}

function formatLondonDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(d);
}

function formatLondonTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  }).format(d);
}

function getWeightChangeColor(weeklyAvgGainStr: string): string {
  const weeklyAvgGain = parseFloat(weeklyAvgGainStr);
  if (weeklyAvgGain >= 160 && weeklyAvgGain <= 200) return 'text-green-600';
  if (weeklyAvgGain < 160) return 'text-red-600';
  return 'text-orange-600'; // above 200
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [motherMetrics, setMotherMetrics] = useState<Metric[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [summaryStats, setSummaryStats] = useState<SummaryStats>({});
  const [dayComparison, setDayComparison] = useState<DayComparison>({});
  const [lastWeight, setLastWeight] = useState<{ current: string; previous?: string; change?: string; daysSince?: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [editingMetric, setEditingMetric] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [editUnit, setEditUnit] = useState<string>('');

  const FAMILY_ID = 'df3d99a8-f7a2-44cf-bcb4-9c5f3300caa6';
  const BABY_ID = 'e8a7c56c-62c6-442c-94ac-518928c8c07b';

  useEffect(() => {
    fetchData();
    setupSubscriptions();
  }, []);

  const fetchData = async () => {
    try {
      await Promise.all([fetchMetrics(), fetchMotherMetrics(), fetchAppointments(), fetchLastWeight()]);
      setLastUpdate(formatLondonTime(new Date()));
    } finally {
      setLoading(false);
    }
  };

  const fetchMetrics = async () => {
    const { data, error } = await supabase
      .from('baby_metrics')
      .select('*')
      .eq('baby_id', BABY_ID)
      .eq('person_type', 'baby')
      .order('created_at', { ascending: false })
      .limit(100);

    if (data && !error) {
      setMetrics(data as Metric[]);
      calculateSummaryStats(data as Metric[]);
      calculateDayComparison(data as Metric[]);
    }
  };

  const fetchMotherMetrics = async () => {
    const { data, error } = await supabase
      .from('baby_metrics')
      .select('*')
      .eq('family_id', FAMILY_ID)
      .eq('person_type', 'mom')
      .order('created_at', { ascending: false })
      .limit(10);

    if (data && !error) {
      setMotherMetrics(data as Metric[]);
    }
  };

  const fetchLastWeight = async () => {
    const { data, error } = await supabase
      .from('baby_metrics')
      .select('*')
      .eq('baby_id', BABY_ID)
      .eq('person_type', 'baby')
      .eq('metric_type', 'weight')
      .order('created_at', { ascending: false })
      .limit(2);

    if (data && data.length > 0 && !error) {
      const current = data[0];
      const currentDate = formatLondonDate(current.created_at);
      const currentStr = `${current.value} ${current.unit}`;

      const weightData: { current: string; previous?: string; change?: string; daysSince?: number } = {
        current: `${currentStr} (${currentDate})`
      };

      if (data.length > 1) {
        const previous = data[1];
        const previousDate = new Date(previous.created_at);
        const currentDateObj = new Date(current.created_at);
        const daysSince = Math.floor((currentDateObj.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24));
        const changeGrams = parseFloat(current.value) * 1000 - parseFloat(previous.value) * 1000;

        // Calculate weekly average gain (g/week)
        const weeklyAvgGain = daysSince > 0 ? (changeGrams / daysSince) * 7 : 0;

        weightData.previous = `${previous.value} ${previous.unit}`;
        weightData.change = `${weeklyAvgGain.toFixed(0)}g/week`;
        weightData.daysSince = daysSince;
      }

      setLastWeight(weightData);
    }
  };

  const fetchAppointments = async () => {
    try {
      const response = await fetch('/api/appointments');
      const result = await response.json();
      if (result.data && Array.isArray(result.data)) {
        const londonNow = new Date();
        const londonTodayStr = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Europe/London',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }).format(londonNow);
        
        const upcoming = result.data.filter((appt: Appointment) => {
          const apptDateStr = appt.appointment_date.split('T')[0];
          return apptDateStr >= londonTodayStr;
        }).sort((a: Appointment, b: Appointment) => a.appointment_date.localeCompare(b.appointment_date));
        
        setAppointments(upcoming);
      }
    } catch (error) {
      console.error('Failed to fetch appointments:', error);
    }
  };

  const calculateSummaryStats = (metricsData: Metric[]) => {
    const isoLondonDate = (d: Date | string) => new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(typeof d === 'string' ? new Date(d) : d);

    const sevenDaysAgoStr = isoLondonDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    const fourteenDaysAgoStr = isoLondonDate(new Date(Date.now() - 14 * 24 * 60 * 60 * 1000));

    const last7Days = metricsData.filter((m) => isoLondonDate(m.created_at) >= sevenDaysAgoStr);
    const prev7Days = metricsData.filter((m) => {
      const dateStr = isoLondonDate(m.created_at);
      return dateStr >= fourteenDaysAgoStr && dateStr < sevenDaysAgoStr;
    });

    const stats: SummaryStats = {};
    const DAILY_TOTAL_TYPES = ['formula', 'breastmilk'];

    const calculateMetricStats = (entries: Metric[]) => {
      const grouped = entries.reduce((acc, m) => {
        acc[m.metric_type] = acc[m.metric_type] || [];
        acc[m.metric_type].push(m);
        return acc;
      }, {} as Record<string, Metric[]>);

      const result: SummaryStats = {};
      Object.entries(grouped).forEach(([type, typeEntries]) => {
        if (DAILY_TOTAL_TYPES.includes(type)) {
          const dailyTotals: Record<string, number> = {};
          typeEntries.forEach((m) => {
            const day = formatLondonDate(m.created_at);
            dailyTotals[day] = (dailyTotals[day] || 0) + parseFloat(m.value);
          });
          const totals = Object.values(dailyTotals);
          const avg = totals.reduce((a, b) => a + b, 0) / totals.length;
          result[type] = { avg: parseFloat(avg.toFixed(2)), count: totals.length };
        } else {
          const values = typeEntries.map((m) => parseFloat(m.value));
          const avg = values.reduce((a, b) => a + b, 0) / values.length;
          result[type] = { avg: parseFloat(avg.toFixed(2)), count: values.length };
        }
      });
      return result;
    };

    const currentWeekStats = calculateMetricStats(last7Days);
    const prevWeekStats = calculateMetricStats(prev7Days);

    // Merge and calculate week-over-week change
    Object.entries(currentWeekStats).forEach(([type, data]) => {
      stats[type] = { ...data };
      if (prevWeekStats[type]) {
        stats[type].prevWeekAvg = prevWeekStats[type].avg;
        stats[type].change = parseFloat((data.avg - prevWeekStats[type].avg).toFixed(2));
      }
    });

    setSummaryStats(stats);
  };

  const calculateDayComparison = (metricsData: Metric[]) => {
    const now = new Date();
    const todayStr = now.toLocaleDateString('en-CA', { timeZone: 'Europe/London' });
    const yesterdayDate = new Date(now);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = yesterdayDate.toLocaleDateString('en-CA', { timeZone: 'Europe/London' });

    const comparison: DayComparison = {};
    const nonAdditiveMetrics = ["weight"];
    const alwaysShowMetrics = ['formula', 'breastmilk'];

    metricsData.forEach((m) => {
      if (nonAdditiveMetrics.includes(m.metric_type)) return;

      const metricDate = new Date(m.created_at).toLocaleDateString('en-CA', { timeZone: 'Europe/London' });
      const value = parseFloat(m.value);

      if (metricDate === todayStr) {
        comparison[m.metric_type] = comparison[m.metric_type] || { today: 0, yesterday: 0, unit: m.unit };
        comparison[m.metric_type].today += value;
      } else if (metricDate === yesterdayStr) {
        comparison[m.metric_type] = comparison[m.metric_type] || { today: 0, yesterday: 0, unit: m.unit };
        comparison[m.metric_type].yesterday += value;
      }
    });

    // Ensure formula and breastmilk always show, even if 0
    alwaysShowMetrics.forEach((metric) => {
      if (!comparison[metric]) {
        comparison[metric] = { today: 0, yesterday: 0, unit: 'ml' };
      }
    });

    setDayComparison(comparison);
  };

  const setupSubscriptions = () => {
    let metricsTimeout: ReturnType<typeof setTimeout> | null = null;

    const metricsSubscription = supabase
      .channel('baby_metrics_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'baby_metrics', filter: `baby_id=eq.${BABY_ID}` },
        () => {
          // Debounce rapid successive changes (inserts, updates, deletes)
          if (metricsTimeout) clearTimeout(metricsTimeout);
          metricsTimeout = setTimeout(() => {
            fetchMetrics();
            fetchMotherMetrics();
            fetchLastWeight();
            setLastUpdate(formatLondonTime(new Date()));
          }, 500);
        }
      )
      .subscribe();

    const appointmentsSubscription = supabase
      .channel('appointments_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
        fetchAppointments();
        setLastUpdate(formatLondonTime(new Date()));
      })
      .subscribe();

    return () => {
      metricsSubscription.unsubscribe();
      appointmentsSubscription.unsubscribe();
    };
  };

  const editMetric = (metric: Metric) => {
    setEditingMetric(metric.id);
    setEditValue(metric.value);
    setEditUnit(metric.unit);
  };

  const saveMetricEdit = async (id: string) => {
    if (!editValue) {
      alert('Value required');
      return;
    }
    try {
      const { error } = await supabase
        .from('baby_metrics')
        .update({ value: editValue, unit: editUnit })
        .eq('id', id);

      if (!error) {
        setEditingMetric(null);
        fetchMetrics();
        setLastUpdate(formatLondonTime(new Date()));
      } else {
        alert('Error updating metric');
      }
    } catch (error) {
      alert('Error updating metric');
    }
  };

  const deleteMetric = async (id: string) => {
    if (!confirm('Delete this metric?')) return;
    try {
      await supabase.from('baby_metrics').delete().eq('id', id);
      setMetrics(metrics.filter((m) => m.id !== id));
      calculateSummaryStats(metrics.filter((m) => m.id !== id));
      calculateDayComparison(metrics.filter((m) => m.id !== id));
      setLastUpdate(formatLondonTime(new Date()));
    } catch (error) {
      alert('Error deleting metric');
    }
  };

  const deleteAppointment = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"?`)) return;
    try {
      await fetch(`/api/appointments/${id}`, { method: 'DELETE' });
      setAppointments(appointments.filter((a) => a.id !== id));
      setLastUpdate(formatLondonTime(new Date()));
    } catch (error) {
      alert('Error deleting appointment');
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    fetchData();
  };

  if (loading) return <div className="p-4 text-center">Loading...</div>;

  return (
    <div className="pb-24 md:pb-0 p-4 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-xs text-gray-500 mt-1">Last updated: {lastUpdate} (London Time)</p>
        </div>
        <button onClick={handleRefresh} className="bg-blue-600 text-white px-4 py-2 rounded font-semibold hover:bg-blue-700">
          🔄 Refresh
        </button>
      </div>

      {/* Today vs Yesterday */}
      {Object.keys(dayComparison).length > 0 && (
        <div className="bg-white rounded-lg p-6 mb-6 shadow">
          <h2 className="text-2xl font-bold mb-4">Today vs Yesterday (Total)</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(dayComparison).map(([type, data]) => (
              <div key={type} className="bg-gradient-to-br from-red-50 to-pink-50 rounded-lg p-4 border border-red-200">
                <p className="text-sm text-gray-600 capitalize">{type}</p>
                <p className="text-2xl font-bold text-blue-600">{data.today.toFixed(1)}</p>
                <p className="text-xs text-gray-500 mt-1">vs {data.yesterday.toFixed(1)} yesterday</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7-Day Average Summary */}
      {Object.keys(summaryStats).length > 0 && (
        <div className="bg-white rounded-lg p-6 mb-6 shadow">
          <h2 className="text-2xl font-bold mb-4">Last 7 Days (Average)</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(summaryStats).map(([type, data]) => (
              <div key={type} className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
                <p className="text-sm text-gray-600 capitalize">{type}</p>
                <p className="text-2xl font-bold text-green-600">{data.avg}</p>
                <p className="text-xs text-gray-500 mt-1">
                  avg ({data.count} {['formula', 'breastmilk'].includes(type) ? 'days' : 'entries'})
                </p>
                {data.change !== undefined && (
                  <p className={`text-xs font-semibold mt-2 ${data.change > 0 ? 'text-green-600' : data.change < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                    {data.change > 0 ? '+' : ''}{data.change} vs last week
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Last Weight Reading */}
      {lastWeight && (
        <div className="bg-white rounded-lg p-6 mb-6 shadow">
          <h2 className="text-2xl font-bold mb-4">Last Weight Reading</h2>
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
            <p className="text-2xl font-bold text-purple-600">{lastWeight.current}</p>
            {lastWeight.change && (
              <div className="mt-3 pt-3 border-t border-purple-200">
                <p className="text-sm text-gray-600">Previous: {lastWeight.previous}</p>
                <p className={`text-lg font-semibold ${getWeightChangeColor(lastWeight.change)}`}>
                  Weekly Avg: {lastWeight.change} ({lastWeight.daysSince} days since last)
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mother / Shiva */}
      <div className="bg-white rounded-lg p-6 mb-6 shadow">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">👩 Mother / Shiva</h2>
          <Link href="/dashboard/mother">
            <button className="text-blue-600 hover:text-blue-700 font-semibold">View All →</button>
          </Link>
        </div>
        {motherMetrics.length === 0 ? (
          <p className="text-gray-500">No wellness activity</p>
        ) : (
          <div className="space-y-2">
            {motherMetrics.map((metric) => (
              <div
                key={metric.id}
                className="flex justify-between items-center py-3 px-4 bg-pink-50 rounded border border-pink-200"
              >
                <div className="flex-1">
                  <span className="capitalize font-medium">
                    {metric.metric_type.replace('wellness_', '').replace(/_/g, ' ')}
                  </span>
                  <span className="text-gray-600 ml-2">{metric.value} {metric.unit}</span>
                </div>
                <span className="text-xs text-gray-400">{formatLondonTime(metric.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Appointments */}
      <div className="bg-white rounded-lg p-6 mb-6 shadow">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Appointments</h2>
          <Link href="/dashboard/appointments">
            <button className="text-blue-600 hover:text-blue-700 font-semibold">View All →</button>
          </Link>
        </div>
        {appointments.length === 0 ? (
          <p className="text-gray-500">No appointments</p>
        ) : (
          <div className="space-y-3">
            {appointments.map((appt) => (
              <div key={appt.id} className="border-l-4 border-blue-500 bg-blue-50 p-4 rounded flex justify-between items-start">
                <div className="flex-1">
                  <p className="font-bold text-blue-900">{appt.title || appt.doctor}</p>
                  <p className="text-sm text-gray-600">{appt.description || appt.reason}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatLondonDate(appt.appointment_date)} {appt.appointment_time && `at ${appt.appointment_time}`}
                  </p>
                  {appt.notes && <p className="text-xs bg-yellow-100 p-1 rounded mt-1">{appt.notes}</p>}
                </div>
                <div className="flex gap-2 ml-2">
                  <Link href={`/dashboard/appointments?edit=${appt.id}`}>
                    <button className="text-blue-600 hover:text-blue-700 font-semibold text-sm hover:bg-blue-100 px-2 py-1 rounded" title="Edit appointment">
                      ✏️
                    </button>
                  </Link>
                  <button
                    onClick={() => deleteAppointment(appt.id, appt.title || appt.doctor || 'Appointment')}
                    className="text-red-600 hover:text-red-700 font-semibold text-sm hover:bg-red-100 px-2 py-1 rounded"
                    title="Delete appointment"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Metrics with Edit */}
      <div className="bg-white rounded-lg p-6 shadow">
        <h2 className="text-2xl font-bold mb-4">Recent Activity</h2>
        {metrics.length === 0 ? (
          <p className="text-gray-500">No activity</p>
        ) : (
          <div className="space-y-2">
            {metrics.slice(0, 15).map((metric) => (
              <div key={metric.id}>
                {editingMetric === metric.id ? (
                  <div className="flex gap-2 items-center py-3 px-4 bg-yellow-50 rounded border border-yellow-300">
                    <span className="capitalize font-medium text-sm flex-1">{metric.metric_type}</span>
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="border rounded px-2 py-1 text-sm w-20"
                      placeholder="Value"
                    />
                    <input
                      type="text"
                      value={editUnit}
                      onChange={(e) => setEditUnit(e.target.value)}
                      className="border rounded px-2 py-1 text-sm w-16"
                      placeholder="Unit"
                    />
                    <button
                      onClick={() => saveMetricEdit(metric.id)}
                      className="bg-green-600 text-white px-2 py-1 rounded text-sm font-semibold hover:bg-green-700"
                    >
                      ✓
                    </button>
                    <button
                      onClick={() => setEditingMetric(null)}
                      className="bg-gray-400 text-white px-2 py-1 rounded text-sm hover:bg-gray-500"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="flex justify-between items-center py-3 px-4 bg-gray-50 rounded border border-gray-200 hover:bg-gray-100">
                    <div className="flex-1">
                      <span className="capitalize font-medium">{metric.metric_type}</span>
                      <span className="text-gray-600 ml-2">{metric.value} {metric.unit}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400">{formatLondonTime(metric.created_at)}</span>
                      <button
                        onClick={() => editMetric(metric)}
                        className="text-blue-600 hover:text-blue-700 text-sm hover:bg-blue-100 px-2 py-1 rounded"
                        title="Edit metric"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => deleteMetric(metric.id)}
                        className="text-red-600 hover:text-red-700 text-sm hover:bg-red-100 px-2 py-1 rounded"
                        title="Delete metric"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}




