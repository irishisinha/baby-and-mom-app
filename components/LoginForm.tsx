'use client';

import { useState } from 'react';

interface LoginFormProps {
  onLogin: (email: string) => void;
}

export default function LoginForm({ onLogin }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const validEmails = [
    'rish.sinha@gmail.com',
    'rishisinha411@gmail.com',
    'shiva.malhotra1986@gmail.com',
    'shiva.malhotra@yahoo.com',
    'saritamalhotra88@gmail.com'
  ];

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!email) {
        throw new Error('Please enter your email');
      }

      if (!validEmails.includes(email)) {
        throw new Error('Email not authorized');
      }

      // Store session
      const session = {
        email,
        loggedInAt: new Date().toISOString(),
        token: Math.random().toString(36).substr(2)
      };

      localStorage.setItem('app-session', JSON.stringify(session));
      setSuccess(true);

      // Call the callback to update parent
      setTimeout(() => {
        onLogin(email);
      }, 1000);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white">
        <div className="bg-green-50 border border-green-200 rounded-lg p-8 max-w-md text-center">
          <p className="text-green-700 font-semibold mb-2 text-lg">✅ Login Successful!</p>
          <p className="text-green-600 text-sm mb-4">Loading dashboard...</p>
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">👶 Baby & Mom</h1>
            <p className="text-gray-600">Care Tracking App</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value.toLowerCase())}
                placeholder="Enter your email"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                disabled={loading}
                autoComplete="email"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-semibold py-2 rounded-lg transition"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-600 mb-3 font-semibold">Authorized Emails:</p>
            <ul className="text-xs text-gray-700 space-y-1">
              <li>• rish.sinha@gmail.com</li>
              <li>• rishisinha411@gmail.com</li>
              <li>• shiva.malhotra1986@gmail.com</li>
              <li>• shiva.malhotra@yahoo.com</li>
              <li>• saritamalhotra88@gmail.com</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
