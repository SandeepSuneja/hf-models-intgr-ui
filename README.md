# hf-models-intgr-ui

React frontend for Hugging Face model integration. Provides a ChatGPT-style chat, English-to-Indian-language translation, and speech-to-text with optional translation — all backed by the companion [hf-models-intgr-backend](https://github.com/SandeepSuneja/hf-models-intgr-backend) FastAPI service.

## Features

| Page | Route | Backend endpoint | Description |
|------|-------|------------------|-------------|
| **Chat** | `/chat` | `POST /chat` | Multi-turn conversation with Qwen3-14B. Full message history is sent on each turn. Optional “reasoning” mode maps to `enable_thinking`. |
| **Translation** | `/translate` | `POST /translate` | Paste English text and translate to Hindi, Bengali, Punjabi, Tamil, Telugu, or Marathi. |
| **Speech to text** | `/speech` | `POST /speech-to-text`, `POST /translate` | Record audio in the browser, transcribe with Whisper, then optionally translate the transcript. |

The default landing page is `/chat`.

## Prerequisites

- **Node.js 20+** and npm
- **Backend** running at `http://localhost:8000` — see [Backend setup](#backend-setup)
- **Microphone** (for speech-to-text) and a modern browser with `MediaRecorder` support (Chrome, Edge, Firefox)

## Quick start

```bash
git clone <repository-url>
cd hf-models-intgr-ui
npm install
npm run dev
```

Open [http://localhost:4200](http://localhost:4200).

### API base URL

Create or edit `.env.development` in the project root:

```env
VITE_API_BASE_URL=http://localhost:8000
```

| Variable | Required | Default (dev) | Description |
|----------|----------|---------------|-------------|
| `VITE_API_BASE_URL` | No | `http://localhost:8000` | Base URL for all API calls. In production builds, leave empty to use same-origin relative paths. |

Vite loads `.env.development` automatically when running `npm run dev`.

## Backend setup

This UI does not embed models — it calls the backend over HTTP. Start the backend before using any feature:

```powershell
# In hf-models-intgr-backend (separate repo)
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Important notes:**

- Whisper and M2M100 load at backend startup (on CPU). The **chat model loads lazily** on the first `/chat` request and can take several minutes on first use.
- Chat requires a GPU with ~10 GB VRAM for practical latency (4-bit Qwen3-14B). Translation and speech-to-text work on CPU.
- Full backend documentation (CUDA PyTorch, environment variables, API reference, troubleshooting): **[hf-models-intgr-backend README](https://github.com/SandeepSuneja/hf-models-intgr-backend)**.

### Run both services locally

1. **Terminal 1 — backend:** `python -m uvicorn app.main:app --reload --port 8000`
2. **Terminal 2 — frontend:** `npm run dev` → [http://localhost:4200](http://localhost:4200)

CORS is enabled on the backend for local development.

## Project structure

```
hf-models-intgr-ui/
├── index.html
├── vite.config.ts              # Dev server port 4200
├── .env.development            # VITE_API_BASE_URL (not committed if secrets added)
├── src/
│   ├── main.tsx                # React entry
│   ├── App.tsx                 # Theme + React Router
│   ├── config/
│   │   └── environment.ts      # apiBaseUrl from Vite env
│   ├── core/
│   │   ├── api-url.ts          # Builds full API URLs
│   │   └── http-utils.ts       # Parses FastAPI error responses
│   ├── layout/
│   │   └── Shell.tsx           # App shell, sidebar navigation
│   ├── features/
│   │   ├── chat/               # ChatGPT-style chat UI
│   │   ├── translation/        # EN → Indian languages
│   │   └── speech-to-text/     # Record, transcribe, translate
│   ├── services/
│   │   ├── chat.service.ts
│   │   ├── translation.service.ts
│   │   ├── speech-to-text.service.ts
│   │   └── audio-recording.service.ts
│   └── shared/
│       └── indian-languages.ts # Language codes for UI + API
└── dist/                       # Production build output
```

## API integration (frontend → backend)

All services use `apiUrl()` from `src/core/api-url.ts` and `parseHttpError()` for consistent error messages.

### Chat — `POST /chat`

**Request** (from `chat.service.ts`):

```json
{
  "messages": [
    { "role": "user", "content": "Hello!" }
  ],
  "enable_thinking": false
}
```

**Response:**

```json
{
  "message": {
    "role": "assistant",
    "content": "Hi! How can I help?",
    "thinking": "optional reasoning trace when enable_thinking is true"
  },
  "model": "Qwen/Qwen3-14B",
  "usage": { "prompt_tokens": 12, "completion_tokens": 48 }
}
```

Check backend health and GPU status: `GET /chat/status`.

### Translation — `POST /translate`

**Request:**

```json
{
  "text": "Hello, how are you?",
  "target_lang": "hi"
}
```

**Response:** `{ "translated_text": "..." }`

The UI only supports **English → Indian language** (`en` source). Target codes used in the app: `hi`, `bn`, `pa`, `ta`, `te`, `mr`.

### Speech to text — `POST /speech-to-text`

**Request:** `multipart/form-data`

| Field | Description |
|-------|-------------|
| `file` | Audio blob from browser recording (`.webm` by default) |
| `language` | BCP-47 tag (reserved for future backend use) |

**Response:** `{ "text": "...", "language": "..." }`

After transcription, the speech page optionally calls `/translate` when a non-English target is selected.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server on port **4200** |
| `npm run build` | Typecheck + production build to `dist/` |
| `npm run preview` | Serve the production build locally |

## VS Code

The repo includes launch and task configs:

- **Run and Debug → “Vite dev server”** — starts `npm run dev` and opens Chrome at `http://localhost:4200/`.

Recommended extension: see `.vscode/extensions.json`.

## Stack

- **React 19** + **TypeScript**
- **Vite 6** (dev server port 4200)
- **React Router 7**
- **MUI (Material UI) 6** + Emotion

Previously an Angular app; migrated to React + Vite while keeping the same dev port and backend contract.

## Troubleshooting

| Issue | Suggestion |
|-------|------------|
| Network / fetch errors | Confirm backend is running at `VITE_API_BASE_URL` (default `http://localhost:8000`). Test `http://localhost:8000/docs`. |
| Chat hangs or times out | First `/chat` request downloads and loads Qwen3 (~10–20+ min). Check `GET /chat/status` for CUDA and VRAM. See backend README. |
| Translation error about English only | Translation API accepts English source only. Use “English (India)” for speech input or paste English on `/translate`. |
| Microphone not working | Grant browser permission; use HTTPS or `localhost`. Check `audioRecording.unsupportedReason()` in the speech page. |
| CORS errors | Backend must allow the frontend origin. Default backend CORS allows all origins in development. |
| Wrong API host in production | Set `VITE_API_BASE_URL` at build time, or deploy UI and API on the same origin with an empty base URL. |

## Related repositories

- **[hf-models-intgr-backend](https://github.com/SandeepSuneja/hf-models-intgr-backend)** — FastAPI service (Qwen3 chat, Whisper ASR, M2M100 translation)

## License

Add your license here if applicable.
