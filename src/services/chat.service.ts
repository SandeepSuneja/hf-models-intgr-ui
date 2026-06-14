import { apiUrl } from '../core/api-url';
import { parseHttpError } from '../core/http-utils';

export type ChatRole = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
  thinking?: string;
}

export interface ChatRequestMessage {
  role: ChatRole;
  content: string;
}

export interface ChatOptions {
  maxNewTokens?: number;
  enableThinking?: boolean;
  temperature?: number;
  topP?: number;
}

export interface ChatCompletionResult {
  message: ChatMessage;
  model: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
  };
}

function parseChatResponse(res: unknown): ChatCompletionResult {
  if (!res || typeof res !== 'object') {
    throw new Error('Invalid response from chat service.');
  }

  const o = res as Record<string, unknown>;
  const message = o['message'];
  if (!message || typeof message !== 'object') {
    throw new Error('No assistant message in response.');
  }

  const msg = message as Record<string, unknown>;
  const role = msg['role'];
  const content = msg['content'];
  if (role !== 'assistant' || typeof content !== 'string') {
    throw new Error('Assistant reply was missing or invalid.');
  }

  const assistantMessage: ChatMessage = {
    role: 'assistant',
    content: content.trim(),
  };

  const thinking = msg['thinking'];
  if (typeof thinking === 'string' && thinking.trim()) {
    assistantMessage.thinking = thinking.trim();
  }

  const model = typeof o['model'] === 'string' ? o['model'] : 'unknown';
  const usageRaw = o['usage'];
  const usage =
    usageRaw && typeof usageRaw === 'object'
      ? {
          prompt_tokens: Number((usageRaw as Record<string, unknown>)['prompt_tokens']) || 0,
          completion_tokens: Number((usageRaw as Record<string, unknown>)['completion_tokens']) || 0,
        }
      : { prompt_tokens: 0, completion_tokens: 0 };

  if (!assistantMessage.content) {
    throw new Error('Empty reply from assistant.');
  }

  return { message: assistantMessage, model, usage };
}

export async function sendChatMessage(
  messages: ChatRequestMessage[],
  options: ChatOptions = {},
): Promise<ChatCompletionResult> {
  if (!messages.length) {
    throw new Error('At least one message is required.');
  }

  const body: Record<string, unknown> = { messages };
  if (options.maxNewTokens != null) {
    body.max_new_tokens = options.maxNewTokens;
  }
  if (options.enableThinking != null) {
    body.enable_thinking = options.enableThinking;
  }
  if (options.temperature != null) {
    body.temperature = options.temperature;
  }
  if (options.topP != null) {
    body.top_p = options.topP;
  }

  const response = await fetch(apiUrl('/chat'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw await parseHttpError(response, 'Chat request failed');
  }

  return parseChatResponse(await response.json());
}
