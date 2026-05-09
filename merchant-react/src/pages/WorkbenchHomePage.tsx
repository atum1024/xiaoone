import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { Icon } from '../components/Icon'
import { HeroParticles } from '../components/HeroParticles'
import { XiaooneComposer } from '../components/XiaooneComposer'
import { getChatKit, type AgentDomain, type AgentModelAvailability } from '@xiaoone/chat-kit'
import { toast } from '@xiaoone/react-ui'
import { ApiError } from '../lib/apiErrors'
import { usePreferences } from '../app/preferences'
import { useAuthStore } from '../store/auth'
import {
  BUSINESS_CONFIGS,
  BUSINESS_LIST,
  defaultModeForBusiness,
  defaultModelForBusiness,
  defaultPluginForBusiness,
  type BusinessKey,
} from '../lib/composer'

type SuggestedPrompts = {
  domain: string
  persona: { title: string; greeting: string; tone: string }
  prompts: string[]
}

const BUSINESS_FROM_ROUTE: Record<string, BusinessKey> = {
  consultant: 'consultant',
  system: 'software',
  software: 'software',
  marketing: 'marketing',
  support: 'support',
  agency: 'agency',
  automation: 'automation',
  feedback: 'feedback',
}

function suggestedDomain(key: BusinessKey) {
  if (key === 'software' || key === 'automation' || key === 'consultant')
    return 'general'
  return BUSINESS_CONFIGS[key].agentDomain || 'general'
}

export function WorkbenchHomePage() {
  const navigate = useNavigate()
  const { locale, t, tpl } = usePreferences()
  const consultantAllowlist = useAuthStore((s) => {
    const m = s.merchants.find(x => x.id === s.currentMerchantId) ?? s.merchants[0]
    const keys = m?.consultant_allowed_model_keys
    return keys?.length ? keys : null
  })
  const [searchParams] = useSearchParams()
  const businessParam = searchParams.get('business')
  /** Hero 默认顾问，与首格业务一致；避免「界面显示顾问但 state 为空」导致模型/插件被 hide* 全部关掉 */
  const [business, setBusiness] = useState<BusinessKey>('consultant')
  const [plugin, setPlugin] = useState<string | null>(null)
  const [mode, setMode] = useState<string | null>(null)
  const [model, setModel] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [persona, setPersona] = useState<SuggestedPrompts | null>(null)
  const [personaError, setPersonaError] = useState('')
  const [modelAvailability, setModelAvailability] = useState<Record<string, AgentModelAvailability>>({})

  const cfg = useMemo(() => BUSINESS_CONFIGS[business], [business])
  const placeholder = tpl('hero.placeholder.business', t(`biz.${business === 'software' ? 'system' : business}`, cfg.label))

  function businessLabel(key: BusinessKey) {
    const id = key === 'software' ? 'system' : key
    return t(`biz.${id}`, BUSINESS_CONFIGS[key].label)
  }

  function businessDescription(key: BusinessKey) {
    const id = key === 'software' ? 'system' : key
    return t(`biz.${id}.desc`, BUSINESS_CONFIGS[key].description)
  }

  useEffect(() => {
    if (!businessParam)
      return
    const routeBusiness = BUSINESS_FROM_ROUTE[businessParam]
    if (routeBusiness)
      setBusiness(routeBusiness)
  }, [businessParam])

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('merchant-react:hero-business', {
      detail: cfg ? { label: businessLabel(cfg.key), key: cfg.key } : null,
    }))
    return () => {
      window.dispatchEvent(new CustomEvent('merchant-react:hero-business', { detail: null }))
    }
  }, [cfg, locale])

  useEffect(() => {
    let cancelled = false
    void getChatKit().AgentModelAvailabilityAPI.fetch().then((rows) => {
      if (!cancelled)
        setModelAvailability(rows)
    }).catch(() => {
      if (!cancelled)
        setModelAvailability({})
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!cfg) {
      setPlugin(null)
      setMode(null)
      setModel(null)
      setPersona(null)
      return
    }
    setPlugin(defaultPluginForBusiness(cfg.key))
    setMode(defaultModeForBusiness(cfg.key, defaultPluginForBusiness(cfg.key)))
    setModel(defaultModelForBusiness(cfg.key, defaultModeForBusiness(cfg.key), defaultPluginForBusiness(cfg.key)))
    let cancelled = false
    setPersonaError('')
    void getChatKit().AgentSuggestedPromptsAPI.fetch(suggestedDomain(cfg.key) as any).then((data) => {
      if (!cancelled) setPersona(data)
    }).catch((err) => {
      if (!cancelled) {
        setPersona(null)
        setPersonaError(err instanceof ApiError ? err.message : t('workbench.loadPromptsError'))
      }
    })
    return () => {
      cancelled = true
    }
  }, [cfg])

  function pickBusiness(next: BusinessKey) {
    setBusiness(next)
    let route = ''
    switch (next) {
      case 'consultant': route = '/workbench/consultant'; break
      case 'software': route = '/workbench/system'; break
      case 'marketing': route = '/workbench/marketing'; break
      case 'support': route = '/workbench/support'; break
      case 'agency': route = '/workbench/agency'; break
      case 'automation': route = '/workbench/automation'; break
      case 'feedback': route = '/workbench/feedback'; break
    }
    if (route)
      navigate(route)
  }

  async function onSubmit() {
    const text = input.trim()
    if (!text || loading)
      return
    setLoading(true)
    try {
      const { AgentThreadAPI, streamThreadChat } = getChatKit()
      const thread = await AgentThreadAPI.create({
        domain: ((cfg as any).agentDomain || 'general') as AgentDomain,
        title: text.slice(0, 28) || t('workbench.newThread'),
        plugin_key: plugin || '',
        mode_key: mode || '',
        model_key: model || '',
      })
      for await (const event of streamThreadChat(thread.id, text, [], model || '')) {
        void event
        // The dedicated thread page reloads persisted messages after navigation.
      }
      setInput('')
      let route = ''
      switch (business) {
        case 'consultant': route = '/workbench/consultant'; break
        case 'software': route = '/workbench/system'; break
        case 'marketing': route = '/workbench/marketing'; break
        case 'support': route = '/workbench/support'; break
        case 'agency': route = '/workbench/agency'; break
        case 'automation': route = '/workbench/automation'; break
        case 'feedback': route = '/workbench/feedback'; break
      }
      navigate(`${route}?thread=${thread.id}`)
    }
    catch (err) {
      toast.error(err instanceof ApiError ? err.message : t('workbench.sendError'))
    }
    finally {
      setLoading(false)
    }
  }

  function onAttachFile(file: File) {
    toast.info(`已选择「${file.name}」；Hero 对话附件将在接口就绪后接入。`)
  }

  return (
    <section className="mr-hero relative flex flex-col h-full min-h-0 bg-[var(--xiaoone-bg)] overflow-hidden">
      <div className="absolute inset-0 z-0 pointer-events-none opacity-90">
        <HeroParticles active={true} />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-[clamp(42px,8vh,82px)_clamp(20px,4vw,48px)] gap-4 w-full max-w-[min(1120px,100%)] mx-auto relative z-10">
        <p className="m-0 text-[11px] font-semibold tracking-[0.14em] text-[var(--xiaoone-fg-mute)] text-center uppercase">
          XIAOONE
        </p>
        <h1 className="m-0 mb-5 text-[40px] leading-[1.16] font-[650] text-[var(--xiaoone-fg)] text-center max-w-[min(980px,100%)] whitespace-normal">
          {locale === 'zh' ? '我们该在 xiaoone 中做什么？' : 'What should we do in xiaoone?'}
        </h1>
        <p className="m-0 mb-2.5 text-center max-w-[52ch] text-[var(--xiaoone-fg-mute)] text-[14px] leading-[1.55]">{persona?.persona?.greeting || businessDescription(cfg.key)}</p>

        <div className="w-full max-w-[980px] self-center">
          <XiaooneComposer
            value={input}
            onChange={setInput}
            business={business}
            onBusinessChange={pickBusiness}
            lockMode={
              business === 'consultant'
              || business === 'feedback'
              || business === 'support'
              || business === 'agency'
            }
            plugin={plugin}
            onPluginChange={setPlugin}
            mode={mode}
            onModeChange={setMode}
            model={model}
            onModelChange={setModel}
            loading={loading}
            placeholder={placeholder}
            hidePlugin={false}
            hideMode={false}
            hideModel={false}
            requirePlugin
            requireMode
            enableFileAttach={true}
            modelAvailability={modelAvailability}
            consultantModelAllowlist={consultantAllowlist}
            onSubmit={onSubmit}
            onAttachFile={onAttachFile}
          />
        </div>

        {personaError && <span className="text-sm text-red-500 mt-2">{personaError}</span>}

        {(persona?.prompts?.length || 0) > 0 && (
          <div className="flex flex-col w-full max-w-[640px] mt-2.5 gap-2">
            {(persona?.prompts || []).slice(0, 3).map((prompt, i) => (
              <button
                key={prompt}
                type="button"
                className="flex items-start gap-3 p-3 rounded-lg border border-[var(--xiaoone-border-soft)] bg-[var(--xiaoone-bg-elev)] text-left font-medium text-[13px] text-[var(--xiaoone-fg-soft)] cursor-pointer shadow-sm transition-all hover:border-[var(--xiaoone-accent-soft)] hover:text-[var(--xiaoone-fg)] hover:shadow-md hover:-translate-y-[1px]"
                onClick={() => {
                  setInput(prompt)
                  setTimeout(() => document.querySelector<HTMLTextAreaElement>('.cx-textarea')?.focus(), 50)
                }}
              >
                <Icon name={i === 2 ? 'grid' : 'chat'} size={13} className="text-[var(--xiaoone-accent)] mt-[2px] flex-shrink-0" />
                <span>{prompt}</span>
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-[980px] self-center mt-5" aria-label={t('hero.pickBusiness')}>
          {BUSINESS_LIST.map((key) => {
            const item = BUSINESS_CONFIGS[key]
            const isActive = business === item.key
            return (
              <button
                key={item.key}
                type="button"
                className={`flex items-start gap-3 min-h-[148px] p-5 rounded-xl border border-[var(--xiaoone-border-soft)] bg-[var(--xiaoone-bg-elev)] text-left cursor-pointer shadow-sm transition-all ${isActive ? 'border-[var(--xiaoone-accent-soft)] bg-[var(--xiaoone-accent-bg)] text-[var(--xiaoone-fg)]' : 'text-[var(--xiaoone-fg-soft)] hover:border-[var(--xiaoone-accent-soft)] hover:bg-[var(--xiaoone-accent-bg)] hover:text-[var(--xiaoone-fg)]'}`}
                onClick={() => pickBusiness(item.key)}
              >
                <Icon name={item.icon as any} size={16} className={`mt-0.5 flex-shrink-0 ${isActive ? 'text-[var(--xiaoone-accent)]' : 'text-[var(--xiaoone-accent)]'}`} />
                <span className="flex flex-col gap-[3px] min-w-0">
                  <strong className="text-[12.5px] font-[650] text-[var(--xiaoone-fg)]">{businessLabel(item.key)}</strong>
                  <span className="text-[11px] leading-[1.35] text-[var(--xiaoone-fg-mute)] line-clamp-2 overflow-hidden">{businessDescription(item.key)}</span>
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
