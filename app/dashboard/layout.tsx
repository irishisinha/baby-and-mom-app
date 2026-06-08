'use client'
import Link from 'next/link'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { FirebaseNotifications } from '@/app/components/FirebaseNotifications'
import { UpdateNotification } from '@/app/components/UpdateNotification'

const TopNavigation = () => {
  const pathname = usePathname()

  const navItems = [
    { label: 'Home', href: '/dashboard', paths: ['/dashboard', '/dashboard/'] },
    { label: 'Appointments', href: '/dashboard/appointments', paths: ['/dashboard/appointments'] },
    { label: 'Metrics', href: '/dashboard/metrics', paths: ['/dashboard/metrics'] },
    { label: 'Family', href: '/dashboard/family', paths: ['/dashboard/family'] },
    { label: 'Mother', href: '/dashboard/mother', paths: ['/dashboard/mother'] },
  ]

  const isActive = (paths: string[]) => paths.some(p => pathname === p || pathname.startsWith(p + '/'))

  return (
    <nav className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 h-16 z-40">
      <div className="flex items-center justify-between h-full px-6">
        <div className="flex items-center">
          <Link href="/dashboard"><h1 className="text-lg md:text-xl font-bold text-gray-900 cursor-pointer hover:text-blue-600">👶 Shiva & Jaian Care</h1></Link>
        </div>

        <div className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={`text-sm font-medium transition-colors ${
                isActive(item.paths)
                  ? 'text-blue-600 border-b-2 border-blue-600 pb-0.5'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {item.label}
            </a>
          ))}
        </div>
      </div>
    </nav>
  )
}

const BottomNavigation = () => {
  const pathname = usePathname()

  const navItems = [
    { label: 'Home', href: '/dashboard', icon: '🏠', paths: ['/dashboard', '/dashboard/'] },
    { label: 'Appointments', href: '/dashboard/appointments', icon: '📅', paths: ['/dashboard/appointments'] },
    { label: 'Metrics', href: '/dashboard/metrics', icon: '📊', paths: ['/dashboard/metrics'] },
    { label: 'Family', href: '/dashboard/family', icon: '👨‍👩‍👧', paths: ['/dashboard/family'] },
    { label: 'Mother', href: '/dashboard/mother', icon: '👩', paths: ['/dashboard/mother'] },
  ]

  const isActive = (paths: string[]) => paths.some(p => pathname === p || pathname.startsWith(p + '/'))

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 h-20 z-40">
      <div className="flex items-center justify-around h-full">
        {navItems.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center py-2 px-4 transition-colors ${
              isActive(item.paths)
                ? 'text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="text-xs font-medium">{item.label}</span>
          </a>
        ))}
      </div>
    </nav>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const sessionData = localStorage.getItem('app-session')
    
    if (!sessionData) {
      const session = {
        email: 'parent@example.com',
        loggedInAt: new Date().toISOString(),
        token: Math.random().toString(36).substring(7)
      }
      localStorage.setItem('app-session', JSON.stringify(session))
    }
    
    setLoading(false)
  }, [])

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <FirebaseNotifications />
      <UpdateNotification />
      <TopNavigation />
      <main className="flex-1 overflow-y-auto pt-16 pb-24 md:pb-0">
        {children}
      </main>
      <BottomNavigation />
    </div>
  )
}





