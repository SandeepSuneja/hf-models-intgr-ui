import { useEffect, useRef, useState } from 'react';
import ChatIcon from '@mui/icons-material/Chat';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import SendIcon from '@mui/icons-material/Send';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControlLabel,
  IconButton,
  Switch,
  TextField,
  Tooltip,
} from '@mui/material';
import { sendChatMessage, type ChatMessage } from '../../services/chat.service';
import './ChatPage.css';

const STARTER_PROMPTS = [
  'Explain quantum computing in simple terms',
  'Write a Python function to merge two sorted lists',
  'What are good practices for REST API design?',
];

export function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enableThinking, setEnableThinking] = useState(false);
  const [modelName, setModelName] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, error]);

  const submitMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) {
      return;
    }

    const userMessage: ChatMessage = { role: 'user', content: trimmed };
    const conversation = [...messages, userMessage];
    setMessages(conversation);
    setInput('');
    setError(null);
    setLoading(true);

    try {
      const result = await sendChatMessage(
        conversation.map(({ role, content }) => ({ role, content })),
        { enableThinking },
      );
      setModelName(result.model);
      setMessages((prev) => [...prev, result.message]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chat request failed.');
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleSend = () => {
    void submitMessage(input);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void submitMessage(input);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setError(null);
    setModelName(null);
    inputRef.current?.focus();
  };

  return (
    <div className="feature feature--chat">
      <div className="chat-shell">
        <header className="chat-header">
          <div className="chat-header__icon" aria-hidden="true">
            <ChatIcon />
          </div>
          <div className="chat-header__titles">
            <span className="chat-header__title">Chat</span>
            <span className="chat-header__subtitle">
              Multi-turn conversation via <code>POST /chat</code>
              {modelName ? ` · ${modelName}` : ''}
            </span>
          </div>
          <Tooltip title="Start a new conversation">
            <Button
              variant="outlined"
              size="small"
              onClick={clearChat}
              disabled={loading || (messages.length === 0 && !error)}
              startIcon={<RefreshIcon />}
              sx={{ borderRadius: '999px', flexShrink: 0 }}
            >
              New chat
            </Button>
          </Tooltip>
        </header>

        <div className="chat-messages" role="log" aria-live="polite" aria-relevant="additions">
          {messages.length === 0 && !loading ? (
            <div className="chat-empty">
              <SmartToyOutlinedIcon className="chat-empty__icon" aria-hidden="true" />
              <p className="chat-empty__title">How can I help you today?</p>
              <p className="chat-empty__hint">
                Ask anything — your messages are sent to the local Qwen chat backend with full conversation history.
              </p>
              <div className="chat-suggestions">
                {STARTER_PROMPTS.map((prompt) => (
                  <Chip
                    key={prompt}
                    label={prompt}
                    variant="outlined"
                    className="chat-suggestion"
                    onClick={() => void submitMessage(prompt)}
                    disabled={loading}
                  />
                ))}
              </div>
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`chat-message chat-message--${message.role}`}
              >
                <div className="chat-message__avatar" aria-hidden="true">
                  {message.role === 'user' ? <PersonOutlineIcon fontSize="small" /> : <SmartToyOutlinedIcon fontSize="small" />}
                </div>
                <div className="chat-message__bubble">
                  {message.thinking && (
                    <div className="chat-message__thinking">
                      <span className="chat-message__thinking-label">Reasoning</span>
                      {message.thinking}
                    </div>
                  )}
                  {message.content}
                </div>
              </div>
            ))
          )}

          {loading && (
            <div className="chat-typing" aria-live="polite">
              <CircularProgress size={18} />
              <span>Assistant is thinking…</span>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {error && (
          <div className="chat-error" role="alert">
            <ErrorOutlineIcon />
            <span>{error}</span>
          </div>
        )}

        <div className="chat-composer">
          <div className="chat-composer__row">
            <TextField
              inputRef={inputRef}
              className="chat-composer__input"
              fullWidth
              multiline
              minRows={1}
              maxRows={6}
              placeholder="Message the assistant…"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              aria-label="Chat message"
            />
            <Tooltip title="Send message">
              <span>
                <IconButton
                  className="chat-send-btn"
                  color="primary"
                  onClick={handleSend}
                  disabled={loading || !input.trim()}
                  aria-label="Send message"
                >
                  {loading ? <CircularProgress size={22} color="inherit" /> : <SendIcon />}
                </IconButton>
              </span>
            </Tooltip>
          </div>

          <div className="chat-composer__actions">
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={enableThinking}
                  onChange={(event) => setEnableThinking(event.target.checked)}
                  disabled={loading}
                />
              }
              label="Enable reasoning (Qwen thinking mode)"
            />
            <Box className="chat-composer__hint">Enter to send · Shift+Enter for new line</Box>
          </div>
        </div>
      </div>
    </div>
  );
}
