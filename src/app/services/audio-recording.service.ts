import { Injectable } from '@angular/core';

function pickMimeType(): string | undefined {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c)) {
      return c;
    }
  }
  return undefined;
}

@Injectable({ providedIn: 'root' })
export class AudioRecordingService {
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private chunks: Blob[] = [];

  /**
   * `navigator.mediaDevices` only exists in a [secure context](https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts)
   * (HTTPS, localhost, or 127.0.0.1). Opening the dev app as `http://<LAN-IP>:4200` will hide the API and block the mic.
   */
  isSupported(): boolean {
    if (typeof MediaRecorder === 'undefined') {
      return false;
    }
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      return false;
    }
    if (typeof globalThis !== 'undefined' && 'isSecureContext' in globalThis && !globalThis.isSecureContext) {
      return false;
    }
    return true;
  }

  /** Human-readable reason when `isSupported()` is false (for UI). */
  unsupportedReason(): string {
    if (typeof MediaRecorder === 'undefined') {
      return 'This browser does not support MediaRecorder.';
    }
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      if (typeof globalThis !== 'undefined' && 'isSecureContext' in globalThis && !globalThis.isSecureContext) {
        return 'Microphone needs a secure context. Use https:// or open the app at http://localhost:4200 (not a raw LAN IP like http://192.168.x.x:4200).';
      }
      return 'Microphone API is not available in this browser.';
    }
    if (typeof globalThis !== 'undefined' && 'isSecureContext' in globalThis && !globalThis.isSecureContext) {
      return 'Microphone needs a secure context. Use https:// or open the app at http://localhost:4200 (not a raw LAN IP).';
    }
    return 'Audio recording is not supported.';
  }

  /** Starts capturing microphone input. */
  async start(): Promise<void> {
    if (!this.isSupported()) {
      throw new Error(this.unsupportedReason());
    }
    this.cancel();

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
    } catch (err) {
      throw new Error(micAccessMessage(err));
    }

    this.stream = stream;
    this.chunks = [];

    const mimeType = pickMimeType();
    let mr: MediaRecorder;
    try {
      mr = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    } catch {
      try {
        mr = new MediaRecorder(stream);
      } catch (e) {
        this.teardownRecorder();
        throw new Error(
          e instanceof Error ? e.message : 'Could not create MediaRecorder for this microphone.',
        );
      }
    }

    this.mediaRecorder = mr;
    mr.ondataavailable = (ev: BlobEvent) => {
      if (ev.data.size > 0) {
        this.chunks.push(ev.data);
      }
    };

    try {
      mr.start(250);
    } catch (e) {
      this.teardownRecorder();
      throw new Error(e instanceof Error ? e.message : 'Could not start MediaRecorder.');
    }

    if (mr.state === 'recording') {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      let settled = false;
      let timeoutId: ReturnType<typeof setTimeout> | undefined;

      const settleOk = () => {
        if (settled) {
          return;
        }
        if (mr.state !== 'recording') {
          return;
        }
        settled = true;
        if (timeoutId !== undefined) {
          window.clearTimeout(timeoutId);
        }
        resolve();
      };

      const settleFail = (message: string) => {
        if (settled) {
          return;
        }
        settled = true;
        if (timeoutId !== undefined) {
          window.clearTimeout(timeoutId);
        }
        this.teardownRecorder();
        reject(new Error(message));
      };

      mr.addEventListener('error', () => settleFail('Recording failed (MediaRecorder error).'), {
        once: true,
      });
      mr.addEventListener(
        'start',
        () => {
          if (mr.state === 'recording') {
            settleOk();
          }
        },
        { once: true },
      );

      timeoutId = window.setTimeout(() => {
        if (mr.state === 'recording') {
          settleOk();
        } else {
          settleFail(
            'Microphone was opened, but recording did not start. Try Chrome/Edge, disable extensions that block media, or check OS privacy settings for the browser.',
          );
        }
      }, 2000);
    });
  }

  /** Stops recording and returns one audio blob for upload. */
  async stop(): Promise<Blob> {
    const mr = this.mediaRecorder;
    if (!mr || mr.state === 'inactive') {
      throw new Error('No active recording.');
    }

    return new Promise((resolve, reject) => {
      mr.addEventListener(
        'stop',
        () => {
          const type = mr.mimeType || 'audio/webm';
          const blob = new Blob(this.chunks, { type });
          this.teardownRecorder();
          if (blob.size < 256) {
            reject(new Error('Recording was too short. Speak a bit longer, then stop.'));
            return;
          }
          resolve(blob);
        },
        { once: true },
      );
      try {
        mr.stop();
      } catch {
        this.teardownRecorder();
        reject(new Error('Could not stop recording.'));
      }
    });
  }

  /** Stops mic and discards data without producing a blob. */
  cancel(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch {
        /* ignore */
      }
    }
    this.teardownRecorder();
  }

  private teardownRecorder(): void {
    this.mediaRecorder = null;
    this.chunks = [];
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
  }
}

function micAccessMessage(err: unknown): string {
  if (typeof err === 'object' && err !== null && 'name' in err) {
    const name = String((err as { name: unknown }).name);
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
      return 'Microphone access was blocked. Allow the microphone in the browser prompt, or click the lock/site icon in the address bar → Site settings → Microphone → Allow.';
    }
    if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
      return 'No microphone was found. Plug in a headset or mic and try again.';
    }
    if (name === 'NotReadableError' || name === 'TrackStartError') {
      return 'The microphone is busy or cannot be read. Close other apps using the mic (Zoom, Teams, etc.) and try again.';
    }
    if (name === 'OverconstrainedError' || name === 'ConstraintNotSatisfiedError') {
      return 'Microphone constraints could not be satisfied. Try another device or browser.';
    }
    if ('message' in err && typeof (err as { message: unknown }).message === 'string') {
      return (err as { message: string }).message;
    }
  }
  if (err instanceof Error) {
    return err.message;
  }
  return 'Could not access the microphone.';
}
