# PokerPro AI

Un assistente AI intelligente per il poker Texas Hold'em, alimentato da Google Gemini.

## Funzionalita

- Analisi delle mani e delle situazioni di gioco
- Calcolo delle probabilita e delle pot odds
- Strategia preflop e postflop
- Lettura degli avversari e dei range
- Gestione del bankroll e della varianza
- Strategie per tornei (MTT, SNG) e cash game
- ICM (Independent Chip Model) nei tornei
- GTO (Game Theory Optimal) e strategie exploitative

## Setup Rapido

### 1. Installa le dipendenze

```bash
cd pokerpro-ai
npm install
```

### 2. Configura l'API Key

Crea un file `.env` nella root del progetto:

```bash
echo "VITE_GEMINI_API_KEY=LA_TUA_API_KEY" > .env
```

Ottieni la tua API key gratuita su [Google AI Studio](https://makersuite.google.com/app/apikey).

### 3. Avvia il server di sviluppo

```bash
npm run dev
```

Apri [http://localhost:5173](http://localhost:5173) nel browser.

## Deploy su Vercel

```bash
# Installa Vercel CLI (se non l'hai gia)
npm i -g vercel

# Deploy
vercel
```

Aggiungi la variabile d'ambiente `VITE_GEMINI_API_KEY` nelle impostazioni del progetto su Vercel.

## Tecnologie

- React 18 + TypeScript
- Vite
- Tailwind CSS
- Lucide React (icone)
- Google Gemini API

## Licenza

MIT
