import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import GraphicEqIcon from '@mui/icons-material/GraphicEq';
import HearingIcon from '@mui/icons-material/Hearing';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import InfoIcon from '@mui/icons-material/Info';
import MicIcon from '@mui/icons-material/Mic';
import MicNoneIcon from '@mui/icons-material/MicNone';
import RefreshIcon from '@mui/icons-material/Refresh';
import StopCircleIcon from '@mui/icons-material/StopCircle';
import TipsAndUpdatesIcon from '@mui/icons-material/TipsAndUpdates';
import TranslateIcon from '@mui/icons-material/Translate';
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from '@mui/material';
import { audioRecording } from '../../services/audio-recording.service';
import { transcribe } from '../../services/speech-to-text.service';
import { translate } from '../../services/translation.service';
import {
  SPEECH_INPUT_LANGUAGES,
  SPEECH_TRANSLATE_TARGETS,
  speechCodeToTranslationCode,
} from '../../shared/indian-languages';
import './SpeechToTextPage.css';

function formatElapsed(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function SpeechToTextPage() {
  const [selectedLang, setSelectedLang] = useState(SPEECH_INPUT_LANGUAGES[0].speechRecognitionCode);
  const [translateTargetCode, setTranslateTargetCode] = useState('hi');
  const [heardText, setHeardText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [startingMic, setStartingMic] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [elapsedLabel, setElapsedLabel] = useState('0:00');

  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordStartedAtRef = useRef(0);

  const recordingSupported = audioRecording.isSupported();
  const micUnsupportedHint = audioRecording.unsupportedReason();

  const translateTargetOptions = useMemo(() => {
    const source = speechCodeToTranslationCode(selectedLang);
    return SPEECH_TRANSLATE_TARGETS.filter((l) => l.translationCode !== source);
  }, [selectedLang]);

  const clearElapsedTimer = useCallback(() => {
    if (elapsedTimerRef.current !== null) {
      clearInterval(elapsedTimerRef.current);
      elapsedTimerRef.current = null;
    }
  }, []);

  const beginElapsedTimer = useCallback(() => {
    clearElapsedTimer();
    recordStartedAtRef.current = Date.now();
    setElapsedLabel('0:00');
    elapsedTimerRef.current = setInterval(() => {
      const sec = Math.floor((Date.now() - recordStartedAtRef.current) / 1000);
      setElapsedLabel(formatElapsed(sec));
    }, 500);
  }, [clearElapsedTimer]);

  useEffect(() => () => clearElapsedTimer(), [clearElapsedTimer]);

  const translateFullHeard = useCallback(
    async (textOverride?: string) => {
      const text = (textOverride ?? heardText).trim();
      if (!text) {
        return '';
      }
      const source = speechCodeToTranslationCode(selectedLang);
      const target = translateTargetCode;
      setTranslating(true);
      try {
        return await translate(text, source, target);
      } finally {
        setTranslating(false);
      }
    },
    [heardText, selectedLang, translateTargetCode],
  );

  const onSpokenLanguageChange = (code: string) => {
    setSelectedLang(code);
    const source = speechCodeToTranslationCode(code);
    const options = SPEECH_TRANSLATE_TARGETS.filter((l) => l.translationCode !== source);
    const preferred = source === 'en' ? 'hi' : 'en';
    const next =
      options.find((l) => l.translationCode === preferred)?.translationCode ??
      options[0]?.translationCode ??
      'en';
    setTranslateTargetCode(next);
  };

  const start = async () => {
    setError(null);
    setStartingMic(true);
    try {
      await audioRecording.start();
      setStartingMic(false);
      setRecording(true);
      beginElapsedTimer();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start recording.');
      setRecording(false);
      setStartingMic(false);
    }
  };

  const stop = async () => {
    if (!recording) {
      return;
    }
    setRecording(false);
    clearElapsedTimer();
    setElapsedLabel('0:00');
    setTranscribing(true);
    setError(null);

    try {
      const blob = await audioRecording.stop();
      const text = await transcribe(blob, selectedLang);
      const updatedHeard = heardText ? `${heardText} ${text}`.trim() : text;
      setHeardText(updatedHeard);
      setTranscribing(false);

      const translation = await translateFullHeard(updatedHeard);
      setTranslatedText(translation);
    } catch (err) {
      setTranscribing(false);
      setTranslating(false);
      setError(err instanceof Error ? err.message : 'Transcription or translation failed.');
    }
  };

  const retranslate = async () => {
    setError(null);
    try {
      const text = await translateFullHeard();
      setTranslatedText(text);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Translation failed.');
    }
  };

  const clear = () => {
    if (recording) {
      audioRecording.cancel();
      setRecording(false);
      clearElapsedTimer();
      setElapsedLabel('0:00');
    }
    setHeardText('');
    setTranslatedText('');
    setError(null);
  };

  const busy = startingMic || recording || transcribing || translating;

  const headerIcon = transcribing || translating ? (
    <HourglassTopIcon />
  ) : recording ? (
    <GraphicEqIcon />
  ) : startingMic ? (
    <MicIcon />
  ) : (
    <MicNoneIcon />
  );

  return (
    <div className="feature feature--speech">
      <Card className={`feature-card${busy ? ' feature-card--recording' : ''}`}>
        <div className="feature-card__glow feature-card__glow--speech" aria-hidden="true" />
        {(recording || startingMic) && <div className="listening-ripple" aria-hidden="true" />}

        <CardHeader
          className="feature-card__header"
          avatar={
            <div
              className={`feature-icon feature-icon--speech${recording || startingMic ? ' feature-icon--pulse' : ''}`}
              aria-hidden="true"
            >
              {headerIcon}
            </div>
          }
          title={<span className="feature-title">Speech to text</span>}
          subheader={
            <span className="feature-subtitle">
              Record with your microphone. We transcribe what you said, show it first, then translate it via{' '}
              <code>/translate</code>.
            </span>
          }
        />

        <CardContent className="speech-body">
          {!recordingSupported && (
            <div className="speech-banner speech-banner--warn" role="alert">
              <InfoIcon />
              <span>{micUnsupportedHint}</span>
            </div>
          )}

          {startingMic && (
            <div className="recording-status recording-status--starting" role="status" aria-live="polite">
              <CircularProgress size={32} className="recording-status__spinner" />
              <div className="recording-status__text">
                <strong>Connecting to your microphone</strong>
                <p>
                  Look for a browser prompt and choose <strong>Allow</strong>. This step only happens once per
                  session.
                </p>
              </div>
            </div>
          )}

          {recording && (
            <div className="recording-status recording-status--live" role="status" aria-live="polite">
              <span className="rec-badge" aria-hidden="true">
                REC
              </span>
              <div className="recording-status__text">
                <strong>Listening — we are recording now</strong>
                <p>
                  Speak clearly. Elapsed time: <span className="elapsed-mono">{elapsedLabel}</span>
                </p>
              </div>
            </div>
          )}

          <FormControl fullWidth className="field-tint field-tint--speech">
            <InputLabel id="speech-lang-label">Spoken language</InputLabel>
            <Select
              labelId="speech-lang-label"
              label="Spoken language"
              value={selectedLang}
              onChange={(e) => onSpokenLanguageChange(e.target.value)}
              disabled={busy}
            >
              {SPEECH_INPUT_LANGUAGES.map((lang) => (
                <MenuItem key={lang.speechRecognitionCode} value={lang.speechRecognitionCode}>
                  {lang.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {error && (
            <div className="speech-banner speech-banner--error" role="alert">
              <ErrorOutlineIcon />
              <span>{error}</span>
            </div>
          )}

          <div className={`transcript-panel${recording || startingMic ? ' transcript-panel--live' : ''}`}>
            <div className="transcript-panel__label">
              <HearingIcon className="transcript-panel__label-icon" />
              <span>What we heard</span>
              {(recording || startingMic) && (
                <span
                  className={`live-dot${startingMic ? ' live-dot--pending' : ''}`}
                  aria-hidden="true"
                />
              )}
              {transcribing && <span className="panel-status">Transcribing…</span>}
            </div>
            <TextField
              fullWidth
              multiline
              rows={5}
              value={heardText}
              placeholder="Your speech-to-text transcript appears here first…"
              InputProps={{ readOnly: true }}
              className="transcript-panel__field"
            />
          </div>

          <FormControl fullWidth className="field-tint field-tint--speech">
            <InputLabel id="translate-target-label">Translate to</InputLabel>
            <Select
              labelId="translate-target-label"
              label="Translate to"
              value={translateTargetCode}
              onChange={(e) => setTranslateTargetCode(e.target.value)}
              disabled={busy}
            >
              {translateTargetOptions.map((lang) => (
                <MenuItem key={lang.translationCode} value={lang.translationCode}>
                  {lang.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <div className="transcript-panel transcript-panel--translation">
            <div className="transcript-panel__label">
              <TranslateIcon className="transcript-panel__label-icon transcript-panel__label-icon--translate" />
              <span>Translation</span>
              {translating && <span className="panel-status">Translating…</span>}
            </div>
            <TextField
              fullWidth
              multiline
              rows={5}
              value={translatedText}
              placeholder="Translation of the transcript appears here…"
              InputProps={{ readOnly: true }}
              className="transcript-panel__field"
            />
          </div>

          <p className="speech-hint">
            <TipsAndUpdatesIcon className="speech-hint__icon" />
            Your backend must allow CORS from this app’s origin. Expected request:{' '}
            <code>POST /speech-to-text</code> with multipart field <code>file</code> (audio upload).
          </p>
        </CardContent>

        <CardActions className="feature-actions">
          <Box sx={{ flex: 1 }} />
          <Button
            variant="outlined"
            className="btn-secondary btn-secondary--speech"
            onClick={clear}
            disabled={
              startingMic ||
              transcribing ||
              translating ||
              (!heardText && !translatedText && !error && !recording)
            }
            startIcon={<RefreshIcon />}
          >
            Clear
          </Button>
          {heardText && !recording && !startingMic && !transcribing && (
            <Button
              variant="outlined"
              className="btn-secondary btn-secondary--speech"
              onClick={retranslate}
              disabled={translating}
              startIcon={<TranslateIcon />}
            >
              Retranslate
            </Button>
          )}
          {transcribing ? (
            <Button variant="contained" className="btn-record" disabled startIcon={<CircularProgress size={22} color="inherit" />}>
              Transcribing…
            </Button>
          ) : translating ? (
            <Button variant="contained" className="btn-record" disabled startIcon={<CircularProgress size={22} color="inherit" />}>
              Translating…
            </Button>
          ) : startingMic ? (
            <Button variant="contained" className="btn-record btn-record--waiting" disabled startIcon={<CircularProgress size={22} color="inherit" />}>
              Connecting…
            </Button>
          ) : recording ? (
            <Button variant="contained" color="error" className="btn-stop" onClick={stop} startIcon={<StopCircleIcon />}>
              Stop &amp; send
            </Button>
          ) : (
            <Button
              variant="contained"
              className="btn-record"
              onClick={start}
              disabled={!recordingSupported}
              startIcon={<FiberManualRecordIcon />}
            >
              Start recording
            </Button>
          )}
        </CardActions>
      </Card>
    </div>
  );
}
