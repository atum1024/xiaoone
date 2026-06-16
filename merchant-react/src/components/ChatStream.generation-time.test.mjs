import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const dir = dirname(fileURLToPath(import.meta.url))
const chatStream = readFileSync(join(dir, 'ChatStream.tsx'), 'utf8')
const agentApi = readFileSync(join(dir, '../../../packages/chat-kit/src/api/agentApi.ts'), 'utf8')

const requiredChatStreamSnippets = [
  'function taskStartedAt(task: AgentGenerationTask, messageStartedAt?: string)',
  'const attemptTs = parseTimeMs(task.result?.attempt_started_at)',
  'if (Number.isFinite(attemptTs))',
  'if (Number.isFinite(messageTs) && messageTs > fallbackTs)',
  'taskLiveDetail(task, now, locale, liveDraft, createdAt)',
]

for (const snippet of requiredChatStreamSnippets) {
  if (!chatStream.includes(snippet)) {
    throw new Error(`ChatStream.tsx is missing generation elapsed-time guard: ${snippet}`)
  }
}

if (!agentApi.includes('attempt_started_at?: string')) {
  throw new Error('AgentGenerationTask.result must expose attempt_started_at for generation elapsed time')
}

console.log('ChatStream generation elapsed-time check passed')
