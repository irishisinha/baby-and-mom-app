import type { Metadata } from 'next'
import { SessionProvider } from './providers'
import './globals.css'

export const metadata: Metadata = {
  title: 'Baby & Mom Care',
  description: 'Track baby and postpartum mother health via WhatsApp and PWA',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#ffffff" />
        <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no" />
      </head>
      <body className="bg-white text-gray-900">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}
