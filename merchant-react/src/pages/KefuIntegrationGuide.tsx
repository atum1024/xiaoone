import { useCallback, useMemo, useState, type ReactNode } from 'react'
import {
  Badge,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@xiaoone/react-ui'
import { Bot, Check, ChevronDown, ChevronRight, Copy, HelpCircle, Lightbulb, Shield } from 'lucide-react'
import { usePreferences } from '../app/preferences'
import {
  getGlossary,
  getPublicChatApi,
  type GuideSnippet,
  type GuideStep,
  type IntegrationGuide,
} from './kefuIntegrationContent'

type CopyHandler = (text: string, label: string) => void | Promise<void>

function CodeSnippet({
  snippet,
  onCopy,
  copiedLabel,
  copyLabel,
}: {
  snippet: GuideSnippet
  onCopy: CopyHandler
  copiedLabel: string
  copyLabel: string
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    await onCopy(snippet.code, snippet.label)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }, [onCopy, snippet.code, snippet.label])

  return (
    <div className="mr-kefu-guide-snippet">
      <div className="mr-kefu-guide-snippet-head">
        <span className="mr-kefu-guide-snippet-label">{snippet.label}</span>
        <button
          type="button"
          className={`x1-lc-btn mr-kefu-guide-copy-btn${copied ? ' is-copied' : ''}`}
          onClick={() => void handleCopy()}
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? copiedLabel : copyLabel}
        </button>
      </div>
      <pre className="mr-kefu-guide-snippet-pre">
        <code>{snippet.code}</code>
      </pre>
    </div>
  )
}

function GlossaryTerm({
  term,
  glossary,
  children,
}: {
  term: string
  glossary: Record<string, string>
  children: ReactNode
}) {
  const tip = glossary[term]
  if (!tip)
    return <>{children}</>

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className="mr-kefu-guide-term">
          {children}
          <HelpCircle size={12} aria-hidden />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="mr-kefu-guide-tooltip">
        <strong>{term}</strong>
        <p>{tip}</p>
      </TooltipContent>
    </Tooltip>
  )
}

function StepCard({
  index,
  step,
  defaultOpen,
  onCopy,
  copiedLabel,
  copyLabel,
}: {
  index: number
  step: GuideStep
  defaultOpen?: boolean
  onCopy: CopyHandler
  copiedLabel: string
  copyLabel: string
}) {
  const [open, setOpen] = useState(defaultOpen ?? index === 0)

  return (
    <div className={`mr-kefu-guide-step${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="mr-kefu-guide-step-toggle"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
      >
        <span className="mr-kefu-guide-step-num">{index + 1}</span>
        <span className="mr-kefu-guide-step-title">{step.title}</span>
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </button>
      {open ? (
        <div className="mr-kefu-guide-step-body">
          <p className="mr-kefu-guide-step-explain">{step.explain}</p>
          {step.snippets?.map(sn => (
            <CodeSnippet key={`${step.title}-${sn.label}`} snippet={sn} onCopy={onCopy} copiedLabel={copiedLabel} copyLabel={copyLabel} />
          ))}
        </div>
      ) : null}
    </div>
  )
}

function FieldTable({
  rows,
  glossary,
  fieldLabel,
  requiredLabel,
  descriptionLabel,
}: {
  rows: IntegrationGuide['handshake']['fields']
  glossary: Record<string, string>
  fieldLabel: string
  requiredLabel: string
  descriptionLabel: string
}) {
  return (
    <div className="mr-kefu-guide-table-wrap">
      <table className="mr-kefu-guide-table">
        <thead>
          <tr>
            <th>{fieldLabel}</th>
            <th>{requiredLabel}</th>
            <th>{descriptionLabel}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.field}>
              <td>
                {glossary[row.field] ? (
                  <GlossaryTerm term={row.field} glossary={glossary}>{row.field}</GlossaryTerm>
                ) : (
                  <code>{row.field}</code>
                )}
              </td>
              <td>{row.required}</td>
              <td>{row.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ErrorTable({
  rows,
  httpLabel,
  errorCodeLabel,
  fixLabel,
}: {
  rows: IntegrationGuide['errors']
  httpLabel: string
  errorCodeLabel: string
  fixLabel: string
}) {
  return (
    <div className="mr-kefu-guide-table-wrap">
      <table className="mr-kefu-guide-table">
        <thead>
          <tr>
            <th>{httpLabel}</th>
            <th>{errorCodeLabel}</th>
            <th>{fixLabel}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.code}>
              <td>{row.http}</td>
              <td><code>{row.code}</code></td>
              <td>{row.fix}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function WsEventTable({
  rows,
  eventLabel,
  fieldLabel,
  descriptionLabel,
}: {
  rows: IntegrationGuide['websocket']['clientEvents'] | IntegrationGuide['websocket']['serverEvents']
  eventLabel: string
  fieldLabel: string
  descriptionLabel: string
}) {
  return (
    <div className="mr-kefu-guide-table-wrap">
      <table className="mr-kefu-guide-table">
        <thead>
          <tr>
            <th>{eventLabel}</th>
            <th>{fieldLabel}</th>
            <th>{descriptionLabel}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.type}>
              <td><code>{row.type}</code></td>
              <td>{row.fields}</td>
              <td>{row.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CollapsibleSection({
  title,
  summary,
  defaultOpen,
  children,
}: {
  title: string
  summary: string
  defaultOpen?: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen ?? false)

  return (
    <section className={`mr-kefu-guide-section${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="mr-kefu-guide-section-toggle"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
      >
        <span>
          <strong>{title}</strong>
          <span className="mr-kefu-guide-section-summary">{summary}</span>
        </span>
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </button>
      {open ? <div className="mr-kefu-guide-section-body">{children}</div> : null}
    </section>
  )
}

export function KefuIntegrationGuide({
  guide,
  onCopy,
}: {
  guide: IntegrationGuide
  onCopy: CopyHandler
}) {
  const { t, tpl } = usePreferences()
  const glossary = useMemo(() => getGlossary(t), [t])
  const publicChatApi = useMemo(() => getPublicChatApi(t), [t])

  const handleSnippetCopy: CopyHandler = useCallback(async (text, label) => {
    await onCopy(text, label)
  }, [onCopy])

  return (
    <TooltipProvider delayDuration={200}>
      <div className="mr-kefu-guide">
        {guide.meta.sampleHint ? (
          <div className="mr-kefu-guide-sample-hint" role="status">
            <Badge variant="outline">{tpl('kefu.integration.guide.credentialBadge', String(guide.meta.credentialCount))}</Badge>
            <span>{guide.meta.sampleHint}</span>
          </div>
        ) : null}

        <div className="mr-kefu-guide-ai-handoff">
          <Bot size={18} className="mr-kefu-guide-ai-icon" aria-hidden />
          <div>
            <strong>{guide.aiHandoff.headline}</strong>
            <p>{guide.aiHandoff.instruction}</p>
          </div>
        </div>

        <div className="mr-kefu-guide-env">
          <strong className="mr-kefu-guide-env-title">{t('kefu.integration.guide.envTitle')}</strong>
          <dl className="mr-kefu-guide-env-list">
            {guide.environment.map(row => (
              <div key={row.label} className="mr-kefu-guide-env-row">
                <dt>{row.label}</dt>
                <dd>
                  <code>{row.value}</code>
                  {row.note ? <span className="mr-kefu-guide-env-note">{row.note}</span> : null}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="mr-kefu-guide-quick-tip">
          <Lightbulb size={16} className="mr-kefu-guide-quick-icon" />
          <p>{guide.quickTip}</p>
        </div>

        <div className="mr-kefu-guide-glossary">
          <span className="mr-kefu-guide-glossary-label">{t('kefu.integration.guide.glossaryLabel')}</span>
          {(['app_id', 'api_key', 'visitor_token', 'conversation.id', 'allowed_origins'] as const).map(term => (
            <GlossaryTerm key={term} term={term} glossary={glossary}>
              <code>{term}</code>
            </GlossaryTerm>
          ))}
        </div>

        <Tabs defaultValue="widget" className="mr-kefu-guide-tabs">
          <TabsList className="mr-kefu-guide-tabs-list">
            {guide.methods.map(m => (
              <TabsTrigger key={m.id} value={m.id} className="mr-kefu-guide-tab-trigger">
                {m.tabLabel}
              </TabsTrigger>
            ))}
          </TabsList>

          {guide.methods.map(method => (
            <TabsContent key={method.id} value={method.id} className="mr-kefu-guide-tab-panel">
              <p className="mr-kefu-guide-method-intro">{method.plainIntro}</p>
              <div className="mr-kefu-guide-steps">
                {method.steps.map((step, i) => (
                  <StepCard
                    key={step.title}
                    index={i}
                    step={step}
                    defaultOpen={i === 0}
                    onCopy={handleSnippetCopy}
                    copiedLabel={t('kefu.common.copied')}
                    copyLabel={t('kefu.common.copy')}
                  />
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>

        <CollapsibleSection
          title={t('kefu.integration.guide.handshakeSection')}
          summary={tpl('kefu.integration.guide.handshakeSummary', publicChatApi.method, publicChatApi.path)}
          defaultOpen={false}
        >
          <div className="mr-kefu-guide-api-head">
            <Badge className="x1-lc-badge x1-lc-badge--success">{guide.handshake.method}</Badge>
            <code className="mr-kefu-guide-api-path">{publicChatApi.path}</code>
          </div>
          <p className="mr-kefu-guide-step-explain">{guide.handshake.authNote}</p>
          <FieldTable
            rows={guide.handshake.fields}
            glossary={glossary}
            fieldLabel={t('kefu.integration.guide.tableField')}
            requiredLabel={t('kefu.integration.guide.tableRequired')}
            descriptionLabel={t('kefu.integration.guide.tableDescription')}
          />
          <CodeSnippet
            snippet={{ lang: 'bash', label: t('kefu.integration.guide.curlTest'), code: guide.handshake.curl }}
            onCopy={handleSnippetCopy}
            copiedLabel={t('kefu.common.copied')}
            copyLabel={t('kefu.common.copy')}
          />
          <CodeSnippet
            snippet={{ lang: 'json', label: t('kefu.integration.guide.requestBody'), code: JSON.stringify(guide.handshake.payload, null, 2) }}
            onCopy={handleSnippetCopy}
            copiedLabel={t('kefu.common.copied')}
            copyLabel={t('kefu.common.copy')}
          />
          <CodeSnippet
            snippet={{
              lang: 'json',
              label: t('kefu.integration.guide.successResponse'),
              code: JSON.stringify(guide.handshake.successResponse, null, 2),
            }}
            onCopy={handleSnippetCopy}
            copiedLabel={t('kefu.common.copied')}
            copyLabel={t('kefu.common.copy')}
          />
        </CollapsibleSection>

        <CollapsibleSection title={t('kefu.integration.guide.restSection')} summary={t('kefu.integration.guide.restSummary')} defaultOpen={false}>
          <CodeSnippet
            snippet={{
              lang: 'json',
              label: tpl('kefu.integration.guide.sendMessage', guide.restApis.messages.method),
              code: JSON.stringify(guide.restApis.messages.body, null, 2),
            }}
            onCopy={handleSnippetCopy}
            copiedLabel={t('kefu.common.copied')}
            copyLabel={t('kefu.common.copy')}
          />
          <p className="mr-kefu-guide-step-explain">{guide.restApis.messages.explain}</p>
          <CodeSnippet
            snippet={{ lang: 'text', label: tpl('kefu.integration.guide.fetchHistory', guide.restApis.history.method), code: guide.restApis.history.url }}
            onCopy={handleSnippetCopy}
            copiedLabel={t('kefu.common.copied')}
            copyLabel={t('kefu.common.copy')}
          />
          <p className="mr-kefu-guide-step-explain">{guide.restApis.history.explain}</p>
          <FieldTable
            rows={guide.restApis.attachments.fields}
            glossary={glossary}
            fieldLabel={t('kefu.integration.guide.tableField')}
            requiredLabel={t('kefu.integration.guide.tableRequired')}
            descriptionLabel={t('kefu.integration.guide.tableDescription')}
          />
          <CodeSnippet
            snippet={{ lang: 'text', label: tpl('kefu.integration.guide.uploadAttachment', guide.restApis.attachments.method), code: guide.restApis.attachments.url }}
            onCopy={handleSnippetCopy}
            copiedLabel={t('kefu.common.copied')}
            copyLabel={t('kefu.common.copy')}
          />
          <p className="mr-kefu-guide-step-explain">{guide.restApis.attachments.explain}</p>
        </CollapsibleSection>

        <CollapsibleSection title={t('kefu.integration.guide.wsSection')} summary={t('kefu.integration.guide.wsSummary')} defaultOpen={false}>
          <CodeSnippet
            snippet={{ lang: 'text', label: t('kefu.integration.guide.wsConnectLabel'), code: guide.websocket.url }}
            onCopy={handleSnippetCopy}
            copiedLabel={t('kefu.common.copied')}
            copyLabel={t('kefu.common.copy')}
          />
          <h4 className="mr-kefu-guide-subhead">{t('kefu.integration.guide.wsClientSend')}</h4>
          <WsEventTable
            rows={guide.websocket.clientEvents}
            eventLabel={t('kefu.integration.guide.tableEvent')}
            fieldLabel={t('kefu.integration.guide.tableField')}
            descriptionLabel={t('kefu.integration.guide.tableDescription')}
          />
          <CodeSnippet
            snippet={{ lang: 'json', label: t('kefu.integration.guide.sendExample'), code: JSON.stringify(guide.websocket.sendExample, null, 2) }}
            onCopy={handleSnippetCopy}
            copiedLabel={t('kefu.common.copied')}
            copyLabel={t('kefu.common.copy')}
          />
          <h4 className="mr-kefu-guide-subhead">{t('kefu.integration.guide.wsServerPush')}</h4>
          <WsEventTable
            rows={guide.websocket.serverEvents}
            eventLabel={t('kefu.integration.guide.tableEvent')}
            fieldLabel={t('kefu.integration.guide.tableField')}
            descriptionLabel={t('kefu.integration.guide.tableDescription')}
          />
          <p className="mr-kefu-guide-step-explain">
            {t('kefu.integration.guide.wsMessageHint')}
          </p>
          <CodeSnippet
            snippet={{
              lang: 'json',
              label: t('kefu.integration.guide.messageEnvelope'),
              code: JSON.stringify(guide.websocket.messageEnvelopeExample, null, 2),
            }}
            onCopy={handleSnippetCopy}
            copiedLabel={t('kefu.common.copied')}
            copyLabel={t('kefu.common.copy')}
          />
        </CollapsibleSection>

        <CollapsibleSection title={t('kefu.integration.guide.errorsSection')} summary={t('kefu.integration.guide.errorsSummary')} defaultOpen={false}>
          <ErrorTable
            rows={guide.errors}
            httpLabel={t('kefu.integration.guide.tableHttp')}
            errorCodeLabel={t('kefu.integration.guide.tableErrorCode')}
            fixLabel={t('kefu.integration.guide.tableFix')}
          />
        </CollapsibleSection>

        <CollapsibleSection title={t('kefu.integration.guide.fetchSection')} summary={t('kefu.integration.guide.fetchSummary')} defaultOpen={false}>
          <CodeSnippet
            snippet={{ lang: 'ts', label: t('kefu.integration.guide.fetchSnippetLabel'), code: guide.fetchExample }}
            onCopy={handleSnippetCopy}
            copiedLabel={t('kefu.common.copied')}
            copyLabel={t('kefu.common.copy')}
          />
        </CollapsibleSection>

        <CollapsibleSection title={t('kefu.integration.guide.checklistSection')} summary={t('kefu.integration.guide.checklistSummary')} defaultOpen={false}>
          <ul className="mr-kefu-guide-checklist">
            {guide.checklist.map(item => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </CollapsibleSection>

        <div className="mr-kefu-guide-security">
          <p className="mr-kefu-guide-security-headline">
            <Shield size={14} aria-hidden />
            {guide.security.headline}
          </p>
          <Popover>
            <PopoverTrigger asChild>
              <button type="button" className="x1-lc-btn mr-kefu-guide-security-trigger">
                {t('kefu.integration.guide.advancedTrigger')}
                <ChevronDown size={14} />
              </button>
            </PopoverTrigger>
            <PopoverContent className="mr-kefu-guide-security-popover" align="start">
              <ul>
                {guide.security.advanced.map(tip => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </TooltipProvider>
  )
}
