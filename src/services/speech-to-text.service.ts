import { apiUrl } from '../core/api-url';
import { parseHttpError } from '../core/http-utils';

function extensionForMime(mime: string): string {
  if (mime.includes('webm')) return 'webm';
  if (mime.includes('mp4') || mime.includes('m4a')) return 'm4a';
  if (mime.includes('wav')) return 'wav';
  return 'bin';
}

function parseTranscript(res: unknown): string {
  if (!res || typeof res !== 'object') {
    throw new Error('Invalid response from speech service.');
  }
  const o = res as Record<string, unknown>;
  const raw = o['text'] ?? o['transcript'] ?? o['transcription'];
  if (typeof raw !== 'string') {
    throw new Error('No transcript in response.');
  }
  const text = raw.trim();
  if (!text) {
    throw new Error('Empty transcript returned.');
  }
  return text;
}

/**
 * Sends recorded audio to the backend.
 * Multipart: field `file` (matches FastAPI `UploadFile` param name in the backend).
 * `language` is kept for future backend use; Whisper currently auto-detects.
 */
export async function transcribe(audio: Blob, language: string): Promise<string> {
  const fd = new FormData();
  const ext = extensionForMime(audio.type || 'audio/webm');
  const mime = audio.type || 'audio/webm';
  const upload = new File([audio], `recording.${ext}`, { type: mime });
  fd.append('file', upload);
  fd.append('language', language);

  const response = await fetch(apiUrl('/speech-to-text'), {
    method: 'POST',
    body: fd,
  });

  if (!response.ok) {
    throw await parseHttpError(response, 'Speech-to-text failed');
  }

  return parseTranscript(await response.json());
}
