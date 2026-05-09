/**
 * 媒体生成失败分桶 → UI 文案 / CTA 的单一映射。后端 `error_code`（见
 * agent_core/error_codes.py）变化时同步更新这里即可。
 */

import type { AgentGenerationTask } from '@xiaoone/chat-kit'

export type GenerationErrorCode =
  | 'concurrency_limit'
  | 'insufficient_balance'
  | 'bad_api_key'
  | 'upstream_timeout'
  | 'content_policy'
  | 'network_error'
  | 'rate_limited'
  | 'unknown'

const KNOWN: GenerationErrorCode[] = [
  'concurrency_limit',
  'insufficient_balance',
  'bad_api_key',
  'upstream_timeout',
  'content_policy',
  'network_error',
  'rate_limited',
  'unknown',
]

export function normalizeErrorCode(code: string | null | undefined): GenerationErrorCode {
  if (!code) return 'unknown'
  return (KNOWN as string[]).includes(code) ? (code as GenerationErrorCode) : 'unknown'
}

export function localeKeyForErrorCode(code: string | null | undefined): string {
  return `agent.gen.err.${normalizeErrorCode(code)}`
}

export type GenerationErrorAction = 'retry' | 'refresh' | 'copyPrompt' | 'recharge' | 'contactAdmin'

/** 不同分桶下显示的按钮：避免「排队满了」时引导用户立刻重试。 */
export function actionsForErrorCode(code: string | null | undefined, task: AgentGenerationTask): GenerationErrorAction[] {
  const c = normalizeErrorCode(code)
  const isVideoWithUpstream = task.modality === 'video' && !!task.upstream_task_id
  switch (c) {
    case 'concurrency_limit':
    case 'rate_limited':
      return isVideoWithUpstream ? ['refresh', 'copyPrompt'] : ['copyPrompt']
    case 'insufficient_balance':
      return ['recharge', 'copyPrompt']
    case 'bad_api_key':
      return ['copyPrompt']
    case 'content_policy':
      return ['copyPrompt']
    case 'upstream_timeout':
      return isVideoWithUpstream ? ['refresh', 'retry', 'copyPrompt'] : ['retry', 'copyPrompt']
    case 'network_error':
      return ['retry', 'copyPrompt']
    default:
      return isVideoWithUpstream
        ? ['refresh', 'retry', 'copyPrompt']
        : ['retry', 'copyPrompt']
  }
}
