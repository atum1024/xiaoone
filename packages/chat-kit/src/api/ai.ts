import type { AxiosInstance } from 'axios'
import type { AuthFetch } from './agentApi'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface DispatchResult {
  reply: string
  model: string
  domain: string
  is_mock: boolean
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
}

export interface PromptsResult {
  domain: string
  persona: { title: string; greeting: string; tone: string }
  prompts: string[]
}

export function createAiModule(api: AxiosInstance, authFetch: AuthFetch) {
  async function dispatchChat(
    messages: ChatMessage[],
    domain: string = 'general',
  ): Promise<DispatchResult> {
    const r = await api.post('/api/v1/ai/dispatch/', {
      messages,
      domain,
      model: 'xiaoone-demo',
    })
    return r.data.data as DispatchResult
  }

  async function getSuggestedPrompts(domain: string = 'general'): Promise<PromptsResult> {
    const r = await api.get('/api/v1/ai/suggested_prompts/', { params: { domain } })
    return r.data.data as PromptsResult
  }

  async function* streamChat(
    messages: ChatMessage[],
    domain: string = 'general',
  ): AsyncGenerator<{ delta?: string; finish?: boolean; usage?: any; model?: string }, void, void> {
    const resp = await authFetch('/api/v1/ai/stream/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, domain, model: 'xiaoone-demo' }),
    })
    if (!resp.ok || !resp.body) {
      throw new Error(`stream failed: ${resp.status}`)
    }
    const reader = resp.body.getReader()
    const decoder = new TextDecoder()
    let buf = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done)
        break
      buf += decoder.decode(value, { stream: true })
      const lines = buf.split('\n')
      buf = lines.pop() || ''
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed)
          continue
        try {
          yield JSON.parse(trimmed)
          await Promise.resolve()
        }
        catch {
          // 行损坏，跳过
        }
      }
    }
    if (buf.trim()) {
      try {
        yield JSON.parse(buf.trim())
        await Promise.resolve()
      }
      catch {
        // ignore
      }
    }
  }

  return { dispatchChat, getSuggestedPrompts, streamChat }
}
