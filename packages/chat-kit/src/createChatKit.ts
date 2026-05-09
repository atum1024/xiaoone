import type { AxiosInstance } from 'axios'
import { createAgentApi, type AuthFetch } from './api/agentApi'
import { createAiModule } from './api/ai'
import { assignDefined, createChatApiClient } from './api/chatApi'
import { createKefuApi } from './api/kefuApi'
import { createTeamChatApi } from './api/teamChatApi'
import { AgentLiveSocket } from './realtime/agentLiveSocket'

export interface ChatKitContext {
  readAccessToken: () => string | null
  apiClient: AxiosInstance
  authFetch: AuthFetch
}

export function createChatKit(ctx: ChatKitContext) {
  const { ChatAPI, ChannelsAPI } = createChatApiClient(ctx.apiClient)
  const { TeamChatAPI } = createTeamChatApi(ctx.apiClient)
  const kefu = createKefuApi(ctx.apiClient)
  const agent = createAgentApi(ctx.apiClient, ctx.authFetch)
  const ai = createAiModule(ctx.apiClient, ctx.authFetch)

  function createAgentLiveSocket(
    listeners: ConstructorParameters<typeof AgentLiveSocket>[1],
    options: ConstructorParameters<typeof AgentLiveSocket>[2] = {},
  ) {
    return new AgentLiveSocket(ctx.readAccessToken, listeners, options)
  }

  return {
    apiClient: ctx.apiClient,
    ChatAPI,
    ChannelsAPI,
    TeamChatAPI,
    createAgentLiveSocket,
    AgentLiveSocket,
    assignDefined,
    ...kefu,
    ...agent,
    ...ai,
  }
}
