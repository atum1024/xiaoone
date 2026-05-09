import type { ChatKitContext } from './createChatKit'
import { createChatKit } from './createChatKit'

let singleton: ReturnType<typeof createChatKit> | null = null

/** 在应用入口最早调用一次，再使用 {@link getChatKit}。 */
export function initChatKit(ctx: ChatKitContext) {
  singleton = createChatKit(ctx)
}

export function getChatKit() {
  if (!singleton)
    throw new Error('[@xiaoone/chat-kit] Call initChatKit(...) before getChatKit().')
  return singleton
}
