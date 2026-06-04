'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

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

interface NavLink {
  href: string;
  label: string;
  icon: string;
}

const navLinks: NavLink[] = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/dashboard/appointments', label: 'Appointments', icon: '📅' },
  { href: '/dashboard/metrics', label: 'Metrics', icon: '📈' },
  { href: '/dashboard/baby', label: 'Baby Profile', icon: '👶' },
  { href: '/dashboard/family', label: 'Family', icon: '👨‍👩‍👧' },
];

export default function Dashboard() {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [summaryStats, setSummaryStats] = useState<SummaryStats>({});
  const [dayComparison, setDayComparison] = useState<DayComparison>({});
  const [loading, setLoading] = useState(true);
  const [newMetric, setNewMetric] = useState({
    type: 'breastmilk',
    value: '',
    unit: 'ml',
  });

  useEffect(() => {
    fetchData();
  }, []);

  // Close sidebar when route changes
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

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

  const calculateDayComparison = (metricsData: Metric[]) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    today.setHours(0, 0, 0, 0);
    yesterday.setHours(0, 0, 0, 0);

    const comparison: DayComparison = {};
    const metricsMap = new Map<string, { today: number[]; yesterday: number[] }>();

    metricsData.forEach((m) => {
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

  const isActive = (href: string) => pathname === href;

  if (loading) {
    return (
      <div className="px-3 py-4 sm:p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-gray-600 text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 md:hidden z-30"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:relative w-64 h-screen bg-blue-50 border-r border-blue-200 transition-transform duration-300 z-40 md:z-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Close Button (Mobile Only) */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-blue-200">
          <h2 className="text-lg font-bold text-blue-900">Menu</h2>
          <button
            onClick={() => setSidebarOpen(false)}
            className="text-gray-600 hover:text-gray-900 text-xl font-bold"
            aria-label="Close sidebar"
          >
            ✗
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="p-4 md:p-6 space-y-2">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
                isActive(link.href)
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-blue-900 hover:bg-blue-100'
              }`}
            >
              <span className="text-xl">{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar with Hamburger */}
        <div className="md:hidden flex items-center gap-4 px-4 py-4 bg-white border-b border-gray-200">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-2xl font-bold text-gray-700 hover:text-gray-900"
            aria-label="Open sidebar"
          >
            ☰
          </button>
          <h1 className="text-xl font-bold text-gray-800">Baby & Mom</h1>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto px-3 py-4 sm:p-6 bg-gray-50">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 sm:mb-6 lg:mb-8 text-gray-800 hidden md:block">Dashboard</h1>

          {/* 7-Day Summary Stats Grid */}
          {Object.keys(summaryStats).length > 0 && (
            <div className="bg-white rounded-lg shadow p-3 sm:p-6 mb-4 sm:mb-8">
              <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 text-gray-800">7-Day Summary</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                {Object.entries(summaryStats).map(([type, stat]) => (
                  <div
                    key={type}
                    className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-3 sm:p-4 border border-blue-200 shadow-sm"
                  >
                    <p className="text-xs font-semibold text-gray-600 uppercase mb-2 tracking-wide">
                      {type}
                    </p>
                    <p className="text-base sm:text-lg font-bold text-blue-900">{stat.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Today vs Yesterday Comparison Grid */}
          {Object.keys(dayComparison).length > 0 && (
            <div className="bg-white rounded-lg shadow p-3 sm:p-6 mb-4 sm:mb-8">
              <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 text-gray-800">Today vs Yesterday</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {Object.entries(dayComparison).map(([type, data]) => (
                  <div
                    key={type}
                    className={`rounded-lg p-3 sm:p-4 border transition-colors ${getComparisonBgColor(
                      data.today,
                      data.yesterday
                    )}`}
                  >
                    <p className="text-xs font-semibold text-gray-600 uppercase mb-2 sm:mb-3 tracking-wide">
                      {type}
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs text-gray-600 font-medium">Today:</span>
                        <span className="text-base sm:text-lg font-bold text-gray-900">
                          {data.today}
                        </span>
                        {data.unit && (
                          <span className="text-xs text-gray-500">{data.unit}</span>
                        )}
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs text-gray-600 font-medium">Yesterday:</span>
                        <span className="text-base sm:text-lg font-bold text-gray-600">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Quick Add Metric Form */}
            <div className="bg-white rounded-lg shadow p-3 sm:p-6">
              <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 text-gray-800">Quick Add</h2>
              <form onSubmit={handleQuickAdd} className="space-y-2 sm:space-y-3">
                <select
                  value={newMetric.type}
                  onChange={(e) =>
                    setNewMetric({ ...newMetric, type: e.target.value })
                  }
                  className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm sm:text-base text-gray-800"
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
                  className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                />

                <input
                  type="text"
                  value={newMetric.unit}
                  onChange={(e) =>
                    setNewMetric({ ...newMetric, unit: e.target.value })
                  }
                  placeholder="Unit (ml, oz, etc.)"
                  className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                />

                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 sm:py-2 px-3 sm:px-4 rounded-lg transition duration-200 text-sm sm:text-base min-h-[44px] flex items-center justify-center"
                >
                  Add Metric
                </button>
              </form>
            </div>

            {/* Recent Metrics with Today/Yesterday Badges */}
            <div className="bg-white rounded-lg shadow p-3 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3 sm:mb-4 gap-2 sm:gap-0">
                <h2 className="text-lg sm:text-xl font-bold text-gray-800">Recent Metrics</h2>
                <Link
                  href="/dashboard/metrics"
                  className="text-blue-600 hover:text-blue-800 text-xs sm:text-sm font-semibold"
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
                        className="border border-gray-200 rounded-lg p-2 sm:p-3 bg-gray-50 hover:bg-gray-100 transition"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <p className="font-semibold text-xs sm:text-sm text-gray-800">
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
                            className="flex-1 px-2 py-1 sm:py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition min-h-[44px] sm:min-h-auto flex items-center justify-center"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(m.id)}
                            className="flex-1 px-2 py-1 sm:py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition min-h-[44px] sm:min-h-auto flex items-center justify-center"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-gray-500 text-xs sm:text-sm text-center py-4">
                    No metrics yet
                  </p>
                )}
              </div>
            </div>

            {/* Next Appointments */}
            <div className="bg-white rounded-lg shadow p-3 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3 sm:mb-4 gap-2 sm:gap-0">
                <h2 className="text-lg sm:text-xl font-bold text-gray-800">Next Appointments</h2>
                <Link
                  href="/dashboard/appointments"
                  className="text-blue-600 hover:text-blue-800 text-xs sm:text-sm font-semibold"
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
                        className={`rounded-lg p-2 sm:p-3 ${urgency.color}`}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <div className="flex-1">
                            <p className="font-semibold text-xs sm:text-sm">{a.doctor}</p>
                            <p className="text-xs opacity-90">{a.reason}</p>
                          </div>
                          <span className="text-xs font-bold bg-white bg-opacity-70 px-2 py-1 rounded ml-2 whitespace-nowrap">
                            {urgency.label}
                          </span>
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
                  <p className="text-gray-500 text-xs sm:text-sm text-center py-4">
                    No upcoming appointments
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
