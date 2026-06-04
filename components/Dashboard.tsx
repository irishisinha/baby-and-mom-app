'use client';

interface DashboardProps {
  email: string;
}

export default function Dashboard({ email }: DashboardProps) {
  const handleLogout = () => {
    localStorage.removeItem('app-session');
    window.location.reload();
  };

  return (
    <div className="pb-24 md:pb-0 bg-gradient-to-b from-blue-50 to-white min-h-screen">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">👶 Baby & Mom Care</h1>
          <p className="text-xl text-gray-600">Welcome, <span className="font-semibold text-blue-600">{email}</span>!</p>
        </div>

        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-green-800 mb-4">✅ You're Logged In!</h2>
          <div className="space-y-3 text-green-700">
            <p>✓ Session stored in your browser</p>
            <p>✓ Your email: <span className="font-mono bg-white px-2 py-1 rounded">{email}</span></p>
            <p>✓ Close and reopen the browser - you'll still be logged in!</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="font-bold text-blue-900 mb-4 text-lg">🧪 Test Session Persistence:</h3>
            <ol className="text-blue-800 space-y-2 list-decimal list-inside">
              <li>Note your email above</li>
              <li>Close this browser completely</li>
              <li>Reopen the app URL</li>
              <li>You'll see this dashboard again!</li>
            </ol>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
            <h3 className="font-bold text-purple-900 mb-4 text-lg">📱 WhatsApp Integration:</h3>
            <p className="text-purple-800 mb-4">Send metrics via WhatsApp:</p>
            <ul className="text-purple-800 text-sm space-y-1">
              <li>• "vaccine" → log appointment</li>
              <li>• "30ml breastmilk" → log feeding</li>
              <li>• "diaper change" → log diaper</li>
            </ul>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
