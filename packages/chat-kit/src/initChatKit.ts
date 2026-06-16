import type { ChatKitContext } from './createChatKit'
import { createChatKit } from './createChatKit'

const CHAT_KIT_SINGLETON_KEY = '__xiaooneChatKitSingleton'

type ChatKitSingletonHost = typeof globalThis & {
  [CHAT_KIT_SINGLETON_KEY]?: ReturnType<typeof createChatKit> | null
}

const singletonHost = globalThis as ChatKitSingletonHost

/** 在应用入口最早调用一次，再使用 {@link getChatKit}。 */
export function initChatKit(ctx: ChatKitContext) {
  singletonHost[CHAT_KIT_SINGLETON_KEY] = createChatKit(ctx)
}

export function getChatKit() {
  const singleton = singletonHost[CHAT_KIT_SINGLETON_KEY]
  if (!singleton)
    throw new Error('[@xiaoone/chat-kit] Call initChatKit(...) before getChatKit().')
  return singleton
}
