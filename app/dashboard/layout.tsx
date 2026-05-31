'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
      } else {
        setLoading(false)
      }
    }
    checkAuth()
  }, [router])

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <nav className="w-64 bg-white border-r border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Baby & Mom</h1>
        <ul className="space-y-4">
          <li>
            <a href="/dashboard" className="block px-4 py-2 text-gray-700 hover:bg-pink-50 rounded-lg">
              🏠 Home
            </a>
          </li>
          <li>
            <a href="/dashboard/baby" className="block px-4 py-2 text-gray-700 hover:bg-pink-50 rounded-lg">
              👶 Baby
            </a>
          </li>
          <li>
            <a href="/dashboard/mom" className="block px-4 py-2 text-gray-700 hover:bg-pink-50 rounded-lg">
              👩 Mom
            </a>
          </li>
          <li>
            <a href="/dashboard/reminders" className="block px-4 py-2 text-gray-700 hover:bg-pink-50 rounded-lg">
              🔔 Reminders
            </a>
          </li>
          <li>
            <a href="/dashboard/reports" className="block px-4 py-2 text-gray-700 hover:bg-pink-50 rounded-lg">
              📊 Reports
            </a>
          </li>
          <li>
            <a href="/dashboard/family"
          </li>
          <li>
            <a href="/dashboard/metrics" className="block px-4 py-2 text-gray-700 hover:bg-pink-50 rounded-lg">
              📊 Metrics className="block px-4 py-2 text-gray-700 hover:bg-pink-50 rounded-lg">
              👨‍👩‍👧‍👦 Family
            </a>
          </li>
        </ul>
      </nav>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
