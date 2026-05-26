export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50 p-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Baby & Mom Care</h1>
        <p className="text-gray-600 mb-6">WhatsApp + PWA tracking for family caregivers</p>
        <a
          href="/login"
          className="inline-block px-6 py-3 bg-pink-500 text-white rounded-lg font-medium hover:bg-pink-600 transition"
        >
          Get Started
        </a>
      </div>
    </main>
  )
}
