// Claude API service
import Anthropic from '@anthropic-ai/sdk';
import { ANTHROPIC_API_KEY } from '$env/static/private';

// Initialize client
const client = new Anthropic({
  apiKey: ANTHROPIC_API_KEY,
});

export interface StreamOptions {
  system: string;
  userMessage: string;
  maxTokens?: number;
  model?: string;
}

// Create a streaming message
export async function* streamMessage(options: StreamOptions): AsyncGenerator<string> {
  const { system, userMessage, maxTokens = 4096, model = 'claude-sonnet-4-20250514' } = options;

  const stream = client.messages.stream({
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

  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: userMessage }],
  });

  const textBlock = response.content.find(block => block.type === 'text');
  return textBlock?.text || '';
}

export { client };
