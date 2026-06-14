# hf-models-intgr-ui

React UI for Hugging Face model integration — English-to-Indian-language translation and speech-to-text, backed by the `text-speech-ai-backend` FastAPI service.

```bash
git clone <repository-url>
cd hf-models-intgr-ui
```

## Features

- **Translation** (`/translate`) — paste English text and translate to Hindi, Bengali, Punjabi, Tamil, Telugu, or Marathi via `POST /translate`.
- **Speech to text** (`/speech`) — record audio, transcribe via `POST /speech-to-text`, then auto-translate the transcript.

## Prerequisites

- Node.js 20+
- Backend running at `http://localhost:8000` (see `text-speech-ai-backend`)

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:4200](http://localhost:4200). The dev server uses port 4200 to match the previous Angular setup.

### API base URL

Set `VITE_API_BASE_URL` in `.env.development` (default: `http://localhost:8000`). For production builds, leave it empty to use same-origin relative paths.

## Build

```bash
npm run build
npm run preview
```

Output is written to `dist/`.

## Stack

- React 19 + TypeScript
- Vite 6
- React Router 7
- MUI (Material UI) 6
