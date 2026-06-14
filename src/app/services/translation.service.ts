import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { apiUrl } from '../core/api-url';

/** Request JSON for `POST /translate` (FastAPI backend). */
export interface TranslateRequest {
  text: string;
  /** ISO 639-1 code, e.g. `hi`, `bn` — backend field name `target_lang`. */
  target_lang: string;
}

function parseTranslatedText(res: unknown): string {
  if (!res || typeof res !== 'object') {
    throw new Error('Invalid response from translation service.');
  }
  const o = res as Record<string, unknown>;
  const raw = o['translatedText'] ?? o['translated_text'] ?? o['text'];
  if (typeof raw !== 'string') {
    throw new Error('No translation in response.');
  }
  const text = raw.trim();
  if (!text) {
    throw new Error('Empty translation returned.');
  }
  return text;
}

@Injectable({ providedIn: 'root' })
export class TranslationService {
  private readonly http = inject(HttpClient);

  private readonly translateUrl = apiUrl('/translate');

  /**
   * Backend (M2M100) translates English → `targetLanguage` only.
   */
  translate(text: string, sourceLanguage: string, targetLanguage: string): Observable<string> {
    const trimmed = text.trim();
    if (!trimmed) {
      return throwError(() => new Error('Nothing to translate.'));
    }
    if (sourceLanguage === targetLanguage) {
      return throwError(() => new Error('Source and target language must differ.'));
    }
    if (sourceLanguage !== 'en') {
      return throwError(() =>
        new Error(
          'The translation API only supports English transcripts. Choose “English (India)” as the spoken language, or extend the backend for other sources.',
        ),
      );
    }
    if (targetLanguage === 'en') {
      return throwError(() =>
        new Error('English → English is not supported. Pick an Indian language as the translation target.'),
      );
    }

    const body: TranslateRequest = {
      text: trimmed,
      target_lang: targetLanguage,
    };

    return this.http.post<unknown>(this.translateUrl, body).pipe(
      map((res) => parseTranslatedText(res)),
      catchError((err: unknown) => {
        if (err instanceof HttpErrorResponse) {
          const message =
            httpErrorMessage(err) || err.message || `Translation failed (${err.status}).`;
          return throwError(() => new Error(message));
        }
        if (err instanceof Error) {
          return throwError(() => err);
        }
        return throwError(() => new Error('Translation request failed.'));
      }),
    );
  }

  translateEnglishTo(text: string, targetCode: string): Observable<string> {
    return this.translate(text, 'en', targetCode);
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
