import { useState } from 'react';
import BoltIcon from '@mui/icons-material/Bolt';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
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
import { INDIAN_LANGUAGES } from '../../shared/indian-languages';
import { translateEnglishTo } from '../../services/translation.service';
import './TranslationPage.css';

export function TranslationPage() {
  const [englishText, setEnglishText] = useState('');
  const [targetCode, setTargetCode] = useState(INDIAN_LANGUAGES[0].translationCode);
  const [translatedText, setTranslatedText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTranslate = async () => {
    setError(null);
    setLoading(true);
    try {
      const text = await translateEnglishTo(englishText, targetCode);
      setTranslatedText(text);
    } catch (err) {
      setTranslatedText('');
      setError(err instanceof Error ? err.message : 'Translation failed.');
    } finally {
      setLoading(false);
    }
  };

  const clear = () => {
    setEnglishText('');
    setTranslatedText('');
    setError(null);
  };

  return (
    <div className="feature feature--translate">
      <Card className="feature-card">
        <div className="feature-card__glow" aria-hidden="true" />
        <CardHeader
          className="feature-card__header"
          avatar={
            <div className="feature-icon feature-icon--translate" aria-hidden="true">
              <TranslateIcon />
            </div>
          }
          title={<span className="feature-title">English → Indian languages</span>}
          subheader={
            <span className="feature-subtitle">
              Pick a language, paste English — the app calls your backend at <code>POST /translate</code> (see{' '}
              <code>VITE_API_BASE_URL</code>).
            </span>
          }
        />

        <CardContent className="translation-body">
          <FormControl fullWidth className="field-tint field-tint--indigo">
            <InputLabel id="target-lang-label">Target language</InputLabel>
            <Select
              labelId="target-lang-label"
              label="Target language"
              value={targetCode}
              onChange={(e) => setTargetCode(e.target.value)}
            >
              {INDIAN_LANGUAGES.map((lang) => (
                <MenuItem key={lang.translationCode} value={lang.translationCode}>
                  {lang.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            multiline
            rows={5}
            label="English text"
            placeholder="Type or paste English text here…"
            value={englishText}
            onChange={(e) => setEnglishText(e.target.value)}
            className="field-tint field-tint--slate"
            helperText={`${englishText.length} characters`}
            FormHelperTextProps={{ sx: { textAlign: 'right' } }}
          />

          {error && (
            <div className="translation-error" role="alert">
              <ErrorOutlineIcon />
              <span>{error}</span>
            </div>
          )}

          <div className="output-panel">
            <TextField
              fullWidth
              multiline
              rows={5}
              label="Translation"
              value={translatedText}
              placeholder="Translation appears here…"
              InputProps={{ readOnly: true }}
              className="output-panel__field"
            />
          </div>
        </CardContent>

        <CardActions className="feature-actions">
          <Box sx={{ flex: 1 }} />
          <Button
            variant="outlined"
            className="btn-secondary"
            onClick={clear}
            disabled={loading}
            startIcon={<RefreshIcon />}
          >
            Clear
          </Button>
          <Button
            variant="contained"
            className="btn-primary-gradient"
            onClick={handleTranslate}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <BoltIcon />}
          >
            {loading ? 'Translating…' : 'Translate'}
          </Button>
        </CardActions>
      </Card>
    </div>
  );
}
