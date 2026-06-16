import { useParams } from 'react-router'
import { useAgentConversation } from './useAgentConversation'
import { AgentNewConversationPage } from './AgentNewConversationPage'
import { AgentConversationDetailPage } from './AgentConversationDetailPage'

export function AgentConversationPage({ threadId: threadIdProp = '' }: { threadId?: string }) {
  const { threadId: threadIdParam = '' } = useParams()
  const threadId = (threadIdProp || threadIdParam).trim()
  const pageKind = threadId ? 'detail' : 'new'
  const conversation = useAgentConversation(pageKind, { threadId })

  if (threadId)
    return <AgentConversationDetailPage conversation={conversation} />

  return <AgentNewConversationPage conversation={conversation} />
}
