import { XiaooneComposer } from '../components/XiaooneComposer'
import { ChatStream } from '../components/ChatStream'
import { PresentationPreviewPane } from '../components/PresentationPreviewPane'
import type { UseAgentConversationReturn } from './useAgentConversation'

export function AgentConversationDetailPage({
  conversation,
}: {
  conversation: UseAgentConversationReturn
}) {
  const detail = conversation.detail

  if (!detail)
    return null

  return (
    <section className={`mr-agent-thread-page${conversation.isPptEntry ? ' mr-agent-thread-page--ppt' : ''}${conversation.isMarketingMediaEntry ? ' mr-agent-thread-page--media' : ''}`}>
      <div className="mr-agent-thread-panel-group">
        <div className="mr-agent-thread-canvas">
          <div className={`flex-1 min-h-0 flex flex-col${conversation.isPptEntry ? ' mr-ppt-chat-column' : ''}`}>
            <div className="flex-1 min-h-0 flex flex-col">
              {detail.selectedId && !detail.threadDetail && !detail.canRenderSelectedShell ? (
                <div className="flex h-full flex-col gap-3 px-6 py-6 text-sm text-[var(--xiaoone-fg-soft)]">
                  {detail.error ? (
                    <div className="max-w-xl rounded-lg border border-[var(--xiaoone-border-soft)] bg-[var(--xiaoone-bg-elev)] p-4">
                      <strong className="block text-[var(--xiaoone-fg)]">对话加载失败</strong>
                      <p className="mt-1 text-[var(--xiaoone-fg-soft)]">{detail.error}</p>
                      <button type="button" className="mr-btn mt-3" onClick={() => void detail.loadThreadDetail(detail.selectedId)}>
                        重新加载
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="h-4 w-32 rounded bg-[var(--xiaoone-bg-soft)]" />
                      <div className="h-20 max-w-2xl rounded-lg bg-[var(--xiaoone-bg-soft)]" />
                      <div className="ml-auto h-16 w-2/5 rounded-lg bg-[var(--xiaoone-bg-soft)]" />
                      <div className="h-32 max-w-3xl rounded-lg bg-[var(--xiaoone-bg-soft)]" />
                    </>
                  )}
                </div>
              ) : (
                <ChatStream
                  messages={detail.visibleMessages as any}
                  domain={conversation.entry}
                  onRefreshTask={detail.refreshGenerationTask}
                  onRetryTask={detail.retryGenerationTask}
                  onRouteTo={detail.handleRouteSuggestion}
                  onUseImagesForVideo={detail.handleUseImagesForVideo}
                >
                  <div className="flex h-full items-center justify-center text-sm text-[var(--xiaoone-fg-mute)]">
                    暂无消息
                  </div>
                </ChatStream>
              )}
            </div>
            {detail.takeoverText ? (
              <div className="mx-4 mb-3 rounded-lg border border-[var(--xiaoone-border-soft)] bg-[var(--xiaoone-bg-elev)] px-3 py-2 text-sm text-[var(--xiaoone-fg-soft)]">
                {detail.takeoverText}
              </div>
            ) : null}
            <div className="mr-thread-composer">
              <XiaooneComposer
                {...conversation.composerProps}
                mediaDockPlacement="drawer"
              />
            </div>
          </div>
          {conversation.isPptEntry && (
            <div className="mr-ppt-preview-pane">
              <PresentationPreviewPane messages={detail.visibleMessages as any} pptOptions={detail.pptOptions} />
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
