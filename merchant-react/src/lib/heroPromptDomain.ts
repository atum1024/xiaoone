/**
 * Hero 页「推荐对话 / 问候语」与组合器里选中的业务对齐。
 * AI 服务按 domain 返回文案；agent 线程仍用各业务的 agentDomain，两者解耦。
 */

import type { PromptsResult } from '@xiaoone/chat-kit'
import type { BusinessKey } from './composer'

/** 与 backend/shared/llm.py 中 DOMAIN_* 的 key 一致 */
export const HERO_SUGGESTED_DOMAIN: Record<BusinessKey, string> = {
  consultant: 'development',
  software: 'development',
  automation: 'automation',
  marketing: 'marketing',
  support: 'support',
  agency: 'agency',
  feedback: 'feedback',
}

export function suggestedPromptDomain(business: BusinessKey): string {
  return HERO_SUGGESTED_DOMAIN[business] ?? 'general'
}

export function personalizeHeroCopy(text: string, merchant: string): string {
  const m = (merchant || '').trim() || '本商户'
  return text
    .replace(/\{merchant\}/g, m)
    .replace(/Acme Demo Shop/g, m)
}

export function applyPersonalization(res: PromptsResult, merchant: string): PromptsResult {
  return {
    ...res,
    persona: {
      ...res.persona,
      greeting: personalizeHeroCopy(res.persona.greeting, merchant),
    },
    prompts: res.prompts.map((p: string) => personalizeHeroCopy(p, merchant)),
  }
}
