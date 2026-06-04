'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { PILOT_FAMILY_ID, PILOT_BABY_ID } from '@/lib/pilot-user';

interface WellnessEntry {
  id: string;
  metric_type: string;
  value: string;
  person_type: string;
  notes: string;
  created_at: string;
}

interface WellnessSummary {
  mood: { [key: string]: number };
  energy: number[];
  pain: number[];
  recovery: { [key: string]: number };
  exercise: number;
  medication: number;
  health_checks: number;
}

export default function MotherWellnessPage() {
  const [wellnessEntries, setWellnessEntries] = useState<WellnessEntry[]>([]);
  const [todayEntries, setTodayEntries] = useState<WellnessEntry[]>([]);
  const [weekEntries, setWeekEntries] = useState<WellnessEntry[]>([]);
  const [summary, setSummary] = useState<WellnessSummary>({
    mood: {},
    energy: [],
    pain: [],
    recovery: {},
    exercise: 0,
    medication: 0,
    health_checks: 0,
  });
  const [alerts, setAlerts] = useState<string[]>([]);
  const [form, setForm] = useState({
    metric_type: 'wellness_mood',
    value: '',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWellnessData();
  }, []);

  const getUTCDate = (daysOffset = 0) => {
    const today = new Date();
    today.setUTCDate(today.getUTCDate() - daysOffset);
    return today.toISOString().split('T')[0];
  };

  const fetchWellnessData = async () => {
    try {
      const { data: allData } = await supabase
        .from('baby_metrics')
        .select('*')
        .eq('family_id', PILOT_FAMILY_ID)
        .eq('person_type', 'mom')
        .like('metric_type', 'wellness_%')
        .order('created_at', { ascending: false })
        .limit(100);

      if (allData) {
        setWellnessEntries(allData);

        const today = getUTCDate();
        const weekAgo = getUTCDate(7);

        const today_entries = allData.filter(
          (e) => e.created_at.split('T')[0] === today
        );
        const week_entries = allData.filter(
          (e) => e.created_at.split('T')[0] >= weekAgo
        );

        setTodayEntries(today_entries);
        setWeekEntries(week_entries);

        calculateSummary(week_entries);
        generateAlerts(week_entries);
      }
      setLoading(false);
    } catch (err) {
      console.error('Error:', err);
      setLoading(false);
    }
  };

  const calculateSummary = (entries: WellnessEntry[]) => {
    const result: WellnessSummary = {
      mood: {},
      energy: [],
      pain: [],
      recovery: {},
      exercise: 0,
      medication: 0,
      health_checks: 0,
    };

    entries.forEach((entry) => {
      const metricType = entry.metric_type.replace('wellness_', '');
      const value = entry.value;

      switch (metricType) {
        case 'mood':
          result.mood[value] = (result.mood[value] || 0) + 1;
          break;
        case 'energy':
          result.energy.push(parseInt(value) || 0);
          break;
        case 'pain':
          result.pain.push(parseInt(value) || 0);
          break;
        case 'recovery':
          result.recovery[value] = (result.recovery[value] || 0) + 1;
          break;
        case 'exercise':
          result.exercise += parseInt(value) || 0;
          break;
        case 'medication':
          result.medication++;
          break;
        case 'health_check':
          result.health_checks++;
          break;
      }
    });

    setSummary(result);
  };

  const generateAlerts = (entries: WellnessEntry[]) => {
    const alertList: string[] = [];

    const highPain = entries.filter((e) => {
      if (e.metric_type === 'wellness_pain') {
        return parseInt(e.value) > 7;
      }
      return false;
    });
    if (highPain.length > 0) {
      alertList.push('High pain levels detected this week');
    }

    const lowEnergy = entries.filter((e) => {
      if (e.metric_type === 'wellness_energy') {
        return parseInt(e.value) < 3;
      }
      return false;
    });
    if (lowEnergy.length > 0) {
      alertList.push('Energy levels very low on some days');
    }

    const poorRecovery = entries.filter(
      (e) =>
        e.metric_type === 'wellness_recovery' &&
        (e.value.toLowerCase() === 'poor' ||
          e.value.toLowerCase() === 'struggling')
    );
    if (poorRecovery.length > 0) {
      alertList.push('Recovery status marked as poor/struggling');
    }

    setAlerts(alertList);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.metric_type || !form.value) return;

    const metricType = form.metric_type;
    const { error } = await supabase.from('baby_metrics').insert({
      family_id: PILOT_FAMILY_ID,
      baby_id: PILOT_BABY_ID,
      metric_type: metricType,
      value: form.value,
      unit: metricType.replace('wellness_', ''),
      person_type: 'mom',
      notes: `Mom: ${metricType.replace('wellness_', '')} logged`,
      created_at: new Date().toISOString(),
    });

    if (!error) {
      setForm({ metric_type: 'wellness_mood', value: '' });
      fetchWellnessData();
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from('baby_metrics').delete().eq('id', id);
    fetchWellnessData();
  };

  const getEmoji = (metricType: string) => {
    const emojis: any = {
      mood: '😊',
      energy: '⚡',
      pain: '🤕',
      recovery: '💪',
      medication: '💊',
      exercise: '🏃',
      health_check: '🏥',
      sleep: '😴',
    };
    const type = metricType.replace('wellness_', '');
    return emojis[type] || '📋';
  };

  const getMostCommonMood = () => {
    if (Object.keys(summary.mood).length === 0) return 'N/A';
    return Object.entries(summary.mood).sort((a, b) => b[1] - a[1])[0][0];
  };

  const getAverageEnergy = () => {
    if (summary.energy.length === 0) return 0;
    return (
      summary.energy.reduce((a, b) => a + b, 0) / summary.energy.length
    ).toFixed(1);
  };

  const getAveragePain = () => {
    if (summary.pain.length === 0) return 0;
    return (summary.pain.reduce((a, b) => a + b, 0) / summary.pain.length).toFixed(1);
  };

  const getTodayAverageEnergy = () => {
    const energyEntries = todayEntries.filter(
      (e) => e.metric_type === 'wellness_energy'
    );
    if (energyEntries.length === 0) return 0;
    return (
      energyEntries.reduce((sum, e) => sum + (parseInt(e.value) || 0), 0) /
      energyEntries.length
    ).toFixed(1);
  };

  const getTodayAveragePain = () => {
    const painEntries = todayEntries.filter(
      (e) => e.metric_type === 'wellness_pain'
    );
    if (painEntries.length === 0) return 0;
    return (
      painEntries.reduce((sum, e) => sum + (parseInt(e.value) || 0), 0) /
      painEntries.length
    ).toFixed(1);
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto pb-24 md:pb-6">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Mother Wellness Dashboard
        </h1>
        <p className="text-gray-600">Track and monitor wellness metrics</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Mood</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {getMostCommonMood()}
              </p>
            </div>
            <span className="text-3xl">😊</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Avg Energy</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {getAverageEnergy()}/10
              </p>
            </div>
            <span className="text-3xl">⚡</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Avg Pain</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {getAveragePain()}/10
              </p>
            </div>
            <span className="text-3xl">🤕</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Medications</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {summary.medication}
              </p>
            </div>
            <span className="text-3xl">💊</span>
          </div>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <h3 className="font-bold text-yellow-900 mb-2">Health Alerts</h3>
          {alerts.map((alert, idx) => (
            <p key={idx} className="text-sm text-yellow-800 mb-1">
              {alert}
            </p>
          ))}
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">Today vs Weekly Average</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded p-4">
            <p className="text-gray-600 text-sm font-medium mb-2">Energy Level</p>
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-1">Today</p>
                <p className="text-2xl font-bold text-blue-600">
                  {getTodayAverageEnergy()}
                </p>
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-1">Weekly Avg</p>
                <p className="text-2xl font-bold text-gray-600">
                  {getAverageEnergy()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-red-50 rounded p-4">
            <p className="text-gray-600 text-sm font-medium mb-2">Pain Level</p>
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-1">Today</p>
                <p className="text-2xl font-bold text-red-600">
                  {getTodayAveragePain()}
                </p>
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-1">Weekly Avg</p>
                <p className="text-2xl font-bold text-gray-600">
                  {getAveragePain()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 rounded p-4">
            <p className="text-gray-600 text-sm font-medium mb-2">Recovery</p>
            <div>
              <p className="text-xs text-gray-500 mb-2">Status Distribution</p>
              {Object.entries(summary.recovery).length > 0 ? (
                Object.entries(summary.recovery).map(([status, count]) => (
                  <p key={status} className="text-sm text-gray-700">
                    {status}: <span className="font-bold">{count}</span>x
                  </p>
                ))
              ) : (
                <p className="text-sm text-gray-500">No data</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">Quick Log Wellness Update</h2>
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <select
              value={form.metric_type}
              onChange={(e) =>
                setForm({ ...form, metric_type: e.target.value })
              }
              className="border border-gray-300 rounded px-3 py-2 bg-white font-medium"
            >
              <option value="wellness_mood">Mood</option>
              <option value="wellness_energy">Energy (1-10)</option>
              <option value="wellness_pain">Pain (1-10)</option>
              <option value="wellness_recovery">Recovery</option>
              <option value="wellness_exercise">Exercise (mins)</option>
              <option value="wellness_medication">Medication</option>
              <option value="wellness_health_check">Health Check</option>
              <option value="wellness_sleep">Sleep (hours)</option>
            </select>

            <input
              type="text"
              placeholder="Value (e.g., happy, 8, good)"
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
              className="border border-gray-300 rounded px-3 py-2"
              required
            />

            <button
              type="submit"
              className="bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded px-4 py-2 font-semibold hover:shadow-lg transition"
            >
              Log Update
            </button>
          </div>
        </form>
      </div>

      <div>
        <h2 className="text-xl font-bold mb-4">Recent Wellness Log</h2>
        <div className="space-y-3">
          {wellnessEntries.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No wellness entries yet</p>
          ) : (
            wellnessEntries.slice(0, 10).map((entry) => {
              const metricType = entry.metric_type.replace('wellness_', '');
              return (
                <div
                  key={entry.id}
                  className="bg-white rounded-lg shadow p-4 border-l-4 border-pink-500 hover:shadow-md transition"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-2xl">
                          {getEmoji(entry.metric_type)}
                        </span>
                        <div>
                          <p className="font-bold text-lg capitalize">
                            {metricType.replace(/_/g, ' ')}: {entry.value}
                          </p>
                          {entry.notes && (
                            <p className="text-gray-600 text-sm">
                              {entry.notes}
                            </p>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 ml-11 mt-1">
                        {new Date(entry.created_at).toLocaleString('en-GB', {
                          hour: '2-digit',
                          minute: '2-digit',
                          day: '2-digit',
                          month: '2-digit',
                        })}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="text-red-500 hover:text-red-700 text-sm font-semibold ml-4"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-8">
        <p className="text-sm text-blue-800">
          <strong>WhatsApp Quick Commands:</strong>
          <br />
          "mom mood happy" • "mom energy 7" • "mom pain 3" • "mom recovery good"
          • "mom medication" • "mom exercise 30 mins"
        </p>
      </div>
    </div>
  );
}
