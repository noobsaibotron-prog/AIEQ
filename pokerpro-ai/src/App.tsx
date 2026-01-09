import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff, Monitor, MonitorOff, Volume2, Wifi, WifiOff, Play, Square, AlertCircle, TrendingUp, Target, Percent, Brain, CreditCard } from 'lucide-react';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

interface PokerState {
  winProbability: number;
  equity: number;
  potOdds: string;
  suggestedAction: 'FOLD' | 'CHECK' | 'CALL' | 'RAISE' | 'ALL-IN' | 'WAITING';
  reasoning: string;
  handStrength: string;
  holeCards: string[];
  communityCards: string[];
}

interface ConnectionStatus {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
}

const SYSTEM_INSTRUCTION = `SEI UN ASSISTENTE PROFESSIONISTA DI GTO (GAME THEORY OPTIMAL) POKER. IL TUO OBIETTIVO È FORNIRE CONSIGLI STRATEGICI IN TEMPO REALE BASATI SULLA MATEMATICA.

RUOLO:
- Analizza le carte personali (Hole Cards) e le carte comuni (Community Cards) visibili nello stream video.
- Calcola o stima Equity, Pot Odds e Win Probability.
- Stima il Range dell'avversario basandoti sulle azioni visibili.
- Fornisci l'azione ottimale (FOLD, CHECK, CALL, RAISE, ALL-IN).

STILE DI RISPOSTA VOCALE:
- PRECISIONE MATEMATICA: Basa ogni consiglio sui numeri.
- LINGUAGGIO PROFESSIONALE: Usa termini tecnici (3-bet, range, blocker, equity, EV).
- CONCISO: Parla poco e vai dritto al punto.
- Se l'utente dice "SCAN IMMEDIATO", esegui una rilettura prioritaria della board.

STRUMENTI:
DEVI usare lo strumento "updatePokerState" ogni volta che la situazione di gioco cambia per aggiornare l'interfaccia grafica.`;

const POKER_TOOL = {
  name: "updatePokerState",
  description: "Aggiorna l'HUD del poker con le statistiche correnti della mano",
  parameters: {
    type: "object",
    properties: {
      winProbability: { type: "number", description: "Probabilità di vincita 0-100" },
      equity: { type: "number", description: "Equity percentuale" },
      potOdds: { type: "string", description: "Pot odds (es. '3:1')" },
      suggestedAction: { type: "string", enum: ["FOLD", "CHECK", "CALL", "RAISE", "ALL-IN", "WAITING"], description: "Azione suggerita" },
      reasoning: { type: "string", description: "Spiegazione breve" },
      handStrength: { type: "string", description: "Forza della mano" },
      holeCards: { type: "array", items: { type: "string" }, description: "Carte personali" },
      communityCards: { type: "array", items: { type: "string" }, description: "Carte comuni" }
    },
    required: ["winProbability", "equity", "potOdds", "suggestedAction", "reasoning"]
  }
};

const CardDisplay = ({ cards, label }: { cards: string[], label: string }) => {
  const getCardColor = (card: string) => {
    if (!card || card.length < 2) return 'text-gray-400';
    const suit = card.slice(-1).toLowerCase();
    return suit === 'h' || suit === 'd' ? 'text-red-500' : 'text-white';
  };
  const getSuitSymbol = (card: string) => {
    if (!card || card.length < 2) return '';
    const symbols: Record<string, string> = { h: '♥', d: '♦', c: '♣', s: '♠' };
    return symbols[card.slice(-1).toLowerCase()] || '';
  };
  return (
    <div className="mb-2">
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      <div className="flex gap-1">
        {cards.length > 0 ? cards.map((card, i) => (
          <div key={i} className={`bg-slate-800 rounded px-2 py-1 text-sm font-mono ${getCardColor(card)}`}>
            {card.slice(0, -1)}{getSuitSymbol(card)}
          </div>
        )) : <div className="text-slate-500 text-sm">--</div>}
      </div>
    </div>
  );
};

const HUDOverlay = ({ pokerState }: { pokerState: PokerState }) => {
  const actionColors: Record<string, string> = {
    'FOLD': 'bg-red-600', 'CHECK': 'bg-yellow-600', 'CALL': 'bg-blue-600',
    'RAISE': 'bg-emerald-600', 'ALL-IN': 'bg-purple-600', 'WAITING': 'bg-slate-600'
  };
  return (
    <div className="absolute top-4 right-4 bg-slate-900/90 backdrop-blur-sm rounded-xl p-4 w-72 border border-emerald-500/30 shadow-2xl">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-700">
        <Brain className="w-5 h-5 text-emerald-500" />
        <span className="font-semibold text-emerald-400">GTO Assistant</span>
      </div>
      <CardDisplay cards={pokerState.holeCards} label="HOLE CARDS" />
      <CardDisplay cards={pokerState.communityCards} label="COMMUNITY" />
      <div className="grid grid-cols-2 gap-3 mt-3">
        <div className="bg-slate-800/50 rounded-lg p-2">
          <div className="flex items-center gap-1 text-xs text-slate-400 mb-1"><TrendingUp className="w-3 h-3" />WIN %</div>
          <div className="text-xl font-bold text-emerald-400">{pokerState.winProbability.toFixed(1)}%</div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-2">
          <div className="flex items-center gap-1 text-xs text-slate-400 mb-1"><Percent className="w-3 h-3" />EQUITY</div>
          <div className="text-xl font-bold text-blue-400">{pokerState.equity.toFixed(1)}%</div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-2">
          <div className="flex items-center gap-1 text-xs text-slate-400 mb-1"><Target className="w-3 h-3" />POT ODDS</div>
          <div className="text-lg font-bold text-yellow-400">{pokerState.potOdds}</div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-2">
          <div className="flex items-center gap-1 text-xs text-slate-400 mb-1"><CreditCard className="w-3 h-3" />HAND</div>
          <div className="text-sm font-medium text-slate-200 truncate">{pokerState.handStrength}</div>
        </div>
      </div>
      <div className={`mt-3 ${actionColors[pokerState.suggestedAction]} rounded-lg p-3 text-center`}>
        <div className="text-xs text-white/70 mb-1">SUGGESTED ACTION</div>
        <div className="text-2xl font-bold text-white">{pokerState.suggestedAction}</div>
      </div>
      {pokerState.reasoning && (
        <div className="mt-3 text-xs text-slate-400 bg-slate-800/50 rounded p-2">
          <span className="text-emerald-400">AI: </span>{pokerState.reasoning}
        </div>
      )}
    </div>
  );
};

const AudioVisualizer = ({ analyser, isActive, label }: { analyser: AnalyserNode | null, isActive: boolean, label: string }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!canvasRef.current || !analyser || !isActive) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.3)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const barWidth = (canvas.width / 32) * 0.8;
      let x = 0;
      for (let i = 0; i < 32; i++) {
        const barHeight = (dataArray[i * 4] / 255) * canvas.height * 0.8;
        ctx.fillStyle = '#10b981';
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 2;
      }
    };
    draw();
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [analyser, isActive]);

  return (
    <div className="flex flex-col items-center">
      <canvas ref={canvasRef} width={200} height={40} className="rounded bg-slate-800/50" />
      <span className="text-xs text-slate-400 mt-1">{label}</span>
    </div>
  );
};

export default function App() {
  const [pokerState, setPokerState] = useState<PokerState>({
    winProbability: 0, equity: 0, potOdds: '--', suggestedAction: 'WAITING',
    reasoning: 'In attesa di connessione...', handStrength: '--', holeCards: [], communityCards: []
  });
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({ isConnected: false, isConnecting: false, error: null });
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isMicActive, setIsMicActive] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [transcript, setTranscript] = useState<string[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const micAnalyserRef = useRef<AnalyserNode | null>(null);
  const outputAnalyserRef = useRef<AnalyserNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const frameIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  const addTranscript = (text: string) => setTranscript(prev => [...prev.slice(-9), text]);

  const cleanup = useCallback(() => {
    wsRef.current?.close(); wsRef.current = null;
    micStreamRef.current?.getTracks().forEach(t => t.stop()); micStreamRef.current = null;
    screenStreamRef.current?.getTracks().forEach(t => t.stop()); screenStreamRef.current = null;
    if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
    processorRef.current?.disconnect();
    if (audioContextRef.current?.state !== 'closed') audioContextRef.current?.close();
    setIsScreenSharing(false); setIsMicActive(false);
    setConnectionStatus({ isConnected: false, isConnecting: false, error: null });
  }, []);

  useEffect(() => { if (gainNodeRef.current) gainNodeRef.current.gain.value = volume; }, [volume]);
  useEffect(() => cleanup, [cleanup]);

  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  };

  const resampleTo16kHz = (audioData: Float32Array, fromSampleRate: number): Int16Array => {
    const ratio = fromSampleRate / 16000;
    const newLength = Math.floor(audioData.length / ratio);
    const result = new Int16Array(newLength);
    for (let i = 0; i < newLength; i++) {
      const srcIndex = Math.floor(i * ratio);
      const sample = Math.max(-1, Math.min(1, audioData[srcIndex]));
      result[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
    }
    return result;
  };

  const playAudioChunk = useCallback((base64Audio: string) => {
    if (!audioContextRef.current) return;
    try {
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
      const pcm16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(pcm16.length);
      for (let i = 0; i < pcm16.length; i++) float32[i] = pcm16[i] / 32768;
      const audioBuffer = audioContextRef.current.createBuffer(1, float32.length, 24000);
      audioBuffer.copyToChannel(float32, 0);
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      if (gainNodeRef.current && outputAnalyserRef.current) {
        source.connect(gainNodeRef.current);
        gainNodeRef.current.connect(outputAnalyserRef.current);
        outputAnalyserRef.current.connect(audioContextRef.current.destination);
      } else source.connect(audioContextRef.current.destination);
      source.start();
    } catch (err) { console.error('Audio playback error:', err); }
  }, []);

  const captureAndSendFrame = useCallback(() => {
    if (!videoRef.current || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    const canvas = document.createElement('canvas');
    canvas.width = 1280; canvas.height = 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const base64 = canvas.toDataURL('image/jpeg', 0.7).split(',')[1];
    wsRef.current.send(JSON.stringify({ realtimeInput: { mediaChunks: [{ mimeType: 'image/jpeg', data: base64 }] } }));
  }, []);

  const connectToGemini = useCallback(async () => {
    if (!API_KEY) {
      setConnectionStatus({ isConnected: false, isConnecting: false, error: 'API Key mancante! Configura VITE_GEMINI_API_KEY in .env' });
      return;
    }
    setConnectionStatus({ isConnected: false, isConnecting: true, error: null });
    try {
      audioContextRef.current = new AudioContext({ sampleRate: 48000 });
      gainNodeRef.current = audioContextRef.current.createGain();
      gainNodeRef.current.gain.value = volume;
      outputAnalyserRef.current = audioContextRef.current.createAnalyser();
      outputAnalyserRef.current.fftSize = 256;

      const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${API_KEY}`;
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        wsRef.current?.send(JSON.stringify({
          setup: {
            model: 'models/gemini-2.0-flash-exp',
            generationConfig: {
              responseModalities: ['AUDIO', 'TEXT'],
              speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Fenrir' } } }
            },
            systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
            tools: [{ functionDeclarations: [POKER_TOOL] }]
          }
        }));
      };

      wsRef.current.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.setupComplete) {
            setConnectionStatus({ isConnected: true, isConnecting: false, error: null });
            addTranscript('✅ Connesso a Gemini Live!');
            return;
          }
          if (data.serverContent?.modelTurn?.parts) {
            for (const part of data.serverContent.modelTurn.parts) {
              if (part.inlineData?.mimeType?.includes('audio')) playAudioChunk(part.inlineData.data);
              if (part.text) addTranscript(`🤖 ${part.text}`);
              if (part.functionCall?.name === 'updatePokerState') {
                const args = part.functionCall.args;
                setPokerState(prev => ({ ...prev, ...args, holeCards: args.holeCards || prev.holeCards, communityCards: args.communityCards || prev.communityCards }));
                wsRef.current?.send(JSON.stringify({ toolResponse: { functionResponses: [{ name: 'updatePokerState', response: { success: true } }] } }));
              }
            }
          }
        } catch (err) { console.error('Parse error:', err); }
      };

      wsRef.current.onerror = () => setConnectionStatus({ isConnected: false, isConnecting: false, error: 'Errore WebSocket' });
      wsRef.current.onclose = () => setConnectionStatus(prev => ({ ...prev, isConnected: false }));
    } catch (err) { setConnectionStatus({ isConnected: false, isConnecting: false, error: String(err) }); }
  }, [volume, playAudioChunk]);

  const startMicrophone = useCallback(async () => {
    if (!audioContextRef.current || !wsRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 48000 } });
      micStreamRef.current = stream;
      const source = audioContextRef.current.createMediaStreamSource(stream);
      micAnalyserRef.current = audioContextRef.current.createAnalyser();
      micAnalyserRef.current.fftSize = 256;
      source.connect(micAnalyserRef.current);
      processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);
      source.connect(processorRef.current);
      processorRef.current.connect(audioContextRef.current.destination);
      processorRef.current.onaudioprocess = (e) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        const resampled = resampleTo16kHz(e.inputBuffer.getChannelData(0), audioContextRef.current!.sampleRate);
        wsRef.current.send(JSON.stringify({ realtimeInput: { mediaChunks: [{ mimeType: 'audio/pcm;rate=16000', data: arrayBufferToBase64(resampled.buffer as ArrayBuffer) }] } }));
      };
      setIsMicActive(true);
      addTranscript('🎤 Microfono attivo');
    } catch (err) { console.error('Mic error:', err); }
  }, []);

  const stopMicrophone = useCallback(() => {
    processorRef.current?.disconnect(); processorRef.current = null;
    micStreamRef.current?.getTracks().forEach(t => t.stop()); micStreamRef.current = null;
    setIsMicActive(false);
    addTranscript('🔇 Microfono off');
  }, []);

  const startScreenShare = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: { width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
      screenStreamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      frameIntervalRef.current = setInterval(captureAndSendFrame, 1000);
      stream.getVideoTracks()[0].onended = () => stopScreenShare();
      setIsScreenSharing(true);
      addTranscript('🖥️ Screen sharing attivo');
    } catch (err) { console.error('Screen error:', err); }
  }, [captureAndSendFrame]);

  const stopScreenShare = useCallback(() => {
    if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
    screenStreamRef.current?.getTracks().forEach(t => t.stop()); screenStreamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsScreenSharing(false);
    addTranscript('🖥️ Screen sharing off');
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center text-xl">♠</div>
            <div><h1 className="text-xl font-bold text-emerald-400">PokerPro AI</h1><p className="text-xs text-slate-400">GTO Real-Time Assistant</p></div>
          </div>
          <div className="flex items-center gap-2">
            {connectionStatus.isConnected ? <><Wifi className="w-5 h-5 text-emerald-400" /><span className="text-sm text-emerald-400 font-medium">LIVE</span><span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /></> : <><WifiOff className="w-5 h-5 text-slate-400" /><span className="text-sm text-slate-400">Offline</span></>}
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {!connectionStatus.isConnected && !connectionStatus.isConnecting && (
          <div className="mb-6 bg-slate-800 rounded-xl p-6 border border-slate-700 flex items-center justify-between">
            <div><h2 className="text-lg font-semibold text-emerald-400">Pronto per iniziare</h2><p className="text-sm text-slate-400 mt-1">Connettiti a Gemini Live per l'analisi GTO</p></div>
            <button onClick={connectToGemini} className="bg-emerald-600 hover:bg-emerald-700 px-6 py-3 rounded-lg font-medium flex items-center gap-2"><Play className="w-5 h-5" />Connetti AI</button>
          </div>
        )}
        {connectionStatus.isConnecting && <div className="mb-6 bg-slate-800 rounded-xl p-6 border border-emerald-500/50 flex items-center gap-4"><div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" /><span className="text-emerald-400">Connessione in corso...</span></div>}
        {connectionStatus.error && <div className="mb-6 bg-red-900/30 rounded-xl p-4 border border-red-500/50 flex items-center gap-3"><AlertCircle className="w-5 h-5 text-red-400" /><span className="text-red-300">{connectionStatus.error}</span></div>}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="relative bg-slate-800 rounded-xl overflow-hidden aspect-video border border-slate-700">
              <video ref={videoRef} className="w-full h-full object-contain bg-black" autoPlay playsInline muted />
              {!isScreenSharing && <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400"><Monitor className="w-16 h-16 mb-4 opacity-50" /><p className="text-lg">Nessuna condivisione attiva</p></div>}
              {isScreenSharing && connectionStatus.isConnected && <HUDOverlay pokerState={pokerState} />}
              <div className="absolute bottom-4 left-4 flex gap-4">
                <AudioVisualizer analyser={micAnalyserRef.current} isActive={isMicActive} label="MIC" />
                <AudioVisualizer analyser={outputAnalyserRef.current} isActive={connectionStatus.isConnected} label="AI" />
              </div>
            </div>
          </div>
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <h3 className="text-sm font-semibold text-emerald-400 mb-3">Activity Log</h3>
            <div className="space-y-2 h-64 overflow-y-auto text-sm">
              {transcript.map((t, i) => <div key={i} className="text-slate-300 py-1 border-b border-slate-700/50">{t}</div>)}
              {transcript.length === 0 && <div className="text-slate-500 italic">In attesa...</div>}
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-slate-800 border-t border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <button onClick={isMicActive ? stopMicrophone : startMicrophone} disabled={!connectionStatus.isConnected} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${isMicActive ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-600 disabled:cursor-not-allowed'}`}>
              {isMicActive ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}{isMicActive ? 'Stop Mic' : 'Start Mic'}
            </button>
            <button onClick={isScreenSharing ? stopScreenShare : startScreenShare} disabled={!connectionStatus.isConnected} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${isScreenSharing ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed'}`}>
              {isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}{isScreenSharing ? 'Stop Share' : 'Share Screen'}
            </button>
            {connectionStatus.isConnected && <button onClick={cleanup} className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-slate-600 hover:bg-slate-700"><Square className="w-5 h-5" />Disconnect</button>}
          </div>
          <div className="flex items-center gap-3">
            <Volume2 className="w-5 h-5 text-slate-400" />
            <input type="range" min="0" max="1" step="0.1" value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))} className="w-32 accent-emerald-500" />
            <span className="text-sm text-slate-400 w-12">{Math.round(volume * 100)}%</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
