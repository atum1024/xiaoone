/**
 * 必须在任意 `getChatKit()` 之前执行（由 `main.ts` 首行 side-effect import 保证）。
 */
import { initChatKit } from '@xiaoone/chat-kit'
import { api } from './httpClient'
import { readAccessToken } from './authEvents'
import { authFetch } from './authFetch'

initChatKit({ readAccessToken, apiClient: api, authFetch })
