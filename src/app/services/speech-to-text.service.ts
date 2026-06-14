import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { apiUrl } from '../core/api-url';

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

@Injectable({ providedIn: 'root' })
export class SpeechToTextService {
  private readonly http = inject(HttpClient);

  private readonly speechUrl = apiUrl('/speech-to-text');

  /**
   * Sends recorded audio to the backend.
   * Multipart: field `file` (matches FastAPI `UploadFile` param name in the backend).
   * `language` is kept for future backend use; Whisper currently auto-detects.
   */
  transcribe(audio: Blob, language: string): Observable<string> {
    const fd = new FormData();
    const ext = extensionForMime(audio.type || 'audio/webm');
    const mime = audio.type || 'audio/webm';
    const upload = new File([audio], `recording.${ext}`, { type: mime });
    fd.append('file', upload);
    fd.append('language', language);

    return this.http.post<unknown>(this.speechUrl, fd).pipe(
      map((body) => parseTranscript(body)),
      catchError((err: unknown) => {
        if (err instanceof HttpErrorResponse) {
          const message =
            httpErrorMessage(err) || err.message || `Speech-to-text failed (${err.status}).`;
          return throwError(() => new Error(message));
        }
        if (err instanceof Error) {
          return throwError(() => err);
        }
        return throwError(() => new Error('Speech-to-text request failed.'));
      }),
    );
  }
}

function httpErrorMessage(err: HttpErrorResponse): string | null {
  const body = err.error;
  if (!body || typeof body !== 'object') {
    return null;
  }
  const o = body as Record<string, unknown>;
  if (typeof o['message'] === 'string') {
    return o['message'];
  }
  const detail = o['detail'];
  if (typeof detail === 'string') {
    return detail;
  }
  if (Array.isArray(detail) && detail.length > 0) {
    const parts = detail
      .map((item) => {
        if (typeof item === 'string') {
          return item;
        }
        if (item && typeof item === 'object' && 'msg' in item && typeof (item as { msg: unknown }).msg === 'string') {
          return (item as { msg: string }).msg;
        }
        return null;
      })
      .filter((p): p is string => Boolean(p));
    return parts.length ? parts.join(' ') : null;
  }
  return null;
}
