import { useMemo, useState } from 'react'
import './PresentationPreviewPane.css'
import { Icon } from './Icon'
import { toast } from '@xiaoone/react-ui'
import { downloadMessageArtifact } from '../lib/artifactDownload'
import type { UIChatMessage } from './ChatStream'
import type { PptComposerOptions } from './XiaooneComposer'
import { usePreferences } from '../app/preferences'

function templateLabel(t: (key: string, fallback?: string) => string, key: string) {
  return t(`composer.presentation.template.${key}`, key)
}

function toneLabel(t: (key: string, fallback?: string) => string, key: string) {
  return t(`composer.ppt.tone.${key}`, key)
}

interface PresentationSlide {
  title?: string
  subtitle?: string
  bullets?: string[]
  speaker_notes?: string
  visual_prompt?: string
}

interface PresentationPlan {
  title?: string
  subtitle?: string
  theme?: { primary?: string; accent?: string; background?: string; text?: string }
  slide_count?: number
  slides?: PresentationSlide[]
  options?: { template?: string; ratio?: '16:9' | '4:3'; tone?: string; slides?: number }
}

interface DeckEntry {
  message: UIChatMessage
  plan: PresentationPlan
  artifactIndex: number
  hasArtifact: boolean
  upstreamWarning?: string
}

function extractUpstreamWarning(message: UIChatMessage): string | undefined {
  const presentation = message.metadata?.runtime?.presentation
  if (!presentation || typeof presentation !== 'object') return undefined
  const upstream = (presentation as { upstream?: unknown }).upstream
  if (!upstream || typeof upstream !== 'object') return undefined
  const warning = (upstream as { warning?: unknown }).warning
  const text = typeof warning === 'string' ? warning.trim() : ''
  return text || undefined
}

function extractDecks(messages: UIChatMessage[]): DeckEntry[] {
  const entries: DeckEntry[] = []
  for (const m of messages) {
    if (m.role !== 'assistant') continue
    const plan = m.metadata?.runtime?.presentation?.plan
    if (!plan?.slides?.length) continue
    const artifacts = m.metadata?.runtime?.artifacts || []
    const artifactIndex = artifacts.findIndex(
      a => (a.mime_type || '').includes('presentation') || (a.name || '').endsWith('.pptx'),
    )
    entries.push({
      message: m,
      plan,
      artifactIndex: artifactIndex >= 0 ? artifactIndex : 0,
      hasArtifact: artifactIndex >= 0,
      upstreamWarning: extractUpstreamWarning(m),
    })
  }
  return entries
}

interface Props {
  messages: UIChatMessage[]
  pptOptions?: PptComposerOptions
}

export function PresentationPreviewPane({ messages, pptOptions }: Props) {
  const { t } = usePreferences()
  const decks = useMemo(() => extractDecks(messages), [messages])

  const [deckIndex, setDeckIndex] = useState(0)
  const [slideIndex, setSlideIndex] = useState(0)
  const [showNotes, setShowNotes] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const latestDeckIndex = decks.length - 1
  const effectiveDeckIndex = Math.min(deckIndex, latestDeckIndex < 0 ? 0 : latestDeckIndex)

  const currentDeck = decks.length > 0 ? decks[effectiveDeckIndex] : null
  const slides: PresentationSlide[] = currentDeck?.plan.slides ?? []
  const currentSlide = slides[Math.min(slideIndex, slides.length - 1)] ?? null
  const theme = currentDeck?.plan.theme ?? {}
  const primary = `#${theme.primary || '1E4E8C'}`
  const accent = `#${theme.accent || 'F59E0B'}`
  const bg = `#${theme.background || 'F7F9FC'}`
  const textColor = `#${theme.text || '111827'}`
  const ratio = currentDeck?.plan.options?.ratio ?? pptOptions?.ratio ?? '16:9'

  const handleDeckChange = (delta: number) => {
    const next = effectiveDeckIndex + delta
    if (next < 0 || next >= decks.length) return
    setDeckIndex(next)
    setSlideIndex(0)
    setShowNotes(false)
  }

  const handleSlideClick = (idx: number) => {
    setSlideIndex(idx)
    setShowNotes(false)
  }

  const handleDownload = async () => {
    if (!currentDeck) return
    setDownloading(true)
    try {
      const artifacts = currentDeck.message.metadata?.runtime?.artifacts || []
      const artifact = artifacts[currentDeck.artifactIndex] ?? null
      await downloadMessageArtifact({
        messageId: currentDeck.message.id,
        artifactUrl: artifact?.url,
        artifactName: artifact?.name ?? (currentDeck.plan.title ? `${currentDeck.plan.title}.pptx` : 'presentation.pptx'),
        index: currentDeck.artifactIndex,
      })
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : '下载失败，请稍后重试'
      toast.error(message)
    } finally {
      setDownloading(false)
    }
  }

  if (!currentDeck) {
    const tplLabel = pptOptions ? templateLabel(t, pptOptions.template) : null
    const tnLabel = pptOptions ? toneLabel(t, pptOptions.tone) : null
    return (
      <div className="ppp-root">
        <div className="ppp-empty">
          <Icon name="grid" size={36} className="ppp-empty-icon" />
          <p className="ppp-empty-title">辣鸡PPT 预览区</p>
          <p className="ppp-empty-hint">在左侧输入需求并发送，AI 会生成结构化大纲与可下载的 .pptx 文件。</p>
          {pptOptions && (
            <div className="ppp-empty-pills">
              {tplLabel && <span className="ppp-empty-pill">{tplLabel}</span>}
              <span className="ppp-empty-pill">{pptOptions.ratio}</span>
              <span className="ppp-empty-pill">{pptOptions.slides}{t('composer.ppt.slidesUnit')}</span>
              {tnLabel && <span className="ppp-empty-pill">{tnLabel}</span>}
            </div>
          )}
        </div>
      </div>
    )
  }

  const plan = currentDeck.plan
  const tplLabelResolved = plan.options?.template ? templateLabel(t, plan.options.template) : ''
  const tnLabelResolved = plan.options?.tone ? toneLabel(t, plan.options.tone) : ''
  const upstreamWarning = currentDeck.upstreamWarning

  return (
    <div className="ppp-root">
      <div className="ppp-header">
        {upstreamWarning && (
          <div className="ppp-warning-banner" role="status">
            <Icon name="bolt" size={14} />
            <span>{upstreamWarning}</span>
          </div>
        )}

        <div className="ppp-header-top">
          <div className="ppp-color-bar" style={{ background: primary }} />
          <div className="ppp-titles">
            <p className="ppp-title">{plan.title || '未命名演示'}</p>
            {plan.subtitle && <p className="ppp-subtitle">{plan.subtitle}</p>}
          </div>
          <button
            type="button"
            className="ppp-download-btn"
            disabled={!currentDeck.hasArtifact || downloading}
            onClick={() => void handleDownload()}
          >
            <Icon name="package" size={13} />
            {downloading ? '下载中...' : '下载 .pptx'}
          </button>
        </div>

        {(tplLabelResolved || tnLabelResolved || ratio) && (
          <div className="ppp-badges">
            {tplLabelResolved && <span className="ppp-badge">{tplLabelResolved}</span>}
            {ratio && <span className="ppp-badge">{ratio}</span>}
            {tnLabelResolved && <span className="ppp-badge">{tnLabelResolved}</span>}
            <span className="ppp-badge">{plan.slide_count ?? slides.length}{t('composer.ppt.slidesUnit')}</span>
          </div>
        )}

        {decks.length > 1 && (
          <div className="ppp-version-nav">
            <button type="button" disabled={effectiveDeckIndex <= 0} onClick={() => handleDeckChange(-1)}>
              上一版
            </button>
            <span className="ppp-version-label">版本 {effectiveDeckIndex + 1} / {decks.length}</span>
            <button type="button" disabled={effectiveDeckIndex >= decks.length - 1} onClick={() => handleDeckChange(1)}>
              下一版
            </button>
          </div>
        )}
      </div>

      <div className="ppp-body">
        <div className="ppp-thumbnails">
          {slides.map((slide, idx) => (
            <button
              key={idx}
              type="button"
              className={`ppp-thumb${idx === slideIndex ? ' is-active' : ''}`}
              onClick={() => handleSlideClick(idx)}
            >
              <span className="ppp-thumb-index">{idx + 1}</span>
              <span className="ppp-thumb-title">{slide.title || `第 ${idx + 1} 页`}</span>
            </button>
          ))}
        </div>

        <div className="ppp-main">
          {currentSlide && (
            <>
              <div
                className={`ppp-slide-canvas${ratio === '4:3' ? ' ratio-4-3' : ''}`}
                style={{ background: bg, color: textColor }}
              >
                {currentSlide.title && (
                  <h2 className="ppp-slide-title" style={{ color: primary }}>
                    {currentSlide.title}
                  </h2>
                )}
                {currentSlide.subtitle && (
                  <p className="ppp-slide-subtitle">{currentSlide.subtitle}</p>
                )}
                {currentSlide.bullets && currentSlide.bullets.length > 0 && (
                  <ul className="ppp-slide-bullets">
                    {currentSlide.bullets.map((b, i) => (
                      <li key={i} className="ppp-slide-bullet" style={{ color: textColor }}>
                        {b}
                      </li>
                    ))}
                  </ul>
                )}
                {currentSlide.visual_prompt && (
                  <figure className="ppp-slide-visual" aria-label="PPT 图片预览">
                    <div className="ppp-slide-visual-art" style={{ borderColor: accent }}>
                      <span className="ppp-slide-visual-dot" />
                      <span className="ppp-slide-visual-line" />
                      <span className="ppp-slide-visual-line short" />
                    </div>
                    <figcaption>{currentSlide.visual_prompt}</figcaption>
                  </figure>
                )}
                <span className="ppp-slide-number" style={{ color: textColor }}>
                  {slideIndex + 1} / {slides.length}
                </span>
              </div>

              {currentSlide.speaker_notes && (
                <>
                  <button
                    type="button"
                    className="ppp-notes-toggle"
                    onClick={() => setShowNotes(v => !v)}
                  >
                    {showNotes ? '收起演讲备注' : '展开演讲备注'}
                  </button>
                  {showNotes && (
                    <pre className="ppp-notes">{currentSlide.speaker_notes}</pre>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
