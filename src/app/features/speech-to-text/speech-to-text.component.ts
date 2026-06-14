import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { finalize, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';
import {
  SPEECH_INPUT_LANGUAGES,
  SPEECH_TRANSLATE_TARGETS,
  speechCodeToTranslationCode,
} from '../../shared/indian-languages';
import { AudioRecordingService } from '../../services/audio-recording.service';
import { SpeechToTextService } from '../../services/speech-to-text.service';
import { TranslationService } from '../../services/translation.service';

function formatElapsed(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

@Component({
  selector: 'app-speech-to-text',
  imports: [
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './speech-to-text.component.html',
  styleUrl: './speech-to-text.component.scss',
})
export class SpeechToTextComponent {
  private readonly audio = inject(AudioRecordingService);
  private readonly speechApi = inject(SpeechToTextService);
  private readonly translationApi = inject(TranslationService);
  private readonly destroyRef = inject(DestroyRef);

  private elapsedTimer: ReturnType<typeof setInterval> | null = null;
  private recordStartedAt = 0;

  protected readonly languages = SPEECH_INPUT_LANGUAGES;

  /** Re-evaluated in the template so we pick up secure-context / API availability correctly. */
  protected get recordingSupported(): boolean {
    return this.audio.isSupported();
  }

  protected micUnsupportedHint(): string {
    return this.audio.unsupportedReason();
  }

  protected selectedLang = SPEECH_INPUT_LANGUAGES[0].speechRecognitionCode;
  /** Default: Hindi when speaking English, English when speaking a regional language. */
  protected translateTargetCode = 'hi';
  /** Raw transcript from speech-to-text (what was heard). */
  protected readonly heardText = signal('');
  /** Translation of the full heard text. */
  protected readonly translatedText = signal('');
  protected readonly error = signal<string | null>(null);
  /** True while the browser is asking for / granting microphone access. */
  protected readonly startingMic = signal(false);
  protected readonly recording = signal(false);
  protected readonly transcribing = signal(false);
  protected readonly translating = signal(false);
  /** Shown while `recording` — updates every 500ms. */
  protected readonly elapsedLabel = signal('0:00');

  constructor() {
    this.destroyRef.onDestroy(() => this.clearElapsedTimer());
  }

  protected async start(): Promise<void> {
    this.error.set(null);
    this.startingMic.set(true);
    try {
      await this.audio.start();
      this.startingMic.set(false);
      this.recording.set(true);
      this.beginElapsedTimer();
    } catch (err: unknown) {
      this.error.set(err instanceof Error ? err.message : 'Could not start recording.');
      this.recording.set(false);
      this.startingMic.set(false);
    }
  }

  protected async stop(): Promise<void> {
    if (!this.recording()) {
      return;
    }
    this.recording.set(false);
    this.clearElapsedTimer();
    this.elapsedLabel.set('0:00');
    this.transcribing.set(true);
    this.error.set(null);

    try {
      const blob = await this.audio.stop();
      this.speechApi
        .transcribe(blob, this.selectedLang)
        .pipe(
          switchMap((text) => {
            const prev = this.heardText();
            this.heardText.set(prev ? `${prev} ${text}`.trim() : text);
            this.transcribing.set(false);
            return this.translateFullHeard();
          }),
          finalize(() => {
            this.transcribing.set(false);
            this.translating.set(false);
          }),
        )
        .subscribe({
          next: (text) => this.translatedText.set(text),
          error: (err: unknown) => {
            this.error.set(err instanceof Error ? err.message : 'Transcription or translation failed.');
          },
        });
    } catch (err: unknown) {
      this.transcribing.set(false);
      this.translating.set(false);
      this.error.set(err instanceof Error ? err.message : 'Could not finalize recording.');
    }
  }

  protected translateTargetOptions(): { translationCode: string; label: string }[] {
    const source = speechCodeToTranslationCode(this.selectedLang);
    return SPEECH_TRANSLATE_TARGETS.filter((l) => l.translationCode !== source);
  }

  protected onSpokenLanguageChange(): void {
    const source = speechCodeToTranslationCode(this.selectedLang);
    const options = this.translateTargetOptions();
    const preferred = source === 'en' ? 'hi' : 'en';
    this.translateTargetCode =
      options.find((l) => l.translationCode === preferred)?.translationCode ??
      options[0]?.translationCode ??
      'en';
  }

  protected retranslate(): void {
    this.error.set(null);
    this.translating.set(true);
    this.translateFullHeard()
      .pipe(finalize(() => this.translating.set(false)))
      .subscribe({
        next: (text) => this.translatedText.set(text),
        error: (err: unknown) => {
          this.error.set(err instanceof Error ? err.message : 'Translation failed.');
        },
      });
  }

  protected clear(): void {
    if (this.recording()) {
      this.audio.cancel();
      this.recording.set(false);
      this.clearElapsedTimer();
      this.elapsedLabel.set('0:00');
    }
    this.heardText.set('');
    this.translatedText.set('');
    this.error.set(null);
  }

  private translateFullHeard() {
    const text = this.heardText().trim();
    if (!text) {
      return of('');
    }
    const source = speechCodeToTranslationCode(this.selectedLang);
    const target = this.translateTargetCode;
    this.translating.set(true);
    return this.translationApi.translate(text, source, target);
  }

  private beginElapsedTimer(): void {
    this.clearElapsedTimer();
    this.recordStartedAt = Date.now();
    this.elapsedLabel.set('0:00');
    this.elapsedTimer = setInterval(() => {
      const sec = Math.floor((Date.now() - this.recordStartedAt) / 1000);
      this.elapsedLabel.set(formatElapsed(sec));
    }, 500);
  }

  private clearElapsedTimer(): void {
    if (this.elapsedTimer !== null) {
      clearInterval(this.elapsedTimer);
      this.elapsedTimer = null;
    }
  }
}
