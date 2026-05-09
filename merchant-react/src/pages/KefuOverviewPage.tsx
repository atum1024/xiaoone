import { useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { LiveChatShellPage } from './LiveChatShellPage'
import { KefuStoresPage } from './KefuStoresPage'
import { KefuQaTemplatesPage } from './KefuQaTemplatesPage'
import { KefuTechConfigPage } from './KefuTechConfigPage'
import { usePreferences } from '../app/preferences'

const KEFU_TABS = [
  { key: 'live-chat', labelKey: 'kefu.live-chat', route: '/workbench/kefu' },
  { key: 'stores', labelKey: 'kefu.stores', route: '/workbench/kefu/stores' },
  { key: 'qa-templates', labelKey: 'kefu.qa-templates', route: '/workbench/kefu/qa-templates' },
  { key: 'tech-config', labelKey: 'kefu.tech-config', route: '/workbench/kefu/tech-config' },
] as const

const KEFU_DENSE_CSS = `
.mr-kefu-router-page {
  max-width: none;
  padding: 12px 24px 36px;
  color-scheme: dark;
  color: oklch(95% 0.01 260);
  --mr-text: oklch(95% 0.01 260);
  --mr-muted: oklch(75% 0.02 260);
  --mr-bg-soft: oklch(20% 0.02 260);
  --mr-line: color-mix(in oklch, oklch(95% 0.01 260) 14%, transparent);
  --mr-line-strong: color-mix(in oklch, oklch(95% 0.01 260) 22%, transparent);
  --mr-chip: color-mix(in oklch, oklch(72% 0.12 280) 16%, transparent);
  --mr-chip-text: oklch(86% 0.04 280);
}

.mr-kefu-router-page > .mr-kefu-tabbar {
  flex-shrink: 0;
  position: sticky;
  top: 0;
  z-index: 12;
  margin-inline: -24px;
  padding: 8px 24px 10px;
  border: 0;
  border-bottom: 1px solid var(--mr-line);
  border-radius: 0;
  background: color-mix(in oklch, oklch(14% 0.02 260) 88%, oklch(72% 0.12 280) 12%);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 12px 32px -28px rgba(0, 0, 0, 0.55);
}

.mr-kefu-router-page > .mr-kefu-tabbar .mr-kefu-tabbar-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px 20px;
  flex-wrap: wrap;
  width: 100%;
}

.mr-kefu-router-page > .mr-kefu-tabbar .mr-kefu-tabbar-title {
  margin: 0;
  font-size: 15px;
  font-weight: 650;
  letter-spacing: 0.01em;
  color: var(--mr-text);
  flex: 0 1 auto;
  min-width: 0;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}

.mr-kefu-router-page > .mr-kefu-tabbar .mr-kefu-router-tabs--underline {
  display: inline-flex;
  align-items: stretch;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0;
  margin-left: auto;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.mr-kefu-router-page > .mr-kefu-tabbar .mr-kefu-router-tabs--underline button {
  flex: 0 0 auto;
  min-width: 0;
  justify-content: center;
  border-radius: 0;
  padding: 6px 12px 8px;
  margin: 0;
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: var(--mr-muted);
  box-shadow: none;
}

.mr-kefu-router-page > .mr-kefu-tabbar .mr-kefu-router-tabs--underline button.is-active {
  border-bottom-color: color-mix(in oklch, oklch(72% 0.12 280) 72%, transparent);
  background: transparent;
  color: oklch(93% 0.03 280);
}

.mr-kefu-router-page > .mr-kefu-tabbar .mr-kefu-router-tabs--underline button:hover:not(.is-active) {
  color: color-mix(in oklch, var(--mr-text) 78%, var(--mr-muted) 22%);
}

.mr-kefu-router-page > .mr-kefu-tabbar .mr-kefu-router-tabs--underline button:focus-visible {
  outline: 0;
  border-radius: 6px;
  box-shadow: 0 0 0 2px color-mix(in oklch, oklch(72% 0.12 280) 22%, transparent);
}

.mr-kefu-router-page .x1-lc-container {
  max-width: none;
  padding: 10px 0 0;
}

.mr-kefu-router-page .mr-page-head h1,
.mr-kefu-router-page .mr-panel-head h2,
.mr-kefu-router-page .mr-simple-item strong,
.mr-kefu-router-page .mr-status-card strong,
.mr-kefu-router-page .mr-live-msg-meta strong,
.mr-kefu-router-page .mr-empty strong {
  color: var(--mr-text);
}

.mr-kefu-router-page .mr-page-kicker,
.mr-kefu-router-page .mr-muted,
.mr-kefu-router-page .mr-page-head p,
.mr-kefu-router-page .mr-simple-item span,
.mr-kefu-router-page .mr-status-card p,
.mr-kefu-router-page .mr-source-item span,
.mr-kefu-router-page .mr-live-msg-meta time,
.mr-kefu-router-page .mr-empty p,
.mr-kefu-router-page .mr-chat-item span,
.mr-kefu-router-page .mr-chat-item time {
  color: var(--mr-muted);
}

.mr-kefu-router-page .mr-surface:not(.mr-kefu-tabbar) {
  border-color: var(--mr-line);
  background: color-mix(in oklch, oklch(20% 0.02 260) 94%, oklch(72% 0.12 280) 6%);
  border-radius: 12px;
  box-shadow: 0 18px 44px -38px rgba(0, 0, 0, 0.74);
}

.mr-kefu-router-page .mr-seg {
  background: color-mix(in oklch, oklch(15% 0.02 260) 82%, oklch(72% 0.12 280) 8%);
  border: 1px solid var(--mr-line);
  border-radius: 999px;
  padding: 3px;
}

.mr-kefu-router-page .mr-seg button {
  border-color: transparent;
  background: transparent;
  color: var(--mr-muted);
  padding: 0 10px;
  min-height: 30px;
}

.mr-kefu-router-page .mr-kefu-router-tabs--underline button b {
  font-size: 13px;
  font-weight: 550;
}

.mr-kefu-router-page .mr-kefu-router-tabs--underline button.is-active b {
  font-weight: 650;
}

.mr-kefu-router-page .mr-seg button.is-active {
  border-color: color-mix(in oklch, oklch(72% 0.12 280) 42%, transparent);
  background: color-mix(in oklch, oklch(72% 0.12 280) 22%, oklch(20% 0.02 260) 78%);
  color: oklch(93% 0.03 280);
}

.mr-kefu-router-page .mr-btn,
.mr-kefu-router-page .mr-simple-item,
.mr-kefu-router-page .mr-status-card,
.mr-kefu-router-page .mr-chat-item,
.mr-kefu-router-page .mr-source-item,
.mr-kefu-router-page .mr-upload-box,
.mr-kefu-router-page .mr-empty,
.mr-kefu-router-page .mr-live-msg-bubble {
  border-color: var(--mr-line);
  background: color-mix(in oklch, oklch(24% 0.02 260) 92%, oklch(72% 0.12 280) 8%);
  color: var(--mr-text);
}

.mr-kefu-router-page .mr-chat-item.is-active {
  border-color: color-mix(in oklch, oklch(72% 0.12 280) 48%, transparent);
  background: color-mix(in oklch, oklch(72% 0.12 280) 20%, oklch(24% 0.02 260) 80%);
}

.mr-kefu-router-page .mr-btn-primary {
  border-color: color-mix(in oklch, oklch(72% 0.12 280) 58%, transparent);
  background: linear-gradient(118deg, oklch(58% 0.18 280), oklch(62% 0.22 305), oklch(72% 0.14 55));
  color: oklch(98% 0.01 260);
}

.mr-kefu-router-page .mr-btn-danger {
  border-color: color-mix(in oklch, oklch(68% 0.18 25) 52%, transparent);
  background: color-mix(in oklch, oklch(68% 0.18 25) 15%, oklch(24% 0.02 260) 85%);
  color: oklch(84% 0.08 25);
}

.mr-kefu-router-page input,
.mr-kefu-router-page select,
.mr-kefu-router-page textarea,
.mr-kefu-router-page .mr-chat-input textarea {
  border-color: var(--mr-line);
  background: color-mix(in oklch, oklch(15% 0.02 260) 86%, oklch(72% 0.12 280) 4%);
  color: var(--mr-text);
}

.mr-kefu-router-page input::placeholder,
.mr-kefu-router-page textarea::placeholder {
  color: color-mix(in oklch, var(--mr-muted) 72%, transparent);
}

.mr-kefu-router-page input:focus,
.mr-kefu-router-page select:focus,
.mr-kefu-router-page textarea:focus,
.mr-kefu-router-page .mr-chat-input textarea:focus {
  outline: 0;
  border-color: color-mix(in oklch, oklch(72% 0.12 280) 64%, transparent);
  box-shadow: 0 0 0 3px color-mix(in oklch, oklch(72% 0.12 280) 18%, transparent);
}

.mr-kefu-router-page .mr-chat-input textarea:focus {
  border-color: var(--mr-line);
  box-shadow: none;
}

.mr-kefu-router-page .mr-badge {
  border-color: var(--mr-line);
  background: var(--mr-chip);
  color: var(--mr-chip-text);
}

.mr-kefu-router-page .mr-state-error {
  border-color: color-mix(in oklch, oklch(68% 0.18 25) 42%, transparent);
  background: color-mix(in oklch, oklch(68% 0.18 25) 12%, oklch(20% 0.02 260) 88%);
  color: oklch(86% 0.08 25);
}

.mr-kefu-router-page .mr-live-msg-row.is-agent .mr-live-msg-bubble {
  border-color: color-mix(in oklch, oklch(72% 0.12 280) 36%, transparent);
  background: color-mix(in oklch, oklch(72% 0.12 280) 20%, oklch(24% 0.02 260) 80%);
}

.mr-kefu-router-page .mr-live-msg-row.is-visitor .mr-live-msg-bubble {
  background: color-mix(in oklch, oklch(26% 0.02 250) 92%, oklch(95% 0.01 260) 8%);
}

.mr-kefu-router-page .x1-lc-header,
.mr-kefu-router-page .x1-lc-body,
.mr-kefu-router-page .x1-lc-sidebar,
.mr-kefu-router-page .x1-lc-sidebar-head,
.mr-kefu-router-page .x1-lc-main,
.mr-kefu-router-page .x1-lc-main-head,
.mr-kefu-router-page .x1-lc-messages,
.mr-kefu-router-page .x1-lc-composer,
.mr-kefu-router-page .x1-lc-composer-inner,
.mr-kefu-router-page .x1-lc-empty-icon,
.mr-kefu-router-page .x1-lc-btn,
.mr-kefu-router-page .x1-lc-icon-btn,
.mr-kefu-router-page .x1-lc-tabs,
.mr-kefu-router-page .x1-lc-bubble-row.is-system,
.mr-kefu-router-page .x1-lc-badge {
  background: transparent;
  color: var(--mr-text);
  border-color: var(--mr-line);
}

.mr-kefu-router-page .x1-lc-header,
.mr-kefu-router-page .x1-lc-body {
  background: color-mix(in oklch, oklch(20% 0.02 260) 94%, oklch(72% 0.12 280) 6%);
  box-shadow: 0 18px 44px -38px rgba(0, 0, 0, 0.74);
  border-color: var(--mr-line);
}

.mr-kefu-router-page .x1-lc-sidebar,
.mr-kefu-router-page .x1-lc-main-head,
.mr-kefu-router-page .x1-lc-sidebar-head,
.mr-kefu-router-page .x1-lc-composer {
  border-color: var(--mr-line);
}

.mr-kefu-router-page .x1-lc-composer-inner {
  background: color-mix(in oklch, oklch(15% 0.02 260) 86%, oklch(72% 0.12 280) 4%);
}

.mr-kefu-router-page .x1-lc-item {
  color: var(--mr-text);
}

.mr-kefu-router-page .x1-lc-item:hover,
.mr-kefu-router-page .x1-lc-icon-btn:hover,
.mr-kefu-router-page .x1-lc-btn:hover {
  background: color-mix(in oklch, oklch(24% 0.02 260) 92%, oklch(72% 0.12 280) 8%);
}

.mr-kefu-router-page .x1-lc-item.is-active {
  background: color-mix(in oklch, oklch(72% 0.12 280) 20%, oklch(24% 0.02 260) 80%);
  color: var(--mr-text);
}

.mr-kefu-router-page .x1-lc-tab.is-active {
  background: color-mix(in oklch, oklch(72% 0.12 280) 22%, oklch(20% 0.02 260) 78%);
  color: oklch(93% 0.03 280);
  border-color: color-mix(in oklch, oklch(72% 0.12 280) 42%, transparent);
}

.mr-kefu-router-page .x1-lc-bubble-content {
  background: color-mix(in oklch, oklch(26% 0.02 250) 92%, oklch(95% 0.01 260) 8%);
  color: var(--mr-text);
}

.mr-kefu-router-page .x1-lc-bubble-row.is-agent .x1-lc-bubble-content {
  background: color-mix(in oklch, oklch(72% 0.12 280) 20%, oklch(24% 0.02 260) 80%);
  color: var(--mr-text);
}

.mr-kefu-router-page .x1-lc-item-bottom,
.mr-kefu-router-page .x1-lc-item-top time,
.mr-kefu-router-page .x1-lc-tab {
  color: var(--mr-muted);
}

.mr-kefu-router-page .mr-provider-grid {
  display: grid;
  gap: 12px;
}

.mr-kefu-router-page .mr-provider-card {
  border: 1px solid var(--mr-line);
  border-radius: 12px;
  background: color-mix(in oklch, oklch(24% 0.02 260) 92%, oklch(72% 0.12 280) 8%);
  padding: 14px;
  display: grid;
  gap: 12px;
}

.mr-kefu-router-page .mr-provider-head {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
  gap: 12px;
}

.mr-kefu-router-page .mr-provider-head h3 {
  margin: 0;
  font-size: 15px;
}

.mr-kefu-router-page .mr-provider-head p,
.mr-kefu-router-page .mr-field-hint {
  margin: 4px 0 0;
  color: var(--mr-muted);
  font-size: 12px;
  line-height: 1.5;
}

.mr-kefu-router-page .mr-field-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 10px;
}

.mr-kefu-router-page .mr-field-grid label {
  display: grid;
  gap: 6px;
  color: var(--mr-muted);
  font-size: 12px;
}

.mr-kefu-router-page .mr-account-card {
  border: 1px solid var(--mr-line);
  border-radius: 10px;
  background: color-mix(in oklch, oklch(15% 0.02 260) 70%, transparent);
  padding: 11px 12px;
  display: grid;
  gap: 8px;
}

.mr-kefu-router-page .mr-code-row {
  min-width: 0;
  border-radius: 8px;
  background: color-mix(in oklch, oklch(10% 0.015 260) 78%, transparent);
  color: var(--mr-muted);
  padding: 7px 9px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 900px) {
  .mr-kefu-router-page {
    padding: 10px 14px 28px;
  }

  .mr-kefu-router-page > .mr-kefu-tabbar {
    margin-inline: -14px;
    padding-inline: 14px;
  }
}
`

export function KefuOverviewPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { theme, t } = usePreferences()
  const activeKey = useMemo(() => {
    const hit = KEFU_TABS.find(tab => tab.route !== '/workbench/kefu' && location.pathname.startsWith(tab.route))
    return hit?.key || 'live-chat'
  }, [location.pathname])

  return (
    <div className="mr-page mr-page--spacious mr-kefu-router-page">
      {theme === 'dark' ? <style>{KEFU_DENSE_CSS}</style> : null}
      <section className="mr-surface mr-kefu-tabbar">
        <div className="mr-kefu-tabbar-inner">
          <p id="mr-kefu-workspace-title" className="mr-kefu-tabbar-title">
            {t('kefu.workspace')}
          </p>
          <div
            className="mr-kefu-router-tabs mr-kefu-router-tabs--underline"
            role="tablist"
            aria-labelledby="mr-kefu-workspace-title"
          >
            {KEFU_TABS.map(tab => (
              <button
                key={tab.key}
                type="button"
                className={activeKey === tab.key ? 'is-active' : ''}
                onClick={() => navigate(tab.route)}
                role="tab"
                aria-selected={activeKey === tab.key}
              >
                <b>{t(tab.labelKey)}</b>
              </button>
            ))}
          </div>
        </div>
      </section>

      {activeKey === 'stores' ? <KefuStoresPage /> : null}
      {activeKey === 'qa-templates' ? <KefuQaTemplatesPage /> : null}
      {activeKey === 'tech-config' ? <KefuTechConfigPage /> : null}
      {activeKey === 'live-chat' ? <LiveChatShellPage /> : null}
    </div>
  )
}
