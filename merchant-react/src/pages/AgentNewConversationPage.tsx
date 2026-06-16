import { XiaooneComposer } from '../components/XiaooneComposer'
import type { UseAgentConversationReturn } from './useAgentConversation'

export function AgentNewConversationPage({ conversation }: { conversation: UseAgentConversationReturn }) {
  return (
    <section className={`mr-agent-thread-page${conversation.isPptEntry ? ' mr-agent-thread-page--ppt' : ''}${conversation.isMarketingMediaEntry ? ' mr-agent-thread-page--media' : ''} is-new-chat`}>
      <div className="mr-agent-thread-panel-group">
        <div className="mr-agent-thread-canvas">
          <div className="mr-agent-hero-stage">
            <div className="mr-agent-hero-inner">
              <h1 className="text-2xl font-bold mb-8">{conversation.heroTitle}</h1>
              <div className="mr-agent-hero-composer">
                <XiaooneComposer
                  {...conversation.composerProps}
                  mediaDockPlacement="inline"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
