import { useState, useRef, useEffect } from 'react'
import {
  Send,
  Spade,
  Heart,
  Diamond,
  Club,
  Bot,
  User,
  Loader2,
  Settings,
  Trash2,
  Info,
  ChevronDown,
  Copy,
  Check
} from 'lucide-react'

// Types
interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface HandInfo {
  position: string
  hand: string
  action: string
  potSize?: string
  stackSize?: string
  villainAction?: string
}

// Card Components
const CardIcon = ({ suit }: { suit: string }) => {
  const iconProps = { size: 16, strokeWidth: 2 }
  switch (suit.toLowerCase()) {
    case 'spade':
    case 's':
      return <Spade {...iconProps} className="text-gray-900" />
    case 'heart':
    case 'h':
      return <Heart {...iconProps} className="text-red-500 fill-red-500" />
    case 'diamond':
    case 'd':
      return <Diamond {...iconProps} className="text-red-500 fill-red-500" />
    case 'club':
    case 'c':
      return <Club {...iconProps} className="text-gray-900" />
    default:
      return null
  }
}

// Preset situations for quick input
const presetSituations = [
  { label: 'AK UTG', prompt: 'Ho AKs in UTG in un torneo, stack 30bb. Come gioco?' },
  { label: '3-bet defense', prompt: 'Ho JJ in BTN, CO fa 3-bet. Stack effettivo 100bb cash game. Cosa faccio?' },
  { label: 'C-bet spot', prompt: 'Sono IP con AQ su board K72 rainbow. Villain ha checkato. Devo fare c-bet?' },
  { label: 'River bluff', prompt: 'Ho un busted flush draw al river. Il pot è 50bb e villain ha 40bb behind. Devo bluffare?' },
  { label: 'Short stack', prompt: 'Torneo, 12bb in SB con A5o. Fold around fino a me. Push o fold?' },
  { label: 'Set mining', prompt: 'Ho 55 in MP. UTG fa raise 3x. Stack 150bb. Vale la pena chiamare per set mining?' },
]

// Gemini API call
async function callGeminiAPI(prompt: string, apiKey: string): Promise<string> {
  const systemPrompt = `Sei PokerPro AI, un esperto assistente di poker Texas Hold'em.

Le tue competenze includono:
- Analisi delle mani e delle situazioni di gioco
- Calcolo delle probabilità e delle pot odds
- Strategia preflop e postflop
- Lettura degli avversari e dei range
- Gestione del bankroll e della varianza
- Strategie per tornei (MTT, SNG) e cash game
- ICM (Independent Chip Model) nei tornei
- GTO (Game Theory Optimal) e strategie exploitative

Rispondi sempre in italiano, in modo chiaro e dettagliato. Usa esempi concreti quando possibile.
Fornisci spiegazioni del ragionamento dietro ogni consiglio.
Se la domanda è ambigua, chiedi chiarimenti sui dettagli rilevanti (posizione, stack size, tipo di torneo/cash game, etc.).`

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: systemPrompt + '\n\nDomanda del giocatore: ' + prompt }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        }
      })
    }
  )

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`)
  }

  const data = await response.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Nessuna risposta generata.'
}

// Message component
function MessageBubble({ message, onCopy }: { message: Message; onCopy: (text: string) => void }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    onCopy(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      {message.role === 'assistant' && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center flex-shrink-0">
          <Bot size={18} className="text-white" />
        </div>
      )}
      <div className={`max-w-[80%] group relative ${
        message.role === 'user'
          ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm'
          : 'bg-gray-100 text-gray-900 rounded-2xl rounded-tl-sm'
      } px-4 py-3 shadow-sm`}>
        <div className="whitespace-pre-wrap text-sm leading-relaxed">
          {message.content}
        </div>
        <div className={`text-xs mt-2 ${message.role === 'user' ? 'text-blue-200' : 'text-gray-400'}`}>
          {message.timestamp.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
        </div>
        {message.role === 'assistant' && (
          <button
            onClick={handleCopy}
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 rounded"
          >
            {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} className="text-gray-500" />}
          </button>
        )}
      </div>
      {message.role === 'user' && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center flex-shrink-0">
          <User size={18} className="text-white" />
        </div>
      )}
    </div>
  )
}

// Main App
export default function App() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [showPresets, setShowPresets] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Load API key from env or localStorage
  useEffect(() => {
    const envKey = import.meta.env.VITE_GEMINI_API_KEY
    const storedKey = localStorage.getItem('gemini-api-key')
    if (envKey && envKey !== 'LA_TUA_API_KEY') {
      setApiKey(envKey)
    } else if (storedKey) {
      setApiKey(storedKey)
    }
  }, [])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Save API key
  const saveApiKey = (key: string) => {
    setApiKey(key)
    localStorage.setItem('gemini-api-key', key)
    setShowSettings(false)
  }

  // Copy to clipboard
  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text)
  }

  // Send message
  const sendMessage = async (messageText?: string) => {
    const text = messageText || input.trim()
    if (!text || isLoading) return

    if (!apiKey) {
      setShowSettings(true)
      return
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    setShowPresets(false)

    try {
      const response = await callGeminiAPI(text, apiKey)
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Errore: ${error instanceof Error ? error.message : 'Si è verificato un errore'}. Verifica la tua API key nelle impostazioni.`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }

  // Clear chat
  const clearChat = () => {
    setMessages([])
  }

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-green-900 to-gray-900 flex flex-col">
      {/* Header */}
      <header className="bg-black/30 backdrop-blur-sm border-b border-green-800/30 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center shadow-lg">
              <div className="flex gap-0.5">
                <Spade size={12} className="text-white" />
                <Heart size={12} className="text-red-300" />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">PokerPro AI</h1>
              <p className="text-xs text-green-400">Il tuo coach di poker personale</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={clearChat}
              className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              title="Cancella chat"
            >
              <Trash2 size={20} />
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              title="Impostazioni"
            >
              <Settings size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Settings size={24} />
              Impostazioni
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-2">
                  Gemini API Key
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Inserisci la tua API key..."
                  className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <p className="text-xs text-gray-400 mt-2">
                  Ottieni la tua API key su{' '}
                  <a
                    href="https://makersuite.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-400 hover:underline"
                  >
                    Google AI Studio
                  </a>
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowSettings(false)}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors"
                >
                  Annulla
                </button>
                <button
                  onClick={() => saveApiKey(apiKey)}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors"
                >
                  Salva
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <main className="flex-1 overflow-hidden flex flex-col max-w-4xl mx-auto w-full">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center shadow-xl mb-6">
                <div className="flex gap-1">
                  <Spade size={20} className="text-white" />
                  <Heart size={20} className="text-red-300" />
                  <Diamond size={20} className="text-red-300" />
                  <Club size={20} className="text-white" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Benvenuto in PokerPro AI!</h2>
              <p className="text-gray-400 max-w-md mb-6">
                Sono il tuo assistente personale per il poker. Chiedimi qualsiasi cosa su strategia,
                analisi delle mani, probabilità, e molto altro.
              </p>
              <div className="grid grid-cols-2 gap-3 max-w-lg">
                {presetSituations.slice(0, 4).map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => sendMessage(preset.prompt)}
                    className="bg-white/10 hover:bg-white/20 text-white rounded-xl px-4 py-3 text-sm text-left transition-colors"
                  >
                    <span className="font-medium">{preset.label}</span>
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2">{preset.prompt}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map(message => (
              <MessageBubble key={message.id} message={message} onCopy={copyToClipboard} />
            ))
          )}
          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center">
                <Bot size={18} className="text-white" />
              </div>
              <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
                <Loader2 size={18} className="animate-spin text-green-600" />
                <span className="text-sm text-gray-600">Sto analizzando...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-black/30 backdrop-blur-sm border-t border-green-800/30">
          {/* Quick presets */}
          <div className="mb-3">
            <button
              onClick={() => setShowPresets(!showPresets)}
              className="text-sm text-green-400 hover:text-green-300 flex items-center gap-1 mb-2"
            >
              <Info size={14} />
              Situazioni comuni
              <ChevronDown size={14} className={`transition-transform ${showPresets ? 'rotate-180' : ''}`} />
            </button>
            {showPresets && (
              <div className="flex flex-wrap gap-2">
                {presetSituations.map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setInput(preset.prompt)
                      inputRef.current?.focus()
                    }}
                    className="text-xs bg-green-800/50 text-green-300 px-3 py-1.5 rounded-full hover:bg-green-700/50 transition-colors"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Input field */}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Descrivi la tua situazione di poker..."
                rows={1}
                className="w-full bg-white/10 text-white placeholder-gray-400 rounded-xl px-4 py-3 pr-12 resize-none focus:outline-none focus:ring-2 focus:ring-green-500 max-h-32"
                style={{ minHeight: '48px' }}
              />
            </div>
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || isLoading}
              className="px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-500 hover:to-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-green-500/25"
            >
              {isLoading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <Send size={20} />
              )}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Premi Invio per inviare, Shift+Invio per nuova riga
          </p>
        </div>
      </main>
    </div>
  )
}
