'use client'

import { useState, useEffect } from 'react'

interface Reminder {
  id: string
  type: string
  reminder_time: string
  message: string
  enabled: boolean
}

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)
  const [newReminder, setNewReminder] = useState({
    type: 'feed',
    reminder_time: '10:00',
    message: 'Time for baby feed',
    enabled: true,
  })

  useEffect(() => {
    fetchReminders()
  }, [])

  const fetchReminders = async () => {
    try {
      const res = await fetch('/api/reminders')
      const data = await res.json()
      setReminders(data.reminders || [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const addReminder = async () => {
    try {
      const res = await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newReminder),
      })
      const data = await res.json()
      if (data.reminder) {
        setReminders([...reminders, data.reminder])
        setNewReminder({
          type: 'feed',
          reminder_time: '10:00',
          message: 'Time for baby feed',
          enabled: true,
        })
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const toggleReminder = async (id: string, enabled: boolean) => {
    try {
      await fetch('/api/reminders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, enabled: !enabled }),
      })
      setReminders(reminders.map(r => r.id === id ? { ...r, enabled: !enabled } : r))
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const deleteReminder = async (id: string) => {
    try {
      await fetch(`/api/reminders?id=${id}`, { method: 'DELETE' })
      setReminders(reminders.filter(r => r.id !== id))
    } catch (error) {
      console.error('Error:', error)
    }
  }

  if (loading) return <div className="p-6">Loading reminders...</div>

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Reminders</h1>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Add New Reminder</h2>
        
        <div className="grid gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <select
              value={newReminder.type}
              onChange={(e) => setNewReminder({ ...newReminder, type: e.target.value })}
              className="w-full border rounded px-3 py-2"
            >
              <option value="feed">Feed Time</option>
              <option value="appointment">Appointment</option>
              <option value="medication">Medication</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Time</label>
            <input
              type="time"
              value={newReminder.reminder_time}
              onChange={(e) => setNewReminder({ ...newReminder, reminder_time: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Message</label>
            <input
              type="text"
              value={newReminder.message}
              onChange={(e) => setNewReminder({ ...newReminder, message: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <button
            onClick={addReminder}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Add Reminder
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-xl font-semibold">Your Reminders</h2>
        {reminders.length === 0 ? (
          <p className="text-gray-500">No reminders yet</p>
        ) : (
          reminders.map((reminder) => (
            <div key={reminder.id} className="bg-white rounded-lg shadow p-4 flex justify-between items-center">
              <div>
                <div className="font-semibold">{reminder.message}</div>
                <div className="text-sm text-gray-600">{reminder.reminder_time}</div>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => toggleReminder(reminder.id, reminder.enabled)}
                  className={`px-3 py-1 rounded text-sm ${
                    reminder.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100'
                  }`}
                >
                  {reminder.enabled ? 'On' : 'Off'}
                </button>
                <button
                  onClick={() => deleteReminder(reminder.id)}
                  className="px-3 py-1 bg-red-100 text-red-800 rounded text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
