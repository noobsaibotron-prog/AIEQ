import { useState } from 'react'
import { Brain, TrendingUp, Settings } from 'lucide-react'

function App() {
  const [apiKey, setApiKey] = useState(import.meta.env.VITE_GEMINI_API_KEY || '')

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-green-900 to-gray-900 text-white">
      <header className="p-6 border-b border-green-800">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Brain className="w-10 h-10 text-green-400" />
            <h1 className="text-2xl font-bold">PokerPro AI</h1>
          </div>
          <nav className="flex items-center gap-4">
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-700 hover:bg-green-600 transition">
              <TrendingUp className="w-5 h-5" />
              Stats
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition">
              <Settings className="w-5 h-5" />
              Settings
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="bg-gray-800/50 rounded-xl p-6 border border-green-800">
            <h2 className="text-xl font-semibold mb-4 text-green-400">AI Analysis</h2>
            <p className="text-gray-400">
              Configure your Gemini API key in the .env file to enable AI-powered poker analysis.
            </p>
            <div className="mt-4 p-4 bg-gray-900 rounded-lg">
              <p className="text-sm text-gray-500">
                API Key Status: {apiKey ? '✅ Configured' : '❌ Not configured'}
              </p>
            </div>
          </div>

          <div className="bg-gray-800/50 rounded-xl p-6 border border-green-800">
            <h2 className="text-xl font-semibold mb-4 text-green-400">Quick Start</h2>
            <ul className="space-y-2 text-gray-400">
              <li>1. Add your Gemini API key to .env</li>
              <li>2. Configure your poker scenarios</li>
              <li>3. Get AI-powered insights</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
