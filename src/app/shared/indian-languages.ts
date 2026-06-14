/** Target languages for EN → Indian language translation (API + UI). */
export interface IndianLanguage {
  /** MyMemory / common MT pair code (target side of `en|xx`). */
  translationCode: string;
  /** BCP-47 tag for Web Speech API recognition. */
  speechRecognitionCode: string;
  label: string;
}

export const INDIAN_LANGUAGES: readonly IndianLanguage[] = [
  { translationCode: 'hi', speechRecognitionCode: 'hi-IN', label: 'Hindi' },
  { translationCode: 'bn', speechRecognitionCode: 'bn-IN', label: 'Bengali' },
  { translationCode: 'pa', speechRecognitionCode: 'pa-IN', label: 'Punjabi' },
  { translationCode: 'ta', speechRecognitionCode: 'ta-IN', label: 'Tamil' },
  { translationCode: 'te', speechRecognitionCode: 'te-IN', label: 'Telugu' },
  { translationCode: 'mr', speechRecognitionCode: 'mr-IN', label: 'Marathi' },
] as const;

/** BCP-47 speech tag → API translation code (e.g. `hi-IN` → `hi`). */
export function speechCodeToTranslationCode(speechRecognitionCode: string): string {
  return speechRecognitionCode.split('-')[0].toLowerCase();
}

/** Target languages for speech transcript translation (English + regional). */
export const SPEECH_TRANSLATE_TARGETS: readonly { translationCode: string; label: string }[] = [
  { translationCode: 'en', label: 'English' },
  ...INDIAN_LANGUAGES.map((l) => ({
    translationCode: l.translationCode,
    label: l.label,
  })),
];

/** Languages offered for speech-to-text (Indian English + regional). */
export const SPEECH_INPUT_LANGUAGES: readonly { speechRecognitionCode: string; label: string }[] = [
  { speechRecognitionCode: 'en-IN', label: 'English (India)' },
  ...INDIAN_LANGUAGES.map((l) => ({
    speechRecognitionCode: l.speechRecognitionCode,
    label: l.label,
  })),
];
