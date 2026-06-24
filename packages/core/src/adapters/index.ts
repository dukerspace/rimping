import type { LLMProvider, OptimizeResult, ProviderName } from '../types.js'

export class OpenAIAdapter implements LLMProvider {
  name: ProviderName = 'openai'

  formatPrompt(result: OptimizeResult): string {
    return JSON.stringify(
      {
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: result.optimized },
        ],
      },
      null,
      2,
    )
  }

  async send(prompt: string): Promise<string> {
    return `[mock-openai] ${prompt.slice(0, 100)}...`
  }
}

export class ClaudeAdapter implements LLMProvider {
  name: ProviderName = 'claude'

  formatPrompt(result: OptimizeResult): string {
    return `<system>You are a helpful assistant.</system>\n<user>\n${result.optimized}\n</user>`
  }

  async send(prompt: string): Promise<string> {
    return `[mock-claude] ${prompt.slice(0, 100)}...`
  }
}

export class GeminiAdapter implements LLMProvider {
  name: ProviderName = 'gemini'

  formatPrompt(result: OptimizeResult): string {
    return JSON.stringify(
      {
        contents: [{ parts: [{ text: result.optimized }] }],
      },
      null,
      2,
    )
  }

  async send(prompt: string): Promise<string> {
    return `[mock-gemini] ${prompt.slice(0, 100)}...`
  }
}

export class MockAdapter implements LLMProvider {
  name: ProviderName = 'mock'

  formatPrompt(result: OptimizeResult): string {
    return result.optimized
  }

  async send(prompt: string): Promise<string> {
    return prompt
  }
}

const adapters: Record<ProviderName, LLMProvider> = {
  openai: new OpenAIAdapter(),
  claude: new ClaudeAdapter(),
  gemini: new GeminiAdapter(),
  mock: new MockAdapter(),
}

export function getAdapter(name: ProviderName): LLMProvider {
  return adapters[name] ?? adapters.mock
}
