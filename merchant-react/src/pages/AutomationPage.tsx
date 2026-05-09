import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { getChatKit, type AgentModelAvailability, type AgentThread } from '@xiaoone/chat-kit'
import { Icon } from '../components/Icon'
import { XiaooneComposer } from '../components/XiaooneComposer'
import { useWorkspaceStore } from '../store/workspace'
import {
  AUTOMATION_AGENT_PLUGIN_KEYS,
  BUSINESS_CONFIGS,
  defaultModeForBusiness,
  defaultModelForBusiness,
} from '../lib/composer'
import { toast } from '@xiaoone/react-ui'
import './automation-page.css'

interface AutomationTemplate {
  key: string
  title: string
  description: string
  plugin: string
  prompt: string
}

export function AutomationPage() {
  const { AgentModelAvailabilityAPI, AgentThreadAPI } = getChatKit()
  const ws = useWorkspaceStore()
  const navigate = useNavigate()

  const cfg = BUSINESS_CONFIGS.automation
  const templates: AutomationTemplate[] = [
    { key: 'industry', title: '资讯日报', description: '汇总行业动态、政策、机会和风险', plugin: 'industry', prompt: '请整理过去 24 小时内与本店铺相关的行业资讯，按机会、风险、行动建议输出。' },
    { key: 'competitor', title: '竞品监控', description: '跟踪价格、活动、渠道和内容变化', plugin: 'competitor', prompt: '请监控主要竞品的价格、活动、内容和渠道变化，并输出对我方的建议。' },
    { key: 'ai', title: 'AI 资讯', description: '筛选模型、Agent 和工具链动态', plugin: 'ai', prompt: '请整理 AI 工具、模型和 Agent 方向的新动态，并筛选适合商户业务使用的内容。' },
    { key: 'product', title: '产品关键词', description: '围绕产品词发现需求和内容机会', plugin: 'product', prompt: '请围绕本商户产品关键词收集近期市场变化、用户需求和内容机会。' },
    { key: 'notify-tg', title: '渠道通知', description: '把自动化结果整理为通知摘要', plugin: 'notify-tg', prompt: '请把本次自动化结果整理成适合发送到通知渠道的摘要，保留关键结论和下一步动作。' },
    { key: 'file-organize', title: '文件梳理', description: '把上传文件整理为结构化 Markdown', plugin: 'file-organize', prompt: '请对选中文件做结构化梳理，输出摘要、关键事实、待确认问题和可执行清单。' },
    { key: 'install-doc', title: '安装文档生成', description: '从资料生成可复制的安装/使用说明', plugin: 'install-doc', prompt: '请把选中文件整理成安装与使用文档，包含环境要求、安装步骤、配置项、验证方式和常见问题。' },
    { key: 'corpus', title: '客服语料整理', description: '把资料转成客服可复用知识片段', plugin: 'corpus', prompt: '请把选中文件整理成客服语料，按问题、标准回答、适用场景、注意事项输出。' },
    { key: 'sop', title: '运营 SOP 生成', description: '从流程资料生成操作 SOP', plugin: 'sop', prompt: '请把选中文件整理成运营 SOP，包含目标、适用范围、角色分工、步骤、检查点和异常处理。' },
  ]

  const [activeTemplate, setActiveTemplate] = useState<AutomationTemplate>(templates[0])
  const [activePlugin, setActivePlugin] = useState<string | null>(activeTemplate.plugin)
  const [mode, setMode] = useState<string | null>(defaultModeForBusiness('automation', activePlugin || ''))
  const [model, setModel] = useState<string | null>(defaultModelForBusiness('automation', mode, activePlugin || '') || 'openai-reasoning-value')
  const [input, setInput] = useState(activeTemplate.prompt)
  const [loading, setLoading] = useState(false)
  const [modelAvailability, setModelAvailability] = useState<Record<string, AgentModelAvailability>>({})
  const [historyThreads, setHistoryThreads] = useState<AgentThread[]>([])

  const applyTemplate = (tpl: AutomationTemplate) => {
    setActiveTemplate(tpl)
    setActivePlugin(tpl.plugin)
    const m = defaultModeForBusiness('automation', tpl.plugin)
    setMode(m)
    setModel(defaultModelForBusiness('automation', m, tpl.plugin) || 'openai-reasoning-value')
    setInput(tpl.prompt)
  }

  const loadModelAvailability = async () => {
    try {
      const res = await AgentModelAvailabilityAPI.fetch()
      setModelAvailability(res)
    } catch {
      setModelAvailability({})
    }
  }

  const loadHistory = async () => {
    try {
      const r = await AgentThreadAPI.list({ domain: 'general' })
      const keys = new Set(AUTOMATION_AGENT_PLUGIN_KEYS)
      setHistoryThreads(r.items.filter(t => keys.has(t.plugin_key || '')).slice(0, 8))
    } catch {}
  }

  useEffect(() => {
    loadModelAvailability()
    loadHistory()
  }, [])

  const submit = () => {
    const text = input.trim()
    if (!text || loading) return
    setLoading(true)
    try {
      ws.startAgentDraft({
        category: 'automation',
        domain: 'general',
        content: text,
        plugin: activePlugin || '',
        mode: mode || '',
        model: model || '',
      })
      setInput('')
    } finally {
      setLoading(false)
    }
  }

  const openThread = (id: string) => {
    navigate(`/workbench/automation?thread=${id}`)
    ws.showAgentThread('automation', 'general', id)
  }

  const automationText = (text: string | null | undefined, fallback: string) => {
    return (text || fallback).replace(/小万助理/g, '自动化')
  }

  return (
    <section className="automation-page">
      <header className="automation-head">
        <div>
          <span className="automation-kicker">自动化</span>
          <h1>模板和任务</h1>
        </div>
        <Link to="/workbench/file-library" className="automation-refresh" style={{ display: 'inline-flex', alignItems: 'center' }}>
          打开文件库
        </Link>
      </header>

      <div className="automation-layout">
        <main className="automation-main">
          <section className="automation-block">
            <div className="automation-block-head">
              <strong>自动化模板</strong>
              <span>选择模板后会填入下方输入框，可继续自由修改。</span>
            </div>
            <div className="template-grid">
              {templates.map(tpl => (
                <button
                  key={tpl.key}
                  type="button"
                  className={`template-card ${activeTemplate.key === tpl.key ? 'is-active' : ''}`}
                  onClick={() => applyTemplate(tpl)}
                >
                  <Icon name="sparkles" size={15} />
                  <span>
                    <strong>{tpl.title}</strong>
                    <small>{tpl.description}</small>
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="automation-block">
            <div className="automation-plugin">
              <Icon name="sparkles" size={16} />
              <div>
                <strong>{activeTemplate.title}</strong>
                <span>{cfg.plugins.find(p => p.key === activePlugin)?.hint || activeTemplate.description}</span>
              </div>
            </div>

            <XiaooneComposer
              value={input}
              onChange={setInput}
              business="automation"
              plugin={activePlugin}
              mode={mode}
              model={model}
              businessOptions={['automation']}
              lockBusiness
              loading={loading}
              modelAvailability={modelAvailability}
              placeholder="描述要收集、整理或通知的目标。Shift+Enter 换行，Enter 提交"
              onPluginChange={v => setActivePlugin(v || activePlugin)}
              onModeChange={setMode}
              onModelChange={v => setModel(v || model)}
              onSubmit={submit}
            />
          </section>
        </main>

        <aside className="automation-history">
          <div className="automation-history-head">
            <strong>任务记录</strong>
            <button type="button" onClick={() => loadHistory().catch(() => toast({ title: '刷新失败' }))}>
              刷新
            </button>
          </div>
          {historyThreads.map(t => (
            <button
              key={t.id}
              type="button"
              className="automation-thread"
              onClick={() => openThread(t.id)}
            >
              <span>{automationText(t.title, '自动化任务')}</span>
              <small>{automationText(t.preview, '暂无内容')}</small>
            </button>
          ))}
          {!historyThreads.length && <div className="automation-empty">暂无自动化任务</div>}
        </aside>
      </div>
    </section>
  )
}
