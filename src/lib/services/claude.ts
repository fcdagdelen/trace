// Claude API service
import Anthropic from '@anthropic-ai/sdk';
import { env } from '$env/dynamic/private';

// Get client lazily to allow env vars to be loaded at runtime
function getClient(): Anthropic {
  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set');
  }
  return new Anthropic({ apiKey });
}

export interface StreamOptions {
  system: string;
  userMessage: string;
  maxTokens?: number;
  model?: string;
}

// Create a streaming message
export async function* streamMessage(options: StreamOptions): AsyncGenerator<string> {
  const { system, userMessage, maxTokens = 4096, model = 'claude-sonnet-4-20250514' } = options;

  const stream = getClient().messages.stream({
    model,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: userMessage }],
  });

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      yield event.delta.text;
    }
  }
}

// Non-streaming call for kami-gami selection
export async function callClaude(options: StreamOptions): Promise<string> {
  const { system, userMessage, maxTokens = 1024, model = 'claude-sonnet-4-20250514' } = options;

  const response = await getClient().messages.create({
    model,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: userMessage }],
  });

  const textBlock = response.content.find(block => block.type === 'text');
  return textBlock?.text || '';
}
