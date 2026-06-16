import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { getChatKit, type AgentModelAvailability, type AgentThread } from '@xiaoone/chat-kit'
import { Icon } from '../components/Icon'
import { XiaooneComposer } from '../components/XiaooneComposer'
import {
  AUTOMATION_AGENT_PLUGIN_KEYS,
  BUSINESS_CONFIGS,
  defaultModeForBusiness,
  defaultModelForBusiness,
} from '../lib/composer'
import { toast } from '@xiaoone/react-ui'
import { createAutomationTask, runAutomationTaskManual } from '../lib/automationTaskApi'
import { usePreferences } from '../app/preferences'
import './automation-page.css'

interface AutomationTemplate {
  key: string
  title: string
  description: string
  plugin: string
  prompt: string
  platform: string
  cadence: string
  form?: 'hot-product'
  hotProductDefaults?: Partial<HotProductConfig>
}

interface HotProductConfig {
  market: 'cross_border' | 'domestic'
  platforms: string[]
  productCategory: string
  keywordsText: string
  excludeKeywordsText: string
  priceBand: string
  schedule: 'manual' | 'daily' | '8h' | 'weekly'
  notifyChannel: ''
  complianceMode: string
}

const HOT_PRODUCT_PLATFORM_OPTIONS = [
  { key: 'tiktok_creative_center', label: 'TikTok Creative Center' },
  { key: 'amazon_best_sellers', label: 'Amazon Best Sellers' },
  { key: 'amazon_movers_shakers', label: 'Amazon Movers & Shakers' },
  { key: 'google_trends', label: 'Google Trends' },
  { key: 'pinterest_trends', label: 'Pinterest Trends' },
  { key: 'ebay_product_research', label: 'eBay Product Research' },
  { key: 'douyin_compass', labelKey: 'automation.main.platform.douyinCompass' },
  { key: 'shengyi_canmou', labelKey: 'automation.main.platform.shengyi' },
  { key: 'jd_shangzhi', labelKey: 'automation.main.platform.jd' },
  { key: '1688_supply', labelKey: 'automation.main.platform.1688' },
  { key: 'alibaba_supply', labelKey: 'automation.main.platform.alibaba' },
  { key: 'aliexpress_supply', labelKey: 'automation.main.platform.aliexpress' },
] as const

const DEFAULT_HOT_PRODUCT_PLATFORMS = [
  'tiktok_creative_center',
  'amazon_best_sellers',
  'google_trends',
  'alibaba_supply',
]

function parseCommaText(value: string): string[] {
  return value
    .split(/[,\n，]/g)
    .map(x => x.trim())
    .filter(Boolean)
}

export function AutomationPage() {
  return <AutomationTaskLauncher />
}

function AutomationTaskLauncher() {
  const { t, tpl } = usePreferences()
  const { AgentModelAvailabilityAPI, AgentThreadAPI } = getChatKit()
  const navigate = useNavigate()

  const cfg = BUSINESS_CONFIGS.automation
  const templates: AutomationTemplate[] = useMemo(() => [
    {
      key: 'tiktok-hot-product',
      title: t('automation.main.tpl.tiktokHot.title'),
      description: t('automation.main.tpl.tiktokHot.desc'),
      platform: 'TikTok / Amazon',
      cadence: t('automation.main.tpl.tiktokHot.cadence'),
      plugin: 'hot-product',
      form: 'hot-product',
      prompt: '请基于 TikTok Creative Center、Amazon 榜单和 Google Trends，输出可测品、热度原因、供货可行性、风险标签和下一步动作。',
      hotProductDefaults: {
        market: 'cross_border',
        platforms: ['tiktok_creative_center', 'amazon_best_sellers', 'google_trends', 'alibaba_supply'],
        schedule: 'daily',
        notifyChannel: '',
      },
    },
    {
      key: 'amazon-price-monitor',
      title: t('automation.main.tpl.amazonPrice.title'),
      description: t('automation.main.tpl.amazonPrice.desc'),
      platform: 'Amazon / eBay',
      cadence: t('automation.main.tpl.amazonPrice.cadence'),
      plugin: 'competitor',
      prompt: '请监控 Amazon 与 eBay 上同类商品的榜单、价格、评论、促销和素材变化，输出异常变化、机会点和建议动作。',
    },
    {
      key: 'shopify-growth-check',
      title: t('automation.main.tpl.shopify.title'),
      description: t('automation.main.tpl.shopify.desc'),
      platform: 'Shopify',
      cadence: t('automation.main.tpl.shopify.cadence'),
      plugin: 'product',
      prompt: '请按独立站运营常用流程巡检商品页、弃单、评价、邮件触达和复购机会，输出优先级、证据和可执行改进清单。',
    },
    {
      key: 'google-keyword-watch',
      title: t('automation.main.tpl.googleKw.title'),
      description: t('automation.main.tpl.googleKw.desc'),
      platform: 'Google',
      cadence: t('automation.main.tpl.googleKw.cadence'),
      plugin: 'product',
      prompt: '请围绕我的产品类目追踪 Google Trends、搜索关键词和广告词变化，输出新增关键词、下降词、落地页建议和风险词。',
    },
    {
      key: 'meta-creative-watch',
      title: t('automation.main.tpl.metaCreative.title'),
      description: t('automation.main.tpl.metaCreative.desc'),
      platform: 'Meta / Instagram',
      cadence: t('automation.main.tpl.metaCreative.cadence'),
      plugin: 'competitor',
      prompt: '请整理 Meta 与 Instagram 上同类商家的广告素材、内容互动和受众变化，输出可测试卖点、素材方向和不建议跟进的风险项。',
    },
    {
      key: 'xhs-topic-watch',
      title: t('automation.main.tpl.xhsTopic.title'),
      description: t('automation.main.tpl.xhsTopic.desc'),
      platform: '小红书',
      cadence: t('automation.main.tpl.xhsTopic.cadence'),
      plugin: 'industry',
      prompt: '请围绕我的产品类目收集小红书热门笔记、用户问题、达人内容方向和可复用选题，输出选题池、证据链接和执行建议。',
    },
    {
      key: 'douyin-commerce-watch',
      title: t('automation.main.tpl.douyinLive.title'),
      description: t('automation.main.tpl.douyinLive.desc'),
      platform: '抖音 / 1688',
      cadence: t('automation.main.tpl.douyinLive.cadence'),
      plugin: 'hot-product',
      form: 'hot-product',
      prompt: '请基于抖音电商罗盘、1688 供货线索和国内趋势，输出直播/短视频可测品、卖点、供货可行性和风险标签。',
      hotProductDefaults: {
        market: 'domestic',
        platforms: ['douyin_compass', '1688_supply', 'shengyi_canmou', 'jd_shangzhi'],
        schedule: 'daily',
        notifyChannel: '',
      },
    },
  ], [t])

  const marketLabel = (value: HotProductConfig['market']) => (
    value === 'domestic' ? t('automation.main.market.domestic') : t('automation.main.market.crossBorder')
  )

  const [activeTemplateKey, setActiveTemplateKey] = useState('tiktok-hot-product')
  const activeTemplate = templates.find(item => item.key === activeTemplateKey) || templates[0]
  const [activePlugin, setActivePlugin] = useState<string | null>(activeTemplate?.plugin || 'hot-product')
  const [mode, setMode] = useState<string | null>(defaultModeForBusiness('automation', activeTemplate?.plugin || ''))
  const [model, setModel] = useState<string | null>(defaultModelForBusiness('automation', mode, activeTemplate?.plugin || '') || 'volcengine-reasoning-auto')
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [modelAvailability, setModelAvailability] = useState<Record<string, AgentModelAvailability>>({})
  const [historyThreads, setHistoryThreads] = useState<AgentThread[]>([])
  const [hotAdvancedOpen, setHotAdvancedOpen] = useState(false)
  const [hotConfig, setHotConfig] = useState<HotProductConfig>({
    market: 'cross_border',
    platforms: [...DEFAULT_HOT_PRODUCT_PLATFORMS],
    productCategory: '',
    keywordsText: '',
    excludeKeywordsText: '',
    priceBand: '',
    schedule: 'daily',
    notifyChannel: '',
    complianceMode: 'strict_whitelist',
  })

  const applyTemplate = (tpl: AutomationTemplate) => {
    setActiveTemplateKey(tpl.key)
    setActivePlugin(tpl.plugin)
    const m = defaultModeForBusiness('automation', tpl.plugin)
    setMode(m)
    setModel(defaultModelForBusiness('automation', m, tpl.plugin) || 'volcengine-reasoning-auto')
    setInput(tpl.form === 'hot-product' ? '' : tpl.prompt)
    if (tpl.form === 'hot-product' && tpl.hotProductDefaults) {
      setHotConfig(prev => ({
        ...prev,
        ...tpl.hotProductDefaults,
        platforms: tpl.hotProductDefaults?.platforms ? [...tpl.hotProductDefaults.platforms] : prev.platforms,
      }))
    }
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

  const submit = async () => {
    const isHotProduct = activeTemplate.form === 'hot-product'
    const text = input.trim()
    if (loading) return
    if (!isHotProduct && !text) return
    setLoading(true)
    if (isHotProduct) {
      const keywords = parseCommaText(hotConfig.keywordsText)
      const category = hotConfig.productCategory.trim()
      if (!category && keywords.length === 0) {
        toast({ title: t('automation.main.toast.needProduct'), description: t('automation.main.toast.needProductDesc') })
        setLoading(false)
        return
      }
      if (hotConfig.platforms.length === 0) {
        toast({ title: t('automation.main.toast.needPlatform'), description: t('automation.main.toast.needPlatformDesc') })
        setLoading(false)
        return
      }
      const promptContext = [
        `推荐平台：${activeTemplate.platform}`,
        `推荐自动化：${activeTemplate.title}`,
        `任务要求：${activeTemplate.prompt}`,
        `目标市场：${marketLabel(hotConfig.market)}`,
        category ? `商品/类目：${category}` : '',
        keywords.length ? `关键词：${keywords.join('、')}` : '',
        hotConfig.priceBand.trim() ? `价格带：${hotConfig.priceBand.trim()}` : '',
        text ? `补充要求：${text}` : '',
        '只返回有来源链接的候选，不采集全文、不绕登录、不绕反爬。',
      ].filter(Boolean).join('\n')
      const payload = {
        name: activeTemplate.title,
        market: hotConfig.market,
        platforms: hotConfig.platforms,
        product_category: hotConfig.productCategory.trim(),
        keywords,
        exclude_keywords: parseCommaText(hotConfig.excludeKeywordsText),
        price_band: hotConfig.priceBand.trim(),
        schedule_key: hotConfig.schedule,
        notify_channel: hotConfig.notifyChannel,
        compliance_mode: hotConfig.complianceMode,
        source_whitelist: hotConfig.platforms,
        prompt_context: promptContext,
      } as const
      void createAutomationTask(payload)
        .then(task => runAutomationTaskManual(task.id))
        .then((res) => {
          toast({ title: t('automation.main.toast.created'), description: tpl('automation.main.toast.runStatus', res.run.status) })
          setInput('')
          openThread(res.thread_id)
        })
        .catch((err) => {
          toast({ title: t('automation.main.toast.createFailed'), description: err?.message || t('automation.main.toast.createFailedDesc') })
        })
        .finally(() => {
          setLoading(false)
        })
      return
    }
    try {
      const { streamThreadChat } = getChatKit()
      const created = await AgentThreadAPI.create({
        domain: 'general',
        title: activeTemplate.title,
        plugin_key: activePlugin || '',
        mode_key: mode || '',
        model_key: model || '',
      })
      for await (const _event of streamThreadChat(created.id, text, [], model || '')) {
        // Persisted by the agent service; the thread page reloads the final messages.
      }
      setInput('')
      openThread(created.id)
    } catch (err: any) {
      toast({ title: t('automation.main.toast.sendFailed'), description: err?.message || t('automation.main.toast.sendFailedDesc') })
    } finally {
      setLoading(false)
    }
  }

  const openThread = (id: string) => {
    navigate(`/workbench/automation/threads/${encodeURIComponent(id)}`)
  }

  const automationText = (text: string | null | undefined, fallbackKey: string) => {
    return (text || t(fallbackKey)).replace(/xiaoone/g, t('automation.skills.employee.automation'))
  }

  return (
    <section className="automation-page">
      <div className="automation-layout">
        <main className="automation-main">
          <section className="automation-block">
            <div className="automation-block-head">
              <strong>{t('automation.main.socialTitle')}</strong>
              <span>{t('automation.main.socialDesc')}</span>
            </div>
            <button type="button" className="template-card" onClick={() => navigate('/workbench/automation/social')}>
              <Icon name="sparkles" size={15} />
              <span>
                <em><b>多平台</b><i>素材包</i></em>
                <strong>{t('automation.main.socialCardTitle')}</strong>
                <small>{t('automation.main.socialCardDesc')}</small>
              </span>
            </button>
          </section>

          <section className="automation-block">
            <div className="automation-block-head">
              <strong>{t('automation.main.recommendTitle')}</strong>
              <span>{t('automation.main.recommendDesc')}</span>
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
                    <em>
                      <b>{tpl.platform}</b>
                      <i>{tpl.cadence}</i>
                    </em>
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

            {activeTemplate.form === 'hot-product' && (
              <div className="hot-product-simple">
                <div className="hot-product-field">
                  <span>{t('automation.main.whatSell')}</span>
                  <input
                    type="text"
                    value={hotConfig.productCategory}
                    onChange={e => setHotConfig(prev => ({ ...prev, productCategory: e.target.value }))}
                    placeholder={t('automation.main.categoryPlaceholder')}
                  />
                </div>

                <div className="hot-product-field">
                  <span>{t('automation.main.targetMarket')}</span>
                  <div className="hot-product-segments" role="group" aria-label={t('automation.main.targetMarket')}>
                    <button
                      type="button"
                      className={hotConfig.market === 'cross_border' ? 'is-active' : ''}
                      onClick={() => setHotConfig(prev => ({ ...prev, market: 'cross_border', platforms: [...DEFAULT_HOT_PRODUCT_PLATFORMS] }))}
                    >
                      {t('automation.main.crossBorder')}
                    </button>
                    <button
                      type="button"
                      className={hotConfig.market === 'domestic' ? 'is-active' : ''}
                      onClick={() => setHotConfig(prev => ({
                        ...prev,
                        market: 'domestic',
                        platforms: ['douyin_compass', 'shengyi_canmou', 'jd_shangzhi', '1688_supply'],
                      }))}
                    >
                      {t('automation.main.domestic')}
                    </button>
                  </div>
                </div>

                <div className="hot-product-field hot-product-wide">
                  <span>{t('automation.main.keywordsOptional')}</span>
                  <input
                    type="text"
                    value={hotConfig.keywordsText}
                    onChange={e => setHotConfig(prev => ({ ...prev, keywordsText: e.target.value }))}
                    placeholder="例如：portable blender, mini fan, dorm storage"
                  />
                </div>

                <div className="hot-product-field hot-product-wide">
                  <span>{t('automation.main.extraOptional')}</span>
                  <textarea
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder={t('automation.main.extraPlaceholder')}
                    rows={3}
                  />
                </div>

                <div className="hot-product-actions">
                  <button type="button" className="hot-product-primary" onClick={submit} disabled={loading}>
                    {loading ? t('automation.main.creating') : t('automation.main.startDiscovery')}
                  </button>
                  <button type="button" className="hot-product-secondary" onClick={() => setHotAdvancedOpen(v => !v)}>
                    {hotAdvancedOpen ? t('automation.main.collapseAdvanced') : t('automation.main.advanced')}
                  </button>
                </div>

                {hotAdvancedOpen && (
                  <div className="automation-config-grid hot-product-advanced">
                    <label>
                      <span>{t('automation.main.schedule')}</span>
                      <select
                        value={hotConfig.schedule}
                        onChange={e => setHotConfig(prev => ({ ...prev, schedule: e.target.value as HotProductConfig['schedule'] }))}
                      >
                        <option value="manual">{t('automation.main.scheduleManual')}</option>
                        <option value="daily">{t('automation.main.scheduleDaily')}</option>
                        <option value="8h">{t('automation.main.schedule8h')}</option>
                        <option value="weekly">{t('automation.main.scheduleWeekly')}</option>
                      </select>
                    </label>
                    <label>
                      <span>{t('automation.main.priceBand')}</span>
                      <input
                        type="text"
                        value={hotConfig.priceBand}
                        onChange={e => setHotConfig(prev => ({ ...prev, priceBand: e.target.value }))}
                        placeholder={t('automation.main.priceBandPlaceholder')}
                      />
                    </label>
                    <label>
                      <span>{t('automation.main.excludeWords')}</span>
                      <input
                        type="text"
                        value={hotConfig.excludeKeywordsText}
                        onChange={e => setHotConfig(prev => ({ ...prev, excludeKeywordsText: e.target.value }))}
                        placeholder="如：adult, medical, counterfeit"
                      />
                    </label>
                    <div className="automation-config-wide">
                      <span className="automation-platform-title">{t('automation.main.platformWhitelist')}</span>
                      <div className="automation-platform-grid">
                        {HOT_PRODUCT_PLATFORM_OPTIONS.map(opt => {
                          const checked = hotConfig.platforms.includes(opt.key)
                          const label = 'labelKey' in opt ? t(opt.labelKey) : opt.label
                          return (
                            <label key={opt.key} className="automation-check-item">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  setHotConfig(prev => {
                                    const next = e.target.checked
                                      ? [...new Set([...prev.platforms, opt.key])]
                                      : prev.platforms.filter(x => x !== opt.key)
                                    return { ...prev, platforms: next }
                                  })
                                }}
                              />
                              <span>{label}</span>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {!activeTemplate.form && (
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
                placeholder={t('automation.main.composerPlaceholder')}
                onPluginChange={v => setActivePlugin(v || activePlugin)}
                onModeChange={setMode}
                onModelChange={v => setModel(v || model)}
                onSubmit={submit}
              />
            )}
          </section>
        </main>

        <aside className="automation-history">
          <div className="automation-history-head">
            <strong>{t('automation.main.history')}</strong>
            <button type="button" onClick={() => loadHistory().catch(() => toast({ title: t('automation.main.toast.refreshFailed') }))}>
              {t('automation.main.refresh')}
            </button>
          </div>
          {historyThreads.map(thread => (
            <button
              key={thread.id}
              type="button"
              className="automation-thread"
              onClick={() => openThread(thread.id)}
            >
              <span>{automationText(thread.title, 'automation.main.taskDefault')}</span>
              <small>{automationText(thread.preview, 'automation.main.noPreview')}</small>
            </button>
          ))}
          {!historyThreads.length && <div className="automation-empty">{t('automation.main.empty')}</div>}
        </aside>
      </div>
    </section>
  )
}
