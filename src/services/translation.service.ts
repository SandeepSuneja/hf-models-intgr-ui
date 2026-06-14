import { apiUrl } from '../core/api-url';
import { parseHttpError } from '../core/http-utils';

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

/** Request JSON for `POST /translate` (FastAPI backend). */
export interface TranslateRequest {
  text: string;
  target_lang: string;
}

/**
 * Backend (M2M100) translates English → `targetLanguage` only.
 */
export async function translate(
  text: string,
  sourceLanguage: string,
  targetLanguage: string,
): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error('Nothing to translate.');
  }
  if (sourceLanguage === targetLanguage) {
    throw new Error('Source and target language must differ.');
  }
  if (sourceLanguage !== 'en') {
    throw new Error(
      'The translation API only supports English transcripts. Choose “English (India)” as the spoken language, or extend the backend for other sources.',
    );
  }
  if (targetLanguage === 'en') {
    throw new Error('English → English is not supported. Pick an Indian language as the translation target.');
  }

  const body: TranslateRequest = {
    text: trimmed,
    target_lang: targetLanguage,
  };

  const response = await fetch(apiUrl('/translate'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw await parseHttpError(response, 'Translation failed');
  }

  return parseTranslatedText(await response.json());
}

export async function translateEnglishTo(text: string, targetCode: string): Promise<string> {
  return translate(text, 'en', targetCode);
}
