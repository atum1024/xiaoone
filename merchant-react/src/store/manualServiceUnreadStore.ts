import { create } from 'zustand'

/** 与运营端「用户服务」五条业务线对齐的智能团队红点 bucket */
export type ManualServiceBusinessKey = 'software' | 'marketing' | 'support' | 'agency' | 'feedback'

const ZERO: Record<ManualServiceBusinessKey, number> = {
  software: 0,
  marketing: 0,
  support: 0,
  agency: 0,
  feedback: 0,
}

/** 根据线程 domain + plugin 判断是否计入「人工模式服务」侧栏红点 */
export function manualServiceKeyFromThread(domain: string, pluginKey: string): ManualServiceBusinessKey | null {
  if (domain === 'marketing')
    return 'marketing'
  if (domain === 'support')
    return 'support'
  if (domain === 'agency')
    return 'agency'
  if (domain === 'feedback')
    return 'feedback'
  if (domain === 'general' && pluginKey === 'outsource')
    return 'software'
  return null
}

interface ManualServiceUnreadState {
  counts: Record<ManualServiceBusinessKey, number>
  bump: (key: ManualServiceBusinessKey) => void
  clear: (key: ManualServiceBusinessKey) => void
}

export const useManualServiceUnreadStore = create<ManualServiceUnreadState>(set => ({
  counts: { ...ZERO },
  bump: key =>
    set(s => ({ counts: { ...s.counts, [key]: s.counts[key] + 1 } })),
  clear: key =>
    set(s => ({ counts: { ...s.counts, [key]: 0 } })),
}))
