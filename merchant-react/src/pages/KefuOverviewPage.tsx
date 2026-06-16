import { useCallback, useEffect, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router'
import type { LiveState } from '@xiaoone/chat-kit'
import { LiveChatShellPage } from './LiveChatShellPage'
import { KefuStoresPage } from './KefuStoresPage'
import { KefuQaTemplatesPage } from './KefuQaTemplatesPage'
import { KefuQuickRepliesPage } from './KefuQuickRepliesPage'
import { KefuHelpCenterPage } from './KefuHelpCenterPage'
import { KefuTechConfigPage } from './KefuTechConfigPage'
import { usePreferences } from '../app/preferences'
import { useLocalizedTopbarSlot } from '../layout/Topbar'
import { useLiveChatStore } from '../store/liveChat'

type KefuTopTab = 'waiting' | 'active' | 'closed' | 'settings' | 'help-center'
type KefuSettingsTab = 'stores' | 'uploads' | 'qa-library' | 'quick-replies' | 'tech-config'

const KEFU_TOP_TABS: Array<{ key: KefuTopTab; labelKey: string; fallback: string }> = [
  { key: 'waiting', labelKey: 'kefu.top.waiting', fallback: '等待中' },
  { key: 'active', labelKey: 'kefu.top.active', fallback: '进行中' },
  { key: 'closed', labelKey: 'kefu.top.closed', fallback: '已归档' },
  { key: 'settings', labelKey: 'kefu.top.settings', fallback: '客服设置' },
] as const

const KEFU_SETTINGS_TABS: Array<{ key: KefuSettingsTab; labelKey: string; fallback: string }> = [
  { key: 'stores', labelKey: 'kefu.settings.stores', fallback: '店铺管理' },
  { key: 'uploads', labelKey: 'kefu.settings.uploads', fallback: '产品或服务' },
  { key: 'qa-library', labelKey: 'kefu.settings.qaLibrary', fallback: 'AI 问答库' },
  { key: 'quick-replies', labelKey: 'kefu.settings.quickReplies', fallback: '快捷回复' },
  { key: 'tech-config', labelKey: 'kefu.settings.techConfig', fallback: '技术配置' },
] as const

const LIVE_STATES: LiveState[] = ['waiting', 'active', 'closed']

function stateRoute(state: LiveState) {
  if (state === 'waiting')
    return '/workbench/kefu'
  return `/workbench/kefu?state=${state}`
}

function settingsRoute(tab: KefuSettingsTab) {
  const params = new URLSearchParams({ tab })
  return `/workbench/kefu/settings?${params.toString()}`
}

function helpCenterRoute() {
  return '/workbench/kefu/help-center'
}

function readLiveState(search: string): LiveState {
  const value = new URLSearchParams(search).get('state')
  return LIVE_STATES.includes(value as LiveState) ? (value as LiveState) : 'waiting'
}

function readSettingsTab(search: string): KefuSettingsTab {
  const value = new URLSearchParams(search).get('tab')
  if (value === 'auto-reply')
    return 'qa-library'
  if (value === 'profile')
    return 'uploads'
  if (value === 'quick-replies')
    return 'quick-replies'
  return KEFU_SETTINGS_TABS.some(tab => tab.key === value) ? (value as KefuSettingsTab) : 'stores'
}

function formatCountBadge(value: number) {
  return value > 99 ? '99+' : String(value)
}

const KEFU_SHARED_CSS = `
/* 自动回复开关 · light/dark shared baseline */
.mr-kefu-router-page .kf-auto-reply-control {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px;
  border: 1px solid var(--xiaoone-border);
  border-radius: var(--xiaoone-panel-radius);
  background: var(--xiaoone-bg-soft);
}

.mr-kefu-router-page .kf-auto-reply-control-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
}

.mr-kefu-router-page .kf-auto-reply-control-head > span {
  color: var(--xiaoone-fg);
  font-size: 13px;
  font-weight: 600;
}

.mr-kefu-router-page .kf-auto-reply-control-head > small {
  flex: 1 1 220px;
  color: var(--xiaoone-fg-mute);
  font-size: 12px;
  line-height: 1.5;
}

.mr-kefu-router-page .kf-auto-reply-toggle {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  color: var(--xiaoone-fg-soft);
  cursor: pointer;
  user-select: none;
}

.mr-kefu-router-page .kf-auto-reply-toggle input[type="checkbox"] {
  width: 14px;
  height: 14px;
  accent-color: var(--xiaoone-accent);
}
`

const KEFU_DENSE_CSS = `
/* ============================================================
   Xiaoone Kefu · Brand-Bold Dark Theme
   作用域：.mr-kefu-router-page
   仅在深色模式生效，浅色模式 / 其它模块完全不受影响
   ============================================================ */

.mr-kefu-router-page {
  /* ---- color tokens ---- */
  --kf-violet:        #8b5cf6;
  --kf-violet-2:      var(--xiaoone-accent);
  --kf-pink:          var(--xiaoone-accent-2);
  --kf-violet-soft:   color-mix(in srgb, var(--xiaoone-accent) 18%, transparent);
  --kf-violet-ring:   color-mix(in srgb, var(--xiaoone-accent) 45%, transparent);
  --kf-violet-glow:   0 0 0 1px color-mix(in srgb, var(--xiaoone-accent) 35%, transparent), 0 8px 24px -8px color-mix(in srgb, var(--xiaoone-accent) 55%, transparent);
  --kf-grad-primary:  linear-gradient(135deg, var(--xiaoone-accent) 0%, var(--xiaoone-accent-2) 55%, color-mix(in srgb, var(--xiaoone-info) 80%, var(--xiaoone-accent)) 100%);
  --kf-grad-primary-soft: linear-gradient(135deg, color-mix(in srgb, var(--xiaoone-accent) 22%, transparent) 0%, color-mix(in srgb, var(--xiaoone-accent-2) 18%, transparent) 55%, color-mix(in srgb, var(--xiaoone-info) 20%, transparent) 100%);

  --kf-base:          var(--xiaoone-bg);
  --kf-base-2:        var(--xiaoone-bg-soft);
  --kf-surface:       var(--xiaoone-bg-elev);
  --kf-surface-2:     var(--xiaoone-bg-soft);
  --kf-surface-3:     var(--xiaoone-bg-elev);
  --kf-surface-hover: var(--xiaoone-bg-hover);
  --kf-line:          var(--xiaoone-border-soft);
  --kf-line-2:        var(--xiaoone-border);
  --kf-line-strong:   color-mix(in srgb, var(--xiaoone-accent) 32%, var(--xiaoone-border));

  --kf-text:          var(--xiaoone-fg);
  --kf-text-soft:     var(--xiaoone-fg-soft);
  --kf-text-mute:     var(--xiaoone-fg-mute);
  --kf-text-faint:    var(--xiaoone-fg-faint);

  --kf-warning:       var(--xiaoone-warning);
  --kf-warning-bg:    var(--xiaoone-warning-bg);
  --kf-success:       var(--xiaoone-success);
  --kf-success-bg:    var(--xiaoone-success-bg);
  --kf-danger:        var(--xiaoone-danger);
  --kf-danger-bg:     var(--xiaoone-danger-bg);
  --kf-info:          var(--xiaoone-info);
  --kf-info-bg:       color-mix(in srgb, var(--xiaoone-info) 14%, transparent);

  /* ---- base ---- */
  max-width: none;
  padding: 0 0 24px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 0;
  color-scheme: dark;
  color: var(--kf-text);
  background:
    radial-gradient(1100px 580px at -10% -20%, var(--xiaoone-glow-indigo), transparent 60%),
    radial-gradient(900px 520px at 110% -10%, color-mix(in srgb, var(--xiaoone-accent-2) 12%, transparent), transparent 60%),
    radial-gradient(1200px 640px at 50% 120%, var(--xiaoone-glow-cyan), transparent 65%),
    var(--kf-base);

  /* ---- legacy aliases (供 chat-kit 内部继续使用) ---- */
  --mr-text:        var(--kf-text);
  --mr-muted:       var(--kf-text-mute);
  --mr-bg-soft:     var(--kf-surface-2);
  --mr-line:        var(--kf-line);
  --mr-line-strong: var(--kf-line-2);
  --mr-chip:        var(--kf-violet-soft);
  --mr-chip-text:   #d6cffb;
  --xiaoone-bg-elev:  var(--kf-surface);
  --xiaoone-bg-soft:  var(--kf-surface-2);
  --xiaoone-bg-hover: var(--kf-surface-hover);
  --xiaoone-fg:       var(--kf-text);
  --xiaoone-fg-soft:  var(--kf-text-soft);
  --xiaoone-fg-mute:  var(--kf-text-mute);
  --xiaoone-border:   var(--kf-line);
  --xiaoone-accent:   var(--kf-violet);
  --xiaoone-accent-bg: var(--kf-violet-soft);
}

.mr-kefu-router-page > .mr-kefu-router-body {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  overflow: auto;
  display: flex;
  flex-direction: column;
  padding: 16px 24px 0;
}

.mr-kefu-router-page > .mr-kefu-router-body.is-live-chat {
  overflow: hidden;
  padding: 0;
}

.mr-kefu-router-page > .mr-kefu-router-body.is-settings {
  padding: 16px 24px 24px;
}

.mr-kefu-router-page:has(> .mr-kefu-router-body.is-live-chat) {
  padding-bottom: 0;
}

.mr-kefu-router-page > .mr-kefu-router-body.is-live-chat > .x1-lc-container,
.mr-kefu-router-page > .mr-kefu-router-body:not(.is-live-chat) > .x1-lc-container {
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
}

/* ---- 顶栏二级 tab：胶囊式 segmented control
       (kefu 页面的 5 个 tab 实际渲染在全局 Topbar，类名 .mr-topbar--kefu-tabs) ---- */
.mr-topbar--kefu-tabs {
  background: var(--xiaoone-bg-elev) !important;
  border-bottom: 1px solid var(--kf-line) !important;
}

.mr-topbar--kefu-tabs .mr-topbar-context {
  display: flex;
  align-items: center;
  padding: 6px 0;
}

.mr-topbar--kefu-tabs .mr-kefu-router-tabs--underline {
  display: inline-flex !important;
  height: auto !important;
  width: auto !important;
  gap: 4px;
  padding: 4px !important;
  border: 1px solid var(--kf-line) !important;
  border-radius: var(--xiaoone-r-pill) !important;
  background: var(--xiaoone-bg-soft) !important;
  box-shadow: none !important;
  overflow: visible;
}

.mr-topbar--kefu-tabs .mr-kefu-router-tabs--underline button {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0 !important;
  border-radius: var(--xiaoone-r-pill) !important;
  padding: 7px 16px !important;
  margin: 0;
  height: auto !important;
  background: transparent !important;
  color: var(--kf-text-mute) !important;
  font-size: 13px;
  transition: color 0.18s ease, background 0.18s ease, transform 0.18s ease;
  cursor: pointer;
}

.mr-topbar--kefu-tabs .mr-kefu-router-tabs--underline button:hover:not(.is-active) {
  color: var(--kf-text) !important;
  background: rgba(255, 255, 255, 0.05) !important;
}

.mr-topbar--kefu-tabs .mr-kefu-router-tabs--underline button.is-active {
  background: var(--kf-grad-primary) !important;
  color: var(--xiaoone-accent-fg) !important;
  border-bottom-color: transparent !important;
  box-shadow:
    0 6px 18px -8px rgba(139, 92, 246, 0.6),
    inset 0 1px 0 rgba(255, 255, 255, 0.18) !important;
}

.mr-topbar--kefu-tabs .mr-kefu-router-tabs--underline button.is-active b {
  color: var(--xiaoone-accent-fg) !important;
  font-weight: 650;
}

.mr-topbar--kefu-tabs .mr-kefu-router-tabs--underline button:focus-visible {
  outline: 0;
  box-shadow: 0 0 0 3px var(--kf-violet-ring);
}

.mr-topbar--kefu-tabs .mr-kefu-router-tabs--underline button b {
  font-size: 13px;
  font-weight: 550;
  letter-spacing: 0.01em;
}

/* ============================================================
   基础排版与容器
   ============================================================ */
.mr-kefu-router-page .x1-lc-container {
  max-width: none;
  padding: 0;
}

.mr-kefu-router-page .x1-lc-workspace {
  border: 0;
  border-radius: 0;
  box-shadow: none;
  background: transparent;
}

.mr-kefu-router-page .mr-page-head h1,
.mr-kefu-router-page .mr-panel-head h2,
.mr-kefu-router-page .mr-simple-item strong,
.mr-kefu-router-page .mr-status-card strong,
.mr-kefu-router-page .mr-live-msg-meta strong,
.mr-kefu-router-page .mr-empty strong {
  color: var(--kf-text);
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
  color: var(--kf-text-mute);
}

/* ============================================================
   表面 / 通用卡片
   ============================================================ */
.mr-kefu-router-page .mr-surface:not(.mr-kefu-tabbar) {
  border: 1px solid var(--kf-line);
  background: var(--kf-surface);
  border-radius: var(--xiaoone-panel-radius);
  box-shadow: 0 18px 44px -32px rgba(0, 0, 0, 0.6);
}

/* ============================================================
   表单元素 (input / select / textarea)
   ============================================================ */
.mr-kefu-router-page input,
.mr-kefu-router-page select,
.mr-kefu-router-page textarea,
.mr-kefu-router-page .mr-chat-input textarea {
  border: 1px solid var(--kf-line);
  background: rgba(12, 14, 22, 0.72);
  color: var(--kf-text);
  border-radius: var(--xiaoone-control-radius);
  transition: border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
}

.mr-kefu-router-page input::placeholder,
.mr-kefu-router-page textarea::placeholder {
  color: var(--kf-text-faint);
}

.mr-kefu-router-page input:focus,
.mr-kefu-router-page select:focus,
.mr-kefu-router-page textarea:focus,
.mr-kefu-router-page .mr-chat-input textarea:focus {
  outline: 0;
  border-color: var(--kf-violet);
  box-shadow: 0 0 0 3px var(--kf-violet-soft);
  background: rgba(12, 14, 22, 0.92);
}

/* composer 内部 textarea 不要内边框/焦点环（外层 composer 已经有视觉容器） */
.mr-kefu-router-page .x1-lc-composer textarea {
  border: none;
  background: transparent;
  box-shadow: none;
  border-radius: 0;
}

.mr-kefu-router-page .x1-lc-composer textarea:focus {
  outline: none;
  border: none;
  box-shadow: none;
  background: transparent;
}

/* ============================================================
   通用按钮 / 主操作 / 危险操作
   ============================================================ */
.mr-kefu-router-page .mr-btn {
  border: 1px solid var(--kf-line);
  background: var(--kf-surface-2);
  color: var(--kf-text);
  border-radius: var(--xiaoone-control-radius);
  transition: border-color 0.18s ease, background 0.18s ease, transform 0.12s ease;
}

.mr-kefu-router-page .mr-btn:hover:not(:disabled) {
  border-color: var(--kf-line-2);
  background: var(--kf-surface-hover);
}

.mr-kefu-router-page .mr-btn-primary {
  border: 0;
  background: var(--kf-grad-primary);
  color: var(--xiaoone-accent-fg);
  box-shadow: 0 10px 24px -10px rgba(139, 92, 246, 0.6);
}

.mr-kefu-router-page .mr-btn-primary:hover:not(:disabled) {
  filter: brightness(1.08);
  transform: translateY(-1px);
}

.mr-kefu-router-page .mr-btn-danger {
  border-color: rgba(244, 114, 182, 0.42);
  background: rgba(244, 114, 182, 0.12);
  color: #f9a8d4;
}

.mr-kefu-router-page .mr-simple-item,
.mr-kefu-router-page .mr-status-card,
.mr-kefu-router-page .mr-chat-item,
.mr-kefu-router-page .mr-source-item,
.mr-kefu-router-page .mr-upload-box,
.mr-kefu-router-page .mr-empty,
.mr-kefu-router-page .mr-live-msg-bubble {
  border: 1px solid var(--kf-line);
  background: var(--kf-surface);
  color: var(--kf-text);
  border-radius: var(--xiaoone-panel-radius);
}

.mr-kefu-router-page .mr-chat-item.is-active {
  border-color: var(--kf-violet-ring);
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.24), rgba(99, 102, 241, 0.18));
  box-shadow: var(--kf-violet-glow);
}

.mr-kefu-router-page .mr-badge {
  border: 1px solid var(--kf-line);
  background: var(--kf-violet-soft);
  color: #d6cffb;
}

.mr-kefu-router-page .mr-state-error {
  border-color: rgba(244, 114, 182, 0.45);
  background: rgba(244, 114, 182, 0.12);
  color: #fbcfe8;
  border-radius: var(--xiaoone-panel-radius);
}

.mr-kefu-router-page .mr-live-msg-row.is-agent .mr-live-msg-bubble {
  border-color: rgba(139, 92, 246, 0.35);
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.32), rgba(99, 102, 241, 0.22));
  color: #f3f1fb;
}

.mr-kefu-router-page .mr-live-msg-row.is-visitor .mr-live-msg-bubble {
  background: var(--kf-surface-3);
  color: var(--kf-text);
}

/* ============================================================
   在线客服总体框架 (header / body / sidebar / main)
   ============================================================ */
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
.mr-kefu-router-page .x1-lc-tabs,
.mr-kefu-router-page .x1-lc-bubble-row.is-system,
.mr-kefu-router-page .x1-lc-badge {
  background: transparent;
  color: var(--kf-text);
  border-color: var(--kf-line);
}

.mr-kefu-router-page .x1-lc-header {
  background: transparent;
  border-color: var(--kf-line);
  box-shadow: none;
}

.mr-kefu-router-page .x1-lc-body {
  background: transparent;
  border-color: var(--kf-line);
}

.mr-kefu-router-page .x1-lc-body:not(.x1-lc-settings-workspace) {
  gap: 0;
  margin: 20px;
  box-sizing: border-box;
}

.mr-kefu-router-page .x1-lc-sidebar {
  background: linear-gradient(180deg, rgba(16, 18, 28, 0.62), rgba(10, 11, 19, 0.4));
  box-shadow: inset -1px 0 0 var(--kf-line);
}

.mr-kefu-router-page .x1-lc-sidebar-head {
  background: transparent;
  border-bottom: 1px solid var(--kf-line);
  color: var(--kf-text);
  font-weight: 600;
  letter-spacing: 0.01em;
}

.mr-kefu-router-page .x1-lc-main {
  background:
    radial-gradient(600px 320px at 80% 0%, rgba(139, 92, 246, 0.08), transparent 70%),
    rgba(10, 11, 19, 0.32);
}

.mr-kefu-router-page .x1-lc-main-head {
  background: linear-gradient(180deg, rgba(22, 24, 36, 0.7), rgba(22, 24, 36, 0.32));
  border-bottom: 1px solid var(--kf-line);
}

.mr-kefu-router-page .x1-lc-main-title h2 {
  color: var(--kf-text);
  font-weight: 650;
  letter-spacing: 0.005em;
}

.mr-kefu-router-page .x1-lc-messages {
  background: transparent;
  padding: 24px 24px 12px;
  gap: 14px;
  scrollbar-color: rgba(139, 92, 246, 0.3) transparent;
}

/* ============================================================
   会话状态 segmented (等待中 / 进行中 / 已归档)
   ============================================================ */
.mr-kefu-router-page .x1-lc-tabs {
  background: rgba(16, 18, 28, 0.6);
  border: 1px solid var(--kf-line);
  padding: 4px;
  border-radius: var(--xiaoone-r-pill);
}

.mr-kefu-router-page .x1-lc-tab {
  color: var(--kf-text-mute);
  border-radius: var(--xiaoone-r-pill);
  padding: 6px 14px;
  transition: color 0.18s ease, background 0.18s ease, transform 0.18s ease;
}

.mr-kefu-router-page .x1-lc-tab:hover:not(.is-active) {
  color: var(--kf-text);
  background: rgba(255, 255, 255, 0.04);
}

.mr-kefu-router-page .x1-lc-tab.is-active {
  color: var(--xiaoone-accent-fg);
  background: var(--kf-grad-primary);
  border-color: transparent;
  box-shadow: 0 6px 16px -8px rgba(139, 92, 246, 0.55);
}

.mr-kefu-router-page .x1-lc-tab--waiting.is-active {
  background: linear-gradient(135deg, #f59e0b, #fb923c);
  box-shadow: 0 6px 16px -8px rgba(251, 146, 60, 0.55);
}

.mr-kefu-router-page .x1-lc-tab--active.is-active {
  background: linear-gradient(135deg, #10b981, #34d399);
  box-shadow: 0 6px 16px -8px rgba(52, 211, 153, 0.5);
}

.mr-kefu-router-page .x1-lc-tab--closed.is-active {
  background: linear-gradient(135deg, #475569, #64748b);
  box-shadow: none;
}

.mr-kefu-router-page .x1-lc-tab em {
  background: rgba(255, 255, 255, 0.18);
  color: var(--xiaoone-accent-fg);
  font-weight: 600;
}

/* ============================================================
   会话列表 (sidebar item)
   ============================================================ */
.mr-kefu-router-page .x1-lc-list {
  padding: 10px 10px 16px;
  gap: 6px;
}

.mr-kefu-router-page .x1-lc-item {
  position: relative;
  padding: 12px 14px;
  border-radius: var(--xiaoone-panel-radius);
  border: 1px solid transparent;
  background: transparent;
  color: var(--kf-text);
  transition: background 0.18s ease, border-color 0.18s ease, transform 0.12s ease;
}

.mr-kefu-router-page .x1-lc-item:hover {
  background: rgba(255, 255, 255, 0.035);
  border-color: var(--kf-line);
}

.mr-kefu-router-page .x1-lc-item.is-active {
  background: linear-gradient(120deg, rgba(139, 92, 246, 0.22), rgba(99, 102, 241, 0.14) 60%, transparent);
  border-color: rgba(139, 92, 246, 0.36);
  color: var(--kf-text);
}

.mr-kefu-router-page .x1-lc-item-top strong {
  color: var(--kf-text);
  font-weight: 600;
}

.mr-kefu-router-page .x1-lc-item.is-active .x1-lc-item-top strong {
  color: var(--xiaoone-accent-fg);
}

.mr-kefu-router-page .x1-lc-item-top time {
  color: var(--kf-text-mute);
  font-variant-numeric: tabular-nums;
}

.mr-kefu-router-page .x1-lc-item.is-active .x1-lc-item-top time {
  color: rgba(255, 255, 255, 0.86);
}

.mr-kefu-router-page .x1-lc-item-bottom {
  color: var(--kf-text-mute);
  gap: 8px;
}

.mr-kefu-router-page .x1-lc-item.is-active .x1-lc-item-bottom {
  color: rgba(255, 255, 255, 0.85);
}

/* 会话列表里那条小状态徽章（等待中/已归档/...）：按色区分 */
.mr-kefu-router-page .x1-lc-item-badge {
  border: 1px solid transparent;
  background: rgba(148, 163, 184, 0.16);
  color: #d4d4d8;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.mr-kefu-router-page .x1-lc-item-badge-danger {
  background: var(--kf-danger-bg);
  color: #fbcfe8;
  border-color: rgba(244, 114, 182, 0.35);
  position: relative;
  padding-left: 14px;
}

.mr-kefu-router-page .x1-lc-item-badge-danger::before {
  content: '';
  position: absolute;
  left: 5px;
  top: 50%;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #f472b6;
  transform: translateY(-50%);
  box-shadow: 0 0 0 0 rgba(244, 114, 182, 0.55);
  animation: kf-pulse 1.6s ease-out infinite;
}

@keyframes kf-pulse {
  0%   { box-shadow: 0 0 0 0 rgba(244, 114, 182, 0.55); }
  70%  { box-shadow: 0 0 0 8px rgba(244, 114, 182, 0); }
  100% { box-shadow: 0 0 0 0 rgba(244, 114, 182, 0); }
}

/* 列表里"等待中"用暖色调，"进行中"用绿色调 */
.mr-kefu-router-page .x1-lc-item .x1-lc-item-badge:first-child:not(.x1-lc-item-badge-danger) {
  background: rgba(251, 191, 36, 0.18);
  color: #fbd581;
  border-color: rgba(251, 191, 36, 0.3);
}

/* ============================================================
   聊天 header 操作按钮 + composer 按钮 + 通用 icon button
   ============================================================ */
.mr-kefu-router-page .x1-lc-btn {
  border: 1px solid var(--kf-line);
  background: var(--kf-surface-2);
  color: var(--kf-text);
  border-radius: var(--xiaoone-panel-radius);
  height: 34px;
  padding: 0 14px;
  box-shadow: none;
  transition: background 0.16s ease, border-color 0.16s ease, transform 0.12s ease;
}

.mr-kefu-router-page .x1-lc-btn:hover:not(:disabled) {
  background: var(--kf-surface-hover);
  border-color: var(--kf-line-2);
}

.mr-kefu-router-page .x1-lc-btn:disabled {
  opacity: 0.45;
}

.mr-kefu-router-page .x1-lc-btn-primary {
  border: 0;
  background: var(--kf-grad-primary);
  color: var(--xiaoone-accent-fg);
  box-shadow: 0 10px 22px -10px rgba(139, 92, 246, 0.6);
}

.mr-kefu-router-page .x1-lc-btn-primary:hover:not(:disabled) {
  filter: brightness(1.08);
  transform: translateY(-1px);
}

.mr-kefu-router-page .x1-lc-icon-btn {
  background: rgba(255, 255, 255, 0.04);
  color: var(--kf-text-soft);
  border-radius: var(--xiaoone-panel-radius);
  border: 1px solid transparent;
  transition: background 0.16s ease, color 0.16s ease, transform 0.12s ease;
}

.mr-kefu-router-page .x1-lc-icon-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.09);
  color: var(--kf-text);
}

.mr-kefu-router-page .x1-lc-icon-btn.primary {
  background: var(--kf-grad-primary);
  color: var(--xiaoone-accent-fg);
  box-shadow: 0 10px 22px -10px rgba(139, 92, 246, 0.6);
}

.mr-kefu-router-page .x1-lc-icon-btn.primary:hover:not(:disabled) {
  filter: brightness(1.1);
  transform: translateY(-1px);
}

/* ============================================================
   接管提示条 (handoff hint) → chip 风格
   ============================================================ */
.mr-kefu-router-page .x1-lc-handoff-hint {
  margin: 10px 20px 0;
  border: 1px solid var(--kf-line);
  border-radius: var(--xiaoone-r-pill);
  padding: 8px 16px;
  background: var(--kf-surface-2);
  color: var(--kf-text-soft);
  font-size: 12.5px;
  gap: 10px;
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--kf-line);
}

.mr-kefu-router-page .x1-lc-handoff-hint-waiting {
  border-color: rgba(251, 191, 36, 0.32);
  background: rgba(251, 191, 36, 0.10);
  color: #fbd581;
}

.mr-kefu-router-page .x1-lc-handoff-hint-active {
  border-color: rgba(52, 211, 153, 0.30);
  background: rgba(52, 211, 153, 0.10);
  color: #6ee7b7;
}

.mr-kefu-router-page .x1-lc-handoff-hint-closed {
  border-color: var(--kf-line);
  background: rgba(148, 163, 184, 0.08);
  color: var(--kf-text-mute);
}

.mr-kefu-router-page .x1-lc-handoff-hint:has(.x1-lc-handoff-dot) {
  border-color: rgba(244, 114, 182, 0.45);
  background: rgba(244, 114, 182, 0.14);
  color: #fbcfe8;
  animation: kf-glow 2.2s ease-in-out infinite;
}

@keyframes kf-glow {
  0%, 100% { box-shadow: 0 0 0 0 rgba(244, 114, 182, 0); }
  50%      { box-shadow: 0 0 22px -4px rgba(244, 114, 182, 0.35); }
}

.mr-kefu-router-page .x1-lc-handoff-meta {
  color: var(--kf-text);
  font-weight: 600;
}

/* ============================================================
   消息气泡
   ============================================================ */
.mr-kefu-router-page .x1-lc-bubble-content {
  background: var(--kf-surface-3);
  color: var(--kf-text);
  border-radius: var(--xiaoone-panel-radius);
  border-bottom-left-radius: 4px;
  padding: 11px 15px;
  box-shadow: 0 8px 20px -16px rgba(0, 0, 0, 0.6);
}

.mr-kefu-router-page .x1-lc-bubble-row.is-agent .x1-lc-bubble-content {
  background: var(--kf-grad-primary);
  color: var(--xiaoone-accent-fg);
  border-bottom-left-radius: 14px;
  border-bottom-right-radius: 4px;
  box-shadow: 0 12px 26px -14px rgba(139, 92, 246, 0.55);
}

.mr-kefu-router-page .x1-lc-bubble-row.is-system {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--kf-line);
  color: var(--kf-text-mute);
  font-size: 12px;
  border-radius: var(--xiaoone-r-pill);
  padding: 4px 14px;
  align-self: center;
  margin: 8px 0;
}

.mr-kefu-router-page .x1-lc-bubble-meta {
  color: var(--kf-text-mute);
  font-size: 11.5px;
  gap: 8px;
}

.mr-kefu-router-page .x1-lc-bubble-meta strong {
  color: var(--kf-text-soft);
  font-weight: 600;
}

/* ============================================================
   Composer (底部输入)
   ============================================================ */
.mr-kefu-router-page .x1-lc-composer {
  border-top: 1px solid var(--kf-line);
  background: rgba(10, 11, 19, 0.65);
}

.mr-kefu-router-page .x1-lc-composer-inner {
  margin: 14px 18px 16px;
  border: 1px solid var(--kf-line);
  border-radius: var(--xiaoone-dialog-radius);
  background: var(--kf-surface);
  padding: 12px 14px 12px;
  min-height: 92px;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
}

.mr-kefu-router-page .x1-lc-composer-inner:focus-within {
  border-color: var(--kf-violet);
  box-shadow: 0 0 0 4px var(--kf-violet-soft), 0 18px 36px -22px rgba(139, 92, 246, 0.5);
  background: var(--kf-surface-2);
}

.mr-kefu-router-page .x1-lc-composer textarea {
  color: var(--kf-text);
  font-size: 14.5px;
  padding-right: 96px;
}

.mr-kefu-router-page .x1-lc-composer textarea::placeholder {
  color: var(--kf-text-faint);
}

.mr-kefu-router-page .x1-lc-composer-actions {
  right: 12px;
  bottom: 10px;
  gap: 8px;
}

.mr-kefu-router-page .x1-lc-item-top strong,
.mr-kefu-router-page .x1-lc-bubble-meta strong,
.mr-kefu-router-page .x1-lc-main-title h2 {
  color: var(--mr-text);
}

.mr-kefu-router-page .x1-lc-item-bottom,
.mr-kefu-router-page .x1-lc-item-top time,
.mr-kefu-router-page .x1-lc-tab,
.mr-kefu-router-page .x1-lc-header-toolbar .x1-lc-status,
.mr-kefu-router-page .x1-lc-settings-tabrail .x1-lc-status,
.mr-kefu-router-page .x1-lc-main-head .x1-lc-status {
  color: var(--kf-text-mute);
}

/* ============================================================
   渠道 / 账号 / 配置卡片（开通设置 / 接入方式）
   ============================================================ */
.mr-kefu-router-page .mr-provider-grid {
  display: grid;
  gap: 14px;
}

.mr-kefu-router-page .mr-provider-card {
  border: 1px solid var(--kf-line);
  border-radius: var(--xiaoone-panel-radius);
  background: var(--kf-surface);
  padding: 16px;
  display: grid;
  gap: 14px;
  box-shadow: 0 8px 22px -18px rgba(0, 0, 0, 0.55);
}

.mr-kefu-router-page .mr-provider-head h3 {
  margin: 0;
  font-size: 15px;
  color: var(--kf-text);
}

.mr-kefu-router-page .mr-provider-head p,
.mr-kefu-router-page .mr-field-hint {
  margin: 4px 0 0;
  color: var(--kf-text-mute);
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
  color: var(--kf-text-mute);
  font-size: 12px;
}

.mr-kefu-router-page .mr-account-card {
  border: 1px solid var(--kf-line);
  border-radius: var(--xiaoone-panel-radius);
  background: rgba(12, 14, 22, 0.55);
  padding: 12px 14px;
  display: grid;
  gap: 8px;
}

.mr-kefu-router-page .mr-code-row {
  min-width: 0;
  border-radius: var(--xiaoone-control-radius);
  background: rgba(8, 9, 16, 0.7);
  color: var(--kf-text-soft);
  padding: 7px 10px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11.5px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ============================================================
   配置子页公共框架（开通设置 / 自动回复 / 接入方式 / 测试）
   ============================================================ */
.mr-kefu-router-page .x1-lc-settings-page > .x1-lc-header {
  border: none;
  box-shadow: none;
  background: transparent;
}

.mr-kefu-router-page .x1-lc-settings-lede {
  color: var(--kf-text-mute);
}

.mr-kefu-router-page .x1-lc-settings-workspace {
  background: var(--kf-surface);
  border: 1px solid var(--kf-line);
  border-radius: var(--xiaoone-dialog-radius);
  box-shadow: 0 18px 44px -32px rgba(0, 0, 0, 0.6);
}

.mr-kefu-router-page .x1-lc-settings-tabrail {
  background: rgba(16, 18, 28, 0.4);
  border-bottom: 1px solid var(--kf-line);
}

.mr-kefu-router-page .x1-lc-settings-row {
  background: var(--kf-surface-2);
  border: 1px solid var(--kf-line);
  border-radius: var(--xiaoone-panel-radius);
  transition: border-color 0.18s ease, background 0.18s ease;
}

.mr-kefu-router-page .x1-lc-settings-row:hover {
  border-color: var(--kf-line-2);
}

.mr-kefu-router-page .x1-lc-settings-well {
  background: var(--kf-surface-2);
  border: 1px solid var(--kf-line);
  border-radius: var(--xiaoone-panel-radius);
}

/* ============================================================
   "先完成这 3 步" 开通状态卡 (readiness)
   ============================================================ */
.mr-kefu-router-page .x1-lc-readiness {
  border: 1px solid var(--kf-line);
  border-radius: var(--xiaoone-dialog-radius);
  background:
    radial-gradient(420px 200px at 0% 0%, rgba(139, 92, 246, 0.16), transparent 65%),
    var(--kf-surface);
  padding: 14px 16px;
  box-shadow: 0 14px 32px -22px rgba(0, 0, 0, 0.55);
}

.mr-kefu-router-page .x1-lc-readiness-main strong {
  color: var(--kf-text);
  font-size: 14px;
  font-weight: 650;
  letter-spacing: 0.01em;
}

.mr-kefu-router-page .x1-lc-readiness-main span {
  color: var(--kf-text-mute);
}

.mr-kefu-router-page .x1-lc-readiness-progress {
  background: rgba(255, 255, 255, 0.06);
  height: 6px;
}

.mr-kefu-router-page .x1-lc-readiness-progress i {
  background: var(--kf-grad-primary);
  box-shadow: 0 0 18px var(--kf-violet-ring);
}

.mr-kefu-router-page .x1-lc-readiness-step {
  border: 1px solid var(--kf-line);
  background: var(--kf-surface-2);
  color: var(--kf-text);
  border-radius: var(--xiaoone-panel-radius);
  padding: 11px 12px;
  transition: border-color 0.18s ease, background 0.18s ease, transform 0.12s ease;
  cursor: pointer;
}

.mr-kefu-router-page .x1-lc-readiness-step:hover {
  border-color: var(--kf-violet-ring);
  background: var(--kf-surface-hover);
  transform: translateY(-1px);
}

.mr-kefu-router-page .x1-lc-readiness-step b {
  color: var(--kf-text);
  font-size: 13px;
}

.mr-kefu-router-page .x1-lc-readiness-step span {
  color: var(--kf-text-mute);
  font-size: 11.5px;
}

.mr-kefu-router-page .x1-lc-readiness-step em {
  width: 26px;
  height: 26px;
  background: rgba(255, 255, 255, 0.06);
  color: var(--kf-text-soft);
  border: 1px solid var(--kf-line);
  font-weight: 700;
}

.mr-kefu-router-page .x1-lc-readiness-step.is-ready {
  border-color: rgba(52, 211, 153, 0.36);
  background: linear-gradient(135deg, rgba(52, 211, 153, 0.18), rgba(16, 185, 129, 0.10));
}

.mr-kefu-router-page .x1-lc-readiness-step.is-ready em {
  background: linear-gradient(135deg, #10b981, #34d399);
  color: var(--xiaoone-accent-fg);
  border-color: transparent;
  box-shadow: 0 6px 16px -6px rgba(52, 211, 153, 0.55);
}

.mr-kefu-router-page .x1-lc-readiness-step.is-ready b,
.mr-kefu-router-page .x1-lc-readiness-step.is-ready span {
  color: #d1fae5;
}

.mr-kefu-router-page .x1-lc-readiness-action {
  background: var(--kf-grad-primary) !important;
  border: 0 !important;
  color: var(--xiaoone-accent-fg) !important;
  box-shadow: 0 10px 24px -10px rgba(139, 92, 246, 0.6) !important;
}

.mr-kefu-router-page .x1-lc-readiness-action:hover {
  filter: brightness(1.08);
  transform: translateY(-1px);
}

/* ============================================================
   头像 / 空状态图标
   ============================================================ */
.mr-kefu-router-page .x1-lc-item-avatar,
.mr-kefu-router-page .xo-default-avatar,
.mr-kefu-router-page .x1-lc-empty-icon {
  border: 1px solid var(--kf-line);
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.22), rgba(99, 102, 241, 0.16));
  color: var(--kf-text);
}

.mr-kefu-router-page .x1-lc-item.is-active .x1-lc-item-avatar,
.mr-kefu-router-page .x1-lc-item.is-active .xo-default-avatar {
  border-color: rgba(255, 255, 255, 0.45);
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0.06));
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.12);
}

.mr-kefu-router-page .xo-default-avatar--brand img {
  filter: invert(1) drop-shadow(0 0 6px rgba(139, 92, 246, 0.5));
}

/* ============================================================
   兜底（覆盖到 chat-kit 自带的浅色 inline style）
   ============================================================ */
.mr-kefu-router-page [style*='background: #fff'],
.mr-kefu-router-page [style*='background:#fff'],
.mr-kefu-router-page [style*='background: #fafbfc'],
.mr-kefu-router-page [style*='background:#fafbfc'],
.mr-kefu-router-page [style*='background: #f1f3f7'],
.mr-kefu-router-page [style*='background:#f1f3f7'],
.mr-kefu-router-page [style*='background:#edf3ff'] {
  border-color: var(--kf-line) !important;
  background: var(--kf-surface-2) !important;
  color: var(--kf-text) !important;
}

.mr-kefu-router-page .x1-lc-empty strong,
.mr-kefu-router-page h2,
.mr-kefu-router-page h3,
.mr-kefu-router-page h4 {
  color: var(--kf-text);
}

.mr-kefu-router-page svg {
  color: currentColor;
}

/* ============================================================
   空状态 CTA：让"下一步该干嘛"一眼可见
   ============================================================ */
.mr-kefu-router-page .x1-lc-empty-cta {
  padding: 32px 24px;
  max-width: 520px;
  margin: 0 auto;
  gap: 14px;
}

.mr-kefu-router-page .x1-lc-empty-cta .x1-lc-empty-icon {
  width: 56px;
  height: 56px;
  border-radius: 18px;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.28), rgba(99, 102, 241, 0.18));
  color: #d6cffb;
  border: 1px solid var(--kf-violet-ring);
  box-shadow: 0 14px 32px -16px rgba(139, 92, 246, 0.55);
}

.mr-kefu-router-page .x1-lc-empty-cta strong {
  font-size: 16px;
  letter-spacing: 0.01em;
}

.mr-kefu-router-page .x1-lc-empty-cta p {
  color: var(--kf-text-mute);
  font-size: 13px;
  line-height: 1.6;
  max-width: 420px;
}

.mr-kefu-router-page .x1-lc-empty-cta p b {
  color: var(--kf-text);
  font-weight: 600;
}

.mr-kefu-router-page .x1-lc-empty-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
  margin-top: 6px;
}

/* 翻译开关 "已开" 视觉状态：浅紫底 + 紫色文字，区别于纯主按钮 */
.mr-kefu-router-page .x1-lc-btn.is-on {
  background: var(--kf-violet-soft) !important;
  border-color: var(--kf-violet-ring) !important;
  color: #d6cffb !important;
}

/* ============================================================
   自动回复开关
   ============================================================ */
.mr-kefu-router-page .kf-auto-reply-control {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px;
  border: 1px solid var(--kf-line);
  border-radius: var(--xiaoone-panel-radius);
  background: var(--kf-surface-2);
}

.mr-kefu-router-page .kf-auto-reply-control-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
}

.mr-kefu-router-page .kf-auto-reply-control-head > span {
  color: var(--kf-text);
  font-size: 13px;
  font-weight: 600;
}

.mr-kefu-router-page .kf-auto-reply-control-head > small {
  flex: 1 1 220px;
  color: var(--kf-text-mute);
  font-size: 12px;
  line-height: 1.5;
}

.mr-kefu-router-page .kf-auto-reply-toggle {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  color: var(--kf-text-soft);
  cursor: pointer;
  user-select: none;
}

.mr-kefu-router-page .kf-auto-reply-toggle input[type="checkbox"] {
  width: 14px;
  height: 14px;
  accent-color: var(--kf-violet);
}

/* ============================================================
   折叠的"更多设置"开关 + 面板
   ============================================================ */
.mr-kefu-router-page .kf-advanced-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 12px 14px;
  border: 1px dashed var(--kf-line-2);
  border-radius: var(--xiaoone-panel-radius);
  background: rgba(13, 15, 24, 0.45);
  color: var(--kf-text-soft);
  cursor: pointer;
  transition: border-color 0.18s ease, background 0.18s ease, color 0.18s ease;
  text-align: left;
}

.mr-kefu-router-page .kf-advanced-toggle:hover {
  border-color: var(--kf-violet-ring);
  color: var(--kf-text);
  background: rgba(28, 30, 46, 0.6);
}

.mr-kefu-router-page .kf-advanced-toggle.is-open {
  border-style: solid;
  border-color: var(--kf-violet-ring);
  background: var(--kf-violet-soft);
  color: var(--kf-text);
}

.mr-kefu-router-page .kf-advanced-toggle > span {
  font-size: 13px;
  font-weight: 600;
}

.mr-kefu-router-page .kf-advanced-toggle > small {
  color: var(--kf-text-mute);
  font-size: 12px;
  text-align: right;
}

.mr-kefu-router-page .kf-advanced-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
  border: 1px solid var(--kf-line);
  border-radius: var(--xiaoone-panel-radius);
  background: var(--kf-surface-3);
}

.mr-kefu-router-page .kf-advanced-panel-section {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-bottom: 2px;
}

.mr-kefu-router-page .kf-advanced-panel-section strong {
  font-size: 13px;
  color: var(--kf-text);
}

.mr-kefu-router-page .kf-advanced-panel-section small {
  font-size: 12px;
  color: var(--kf-text-mute);
}

@media (max-width: 900px) {
  .mr-kefu-router-page {
    padding: 0 0 28px;
    height: auto;
    overflow: visible;
  }

  .mr-kefu-router-page > .mr-kefu-tabbar {
    padding-inline: 14px;
  }

  .mr-kefu-router-page > .mr-kefu-tabbar .mr-kefu-tabbar-inner {
    align-items: flex-start;
    gap: 8px;
  }

  .mr-kefu-router-page > .mr-kefu-tabbar .mr-kefu-router-tabs--underline {
    flex: 1 1 auto;
    max-width: none;
    overflow-x: auto;
    overflow-y: hidden;
    -webkit-overflow-scrolling: touch;
  }

  .mr-kefu-router-page > .mr-kefu-tabbar .mr-kefu-router-tabs--underline button {
    white-space: nowrap;
    padding: 8px 12px 10px;
  }

  .mr-kefu-router-page > .mr-kefu-router-body {
    overflow: visible;
    padding: 12px 14px 0;
  }

  .mr-kefu-router-page > .mr-kefu-router-body.is-live-chat {
    flex: 1 1 auto;
    min-height: 0;
    overflow: hidden;
    padding: 0;
  }

  .mr-kefu-router-page > .mr-kefu-router-body.is-settings {
    padding: 12px 12px 18px;
  }
}
`

export function KefuOverviewPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { theme, t } = usePreferences()
  const {
    activeCount,
    activeVisitorUnreadSum,
    closedCount,
    fetchCounts,
    waitingCount,
    waitingVisitorUnreadSum,
  } = useLiveChatStore()
  const activeTopTab: KefuTopTab = location.pathname.startsWith('/workbench/kefu/help-center')
    ? 'help-center'
    : location.pathname.startsWith('/workbench/kefu/settings')
      ? 'settings'
      : readLiveState(location.search)
  const liveState = activeTopTab === 'settings' || activeTopTab === 'help-center' ? 'waiting' : activeTopTab
  const settingsTab = readSettingsTab(location.search)
  const isSettingsWorkspace = activeTopTab === 'settings' || activeTopTab === 'help-center'

  useEffect(() => {
    void fetchCounts()
  }, [fetchCounts])

  useEffect(() => {
    const tab = new URLSearchParams(location.search).get('tab')
    if (location.pathname.startsWith('/workbench/kefu/settings') && tab === 'help-center')
      navigate(helpCenterRoute(), { replace: true })
    if (location.pathname.startsWith('/workbench/kefu/settings') && (tab === 'auto-reply' || tab === 'profile')) {
      const next = tab === 'auto-reply' ? 'qa-library' : 'uploads'
      navigate(settingsRoute(next), { replace: true })
    }
  }, [location.pathname, location.search, navigate])

  const onLiveStateChange = useCallback((next: LiveState) => {
    navigate(stateRoute(next), { replace: true })
  }, [navigate])

  const topCounts = useMemo(() => ({
    waiting: { count: waitingCount, unread: waitingVisitorUnreadSum },
    active: { count: activeCount, unread: activeVisitorUnreadSum },
    closed: { count: closedCount, unread: 0 },
  }), [activeCount, activeVisitorUnreadSum, closedCount, waitingCount, waitingVisitorUnreadSum])

  useLocalizedTopbarSlot(() => ({
    className: 'mr-topbar--kefu-tabs',
    leading: (
      <div
        className="mr-kefu-router-tabs mr-kefu-router-tabs--underline"
        role="tablist"
        aria-label={t('kefu.tabsAria')}
      >
        {KEFU_TOP_TABS.map((tab) => {
          const stats = tab.key === 'waiting' || tab.key === 'active' || tab.key === 'closed' ? topCounts[tab.key] : null
          return (
            <button
              key={tab.key}
              type="button"
              className={activeTopTab === tab.key ? 'is-active' : ''}
              onClick={() => {
                if (tab.key === 'settings')
                  navigate(settingsRoute(settingsTab))
                else if (tab.key === 'help-center')
                  navigate(helpCenterRoute())
                else
                  navigate(stateRoute(tab.key))
              }}
              role="tab"
              aria-selected={activeTopTab === tab.key}
            >
              <b>{t(tab.labelKey, tab.fallback)}</b>
              {tab.key === 'waiting' && stats && stats.count > 0 ? <span className="is-alert">{formatCountBadge(stats.count)}</span> : null}
              {tab.key !== 'waiting' && stats ? <em>{formatCountBadge(stats.count)}</em> : null}
              {tab.key !== 'waiting' && stats && stats.unread > 0 ? <span>{formatCountBadge(stats.unread)}</span> : null}
            </button>
          )
        })}
      </div>
    ),
  }), [activeTopTab, navigate, settingsTab, topCounts])

  return (
    <div className="mr-page mr-kefu-router-page">
      <style>{KEFU_SHARED_CSS}</style>
      {theme === 'dark' ? <style>{KEFU_DENSE_CSS}</style> : null}
      <div className={`mr-kefu-router-body ${isSettingsWorkspace ? 'is-settings' : 'is-live-chat'}`}>
        {activeTopTab === 'help-center' ? (
          <KefuHelpCenterPage />
        ) : activeTopTab !== 'settings' ? (
          <LiveChatShellPage state={liveState} onStateChange={onLiveStateChange} hideStateTabs />
        ) : (
          <div className="mr-kefu-settings-shell">
            <div className="mr-kefu-settings-tabs" role="tablist" aria-label={t('kefu.settings.tabsAria')}>
              {KEFU_SETTINGS_TABS.map(tab => (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={settingsTab === tab.key}
                  className={settingsTab === tab.key ? 'is-active' : ''}
                  onClick={() => navigate(settingsRoute(tab.key))}
                >
                  {t(tab.labelKey, tab.fallback)}
                </button>
              ))}
            </div>
            <div className="mr-kefu-settings-panel">
              {settingsTab === 'stores' ? <KefuStoresPage /> : null}
              {settingsTab === 'uploads' ? <KefuQaTemplatesPage mode="uploads" /> : null}
              {settingsTab === 'qa-library' ? <KefuQaTemplatesPage mode="qa-library" /> : null}
              {settingsTab === 'quick-replies' ? <KefuQuickRepliesPage /> : null}
              {settingsTab === 'tech-config' ? <KefuTechConfigPage /> : null}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
