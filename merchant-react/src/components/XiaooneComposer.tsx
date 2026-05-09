import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import './XiaooneComposer.css'
import { Popover, PopoverContent, PopoverTrigger, toast } from '@xiaoone/react-ui'
import { Icon } from './Icon'
import { usePreferences } from '../app/preferences'
import {
  BUSINESS_CONFIGS,
  BUSINESS_LIST,
  MODELS,
  pluginNeedsModel,
  resolveModeTitle,
  resolveModes,
  SELF_SERVICE_MODE_MESSAGE,
  type BusinessKey,
  type ModelOption,
  type PluginItem,
  type ModeItem,
} from '../lib/composer'
import type { AgentModelAvailability } from '@xiaoone/chat-kit'

interface Props {
  value: string
  onChange: (val: string) => void
  business: BusinessKey
  onBusinessChange?: (val: BusinessKey) => void
  plugin?: string | null
  onPluginChange?: (val: string | null) => void
  mode?: string | null
  onModeChange?: (val: string | null) => void
  model?: string | null
  onModelChange?: (val: string | null) => void
  loading?: boolean
  placeholder?: string
  disabled?: boolean
  lockBusiness?: boolean
  /** 模式仅展示、不可切换（如渠道专员 / 商务经理 / 维修工固定 xiaoone） */
  lockMode?: boolean
  lockSelections?: boolean
  hideBusinessPicker?: boolean
  hidePlugin?: boolean
  hideModel?: boolean
  hideMode?: boolean
  pluginTitle?: string
  businessOptions?: BusinessKey[]
  compact?: boolean
  requirePlugin?: boolean
  requireMode?: boolean
  disabledReason?: string
  enableFileAttach?: boolean
  hasAttachment?: boolean
  modelAvailability?: Record<string, AgentModelAvailability>
  /** 运营端为顾问业务配置的可选模型 key；有值时用户端仅展示列表内模型 */
  consultantModelAllowlist?: string[] | null
  onSubmit?: () => void
  onAttachFile?: (file: File) => void
  aboveSlot?: ReactNode
  chipsExtraSlot?: ReactNode
  leftExtraSlot?: ReactNode
  rightExtraSlot?: ReactNode
  pluginExtraSlot?: ReactNode
}

export function XiaooneComposer({
  value,
  onChange,
  business,
  onBusinessChange,
  plugin = null,
  onPluginChange,
  mode = null,
  onModeChange,
  model = 'gpt-5.4',
  onModelChange,
  loading = false,
  placeholder = '问 Xiaoone 任何事…',
  disabled = false,
  lockBusiness = false,
  lockMode = false,
  lockSelections = false,
  hideBusinessPicker = false,
  hidePlugin = false,
  hideModel = false,
  hideMode = false,
  pluginTitle,
  businessOptions,
  compact = false,
  requirePlugin = true,
  requireMode,
  disabledReason = '',
  enableFileAttach = false,
  hasAttachment = false,
  modelAvailability = {},
  consultantModelAllowlist = null,
  onSubmit,
  onAttachFile,
  aboveSlot,
  chipsExtraSlot,
  leftExtraSlot,
  rightExtraSlot,
  pluginExtraSlot,
}: Props) {
  const { t } = usePreferences()
  const taRef = useRef<HTMLTextAreaElement>(null)
  const fileAttachInputRef = useRef<HTMLInputElement>(null)

  const [pluginPopOpen, setPluginPopOpen] = useState(false)
  const [modePopOpen, setModePopOpen] = useState(false)
  const [businessPopOpen, setBusinessPopOpen] = useState(false)
  const [modelPopOpen, setModelPopOpen] = useState(false)

  const showChipsRow = !compact && (Boolean(chipsExtraSlot) || (!hideBusinessPicker && !lockBusiness))
  const cfg = BUSINESS_CONFIGS[business] ?? BUSINESS_CONFIGS.software
  const effectiveNeedsModel = pluginNeedsModel(cfg, plugin)
  const resolvedModes = resolveModes(cfg, plugin)
  const resolvedModeTitle = resolveModeTitle(cfg, plugin)
  const businessOpts = businessOptions?.length ? businessOptions : BUSINESS_LIST

  const selectedPlugin = useMemo(() => {
    if (!plugin) return null
    return cfg.plugins.find((p) => p.key === plugin) || null
  }, [cfg, plugin])

  const selectedMode = useMemo(() => {
    if (!mode) return null
    return resolvedModes.find((m) => m.key === mode) || null
  }, [resolvedModes, mode])

  useEffect(() => {
    const keys = new Set(resolvedModes.map((m) => m.key))
    if (mode && !keys.has(mode)) {
      onModeChange?.(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business, plugin, resolvedModes])

  const requiredModelCapability = useMemo<ModelOption['capability'] | null>(() => {
    if (business === 'consultant') return 'reasoning'
    if (mode === 'image') return 'image'
    if (mode === 'video') return 'video'
    if (mode === 'text') return 'reasoning'
    if (business === 'software' && plugin === 'self') return 'reasoning'
    return null
  }, [mode, business, plugin])

  const modelOptions = useMemo(() => {
    let base: ModelOption[]
    if (!requiredModelCapability) {
      base = MODELS
    }
    else {
      const filtered = MODELS.filter((m) => m.capability === requiredModelCapability)
      base = filtered.length ? filtered : MODELS
    }
    if (business === 'consultant' && consultantModelAllowlist?.length) {
      const allow = new Set(consultantModelAllowlist)
      const narrowed = base.filter(m => allow.has(m.key))
      if (narrowed.length)
        base = narrowed
    }
    return base
  }, [requiredModelCapability, business, consultantModelAllowlist])

  const selectedModel = useMemo(() => {
    return modelOptions.find((m) => m.key === model) || MODELS.find((m) => m.key === model) || modelOptions[0] || MODELS[0]
  }, [modelOptions, model])

  const selectedModelAvailability = selectedModel ? modelAvailability[selectedModel.key] : null

  useEffect(() => {
    if (!effectiveNeedsModel || !modelOptions.length)
      return
    const current = MODELS.find((m) => m.key === model)
    if (requiredModelCapability) {
      if (!current || current.capability !== requiredModelCapability)
        onModelChange?.(modelOptions[0]?.key || null)
      return
    }
    if (model && !modelOptions.some(m => m.key === model))
      onModelChange?.(modelOptions[0]?.key || null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, model, requiredModelCapability, modelOptions, effectiveNeedsModel, business, consultantModelAllowlist])

  const autoresize = () => {
    if (!taRef.current) return
    taRef.current.style.height = 'auto'
    const cap = compact ? 220 : Number.POSITIVE_INFINITY
    taRef.current.style.height = `${Math.min(taRef.current.scrollHeight, cap)}px`
  }

  useEffect(() => {
    autoresize()
  }, [value, compact])

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      fireSubmit()
    }
  }

  const pickBusiness = (b: BusinessKey) => {
    if (lockBusiness || b === business) return
    onBusinessChange?.(b)
    onPluginChange?.(null)
    onModeChange?.(null)
  }

  const pickPlugin = (p: PluginItem) => {
    if (lockSelections) return
    onPluginChange?.(p.key)
    setPluginPopOpen(false)
  }

  const pickMode = (m: ModeItem) => {
    if (lockSelections || lockMode) return
    onModeChange?.(m.key)
    if (m.warning) toast.warning(m.warning)
    else if (m.key === 'xiaowan') toast.info(SELF_SERVICE_MODE_MESSAGE)
    setModePopOpen(false)
  }

  const pickModel = (m: ModelOption) => {
    const availability = modelAvailability[m.key]
    if (availability && !availability.available) {
      toast.warning(availability.reason || '该模型当前不可用')
      return
    }
    onModelChange?.(m.key)
    setModelPopOpen(false)
  }

  const mustHaveMode = typeof requireMode === 'boolean' ? requireMode : !hideMode
  const hasSendContent = value.trim().length > 0 || hasAttachment

  const fireSubmit = () => {
    if (loading) return
    if (!hidePlugin && requirePlugin && !plugin) {
      toast.warning(`请先选择「${cfg.pluginTitle}」`)
      setPluginPopOpen(true)
      return
    }
    if (mustHaveMode && !mode) {
      toast.warning(`请先选择「${resolvedModeTitle}」`)
      setModePopOpen(true)
      return
    }
    if (!hasSendContent) {
      toast.warning('请输入内容')
      return
    }
    if (disabled) {
      if (disabledReason) toast.warning(disabledReason)
      return
    }
    if (effectiveNeedsModel && selectedModelAvailability && !selectedModelAvailability.available) {
      toast.warning(selectedModelAvailability.reason || '当前模型不可用')
      return
    }
    onSubmit?.()
  }

  const sendActive = (() => {
    if (!hasSendContent || disabled || loading) return false
    if (effectiveNeedsModel && selectedModelAvailability && !selectedModelAvailability.available) return false
    if (!hidePlugin && requirePlugin && !plugin) return false
    if (mustHaveMode && !mode) return false
    return true
  })()

  const finalDisabledReason = (() => {
    if (loading) return '正在发送…'
    if (effectiveNeedsModel && selectedModelAvailability && !selectedModelAvailability.available)
      return selectedModelAvailability.reason || '当前模型不可用'
    if (!hidePlugin && requirePlugin && !plugin) return `请先选择「${cfg.pluginTitle}」`
    if (mustHaveMode && !mode) return `请先选择「${resolvedModeTitle}」`
    if (!hasSendContent) return '请输入内容'
    if (disabled) return disabledReason || null
    return null
  })()

  return (
    <>
      <div className={`jcx-root ${compact ? 'is-compact' : ''}`}>
        <div className={`cx-composer ${loading ? 'is-loading' : ''} ${disabled ? 'is-disabled' : ''} ${compact ? 'is-compact' : ''}`}>
          {aboveSlot}

          <textarea
            ref={taRef}
            className="cx-textarea"
            rows={1}
            spellCheck="false"
            value={value}
            placeholder={placeholder}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKey}
          />

          <div className="cx-toolbar">
            <div className="cx-tool-left">
              {!hidePlugin && (
                <Popover open={pluginPopOpen} onOpenChange={setPluginPopOpen}>
                  <PopoverTrigger asChild>
                    <button
                      className={`cx-plug ${!selectedPlugin ? 'is-empty' : 'is-set'}`}
                      type="button"
                      disabled={lockSelections || disabled}
                      title={
                        selectedPlugin
                          ? lockSelections
                            ? `${cfg.pluginTitle}：${selectedPlugin.label}`
                            : `${cfg.pluginTitle}：${selectedPlugin.label}（点击切换）`
                          : cfg.pluginTitle
                      }
                    >
                      <Icon name="plus" size={13} className="cx-plug-plus" />
                      {selectedPlugin && (
                        <>
                          <span className="cx-plug-sep" />
                          <Icon name="grid" size={11} />
                          <span className="cx-plug-name">{selectedPlugin.label}</span>
                          {!lockSelections && !disabled && (
                            <span
                              className="cx-plug-x"
                              role="button"
                              aria-label="取消插件"
                              tabIndex={0}
                              onClick={(e) => {
                                e.stopPropagation()
                                onPluginChange?.(null)
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  onPluginChange?.(null)
                                }
                              }}
                            >
                              <Icon name="x" size={10} />
                            </span>
                          )}
                        </>
                      )}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="jcx-pop w-[320px]">
                    <div className="jcx-pop-head">
                      <strong>{pluginTitle || cfg.pluginTitle}</strong>
                      <small>
                        {cfg.label} · {cfg.description}
                      </small>
                    </div>
                    <div className="jcx-pop-list">
                      {cfg.plugins.map((p) => (
                        <button
                          key={p.key}
                          className={`jcx-pop-item ${plugin === p.key ? 'is-active' : ''}`}
                          type="button"
                          onClick={() => pickPlugin(p)}
                        >
                          <span className="jcx-pop-dot" />
                          <div className="jcx-pop-info">
                            <strong>{p.label}</strong>
                            {p.hint && <small>{p.hint}</small>}
                          </div>
                          {plugin === p.key && <Icon name="dot" size={10} />}
                        </button>
                      ))}
                    </div>
                    {pluginExtraSlot}
                  </PopoverContent>
                </Popover>
              )}

              {!hideMode && lockMode && (
                <span
                  className={`cx-badge cx-badge-mode ${selectedMode ? 'is-set' : ''} ${selectedMode?.warning ? 'is-warn' : ''} is-readonly`}
                  title={`${resolvedModeTitle}：${selectedMode?.label || resolvedModeTitle}`}
                >
                  <span className="cx-dot" />
                  {selectedMode?.label || resolvedModeTitle}
                </span>
              )}
              {!hideMode && !lockMode && (
                <Popover open={modePopOpen} onOpenChange={setModePopOpen}>
                  <PopoverTrigger asChild>
                    <button
                      className={`cx-badge cx-badge-mode ${selectedMode ? 'is-set' : ''} ${selectedMode?.warning ? 'is-warn' : ''}`}
                      type="button"
                      disabled={lockSelections || disabled}
                      title={resolvedModeTitle}
                    >
                      <span className="cx-dot" />
                      {selectedMode?.label || resolvedModeTitle}
                      <Icon name="chevron" size={11} />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="jcx-pop w-[280px]">
                    <div className="jcx-pop-head">
                      <strong>{resolvedModeTitle}</strong>
                      <small>{cfg.label}</small>
                    </div>
                    <div className="jcx-pop-list">
                      {resolvedModes.map((m) => (
                        <button
                          key={m.key}
                          className={`jcx-pop-item ${mode === m.key ? 'is-active' : ''} ${m.warning ? 'is-warn' : ''}`}
                          type="button"
                          onClick={() => pickMode(m)}
                        >
                          <span className="jcx-pop-dot" />
                          <div className="jcx-pop-info">
                            <strong>{m.label}</strong>
                            {m.warning ? (
                              <small className="jcx-pop-warn">⚠ {m.warning}</small>
                            ) : (
                              m.hint && <small>{m.hint}</small>
                            )}
                          </div>
                          {mode === m.key && <Icon name="dot" size={10} />}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              )}

              {compact && !hideBusinessPicker && !lockBusiness && (
                <>
                  {!lockBusiness && businessOpts.length > 1 ? (
                    <Popover open={businessPopOpen} onOpenChange={setBusinessPopOpen}>
                      <PopoverTrigger asChild>
                        <button className="cx-chip cx-chip-biz cx-chip-tbar" type="button">
                          <Icon name={cfg.icon} size={12} />
                          <span>{cfg.label}</span>
                          <Icon name="chevron" size={11} />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent align="start" className="jcx-pop w-[320px]">
                        <div className="jcx-pop-head">
                          <strong>业务选择</strong>
                          <small>不同业务对应不同插件 / 模式 / 模型</small>
                        </div>
                        <div className="jcx-pop-list">
                          {businessOpts.map((bk) => (
                            <button
                              key={bk}
                              className={`jcx-pop-item ${business === bk ? 'is-active' : ''}`}
                              type="button"
                              onClick={() => {
                                pickBusiness(bk)
                                setBusinessPopOpen(false)
                              }}
                            >
                              <span className="jcx-pop-dot">
                                <Icon name={BUSINESS_CONFIGS[bk].icon} size={11} />
                              </span>
                              <div className="jcx-pop-info">
                                <strong>{BUSINESS_CONFIGS[bk].label}</strong>
                                <small>{BUSINESS_CONFIGS[bk].description}</small>
                              </div>
                              {business === bk && <Icon name="dot" size={10} />}
                            </button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  ) : (
                    <span className="cx-chip cx-chip-biz cx-chip-tbar is-locked" title={cfg.label}>
                      <Icon name={cfg.icon} size={12} />
                      <span>{cfg.label}</span>
                    </span>
                  )}
                </>
              )}

              {!hideModel && effectiveNeedsModel && (
                <Popover open={modelPopOpen} onOpenChange={setModelPopOpen}>
                  <PopoverTrigger asChild>
                    <button
                      className="cx-model"
                      type="button"
                      disabled={lockSelections || disabled}
                      title={`大模型：${selectedModel?.label}`}
                    >
                      <Icon name={selectedModel?.icon || 'bolt'} size={11} />
                      <span>{selectedModel?.label || 'GPT 5.4'}</span>
                      <Icon name="chevron" size={11} />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="jcx-pop w-[240px]">
                    <div className="jcx-pop-head">
                      <strong>大模型</strong>
                      <small>选择当前对话使用的模型</small>
                    </div>
                    <div className="jcx-pop-list">
                      {modelOptions.map((m) => {
                        const av = modelAvailability[m.key]
                        const isDisabled = av && !av.available
                        return (
                          <button
                            key={m.key}
                            className={`jcx-pop-item ${model === m.key ? 'is-active' : ''} ${isDisabled ? 'is-disabled' : ''}`}
                            type="button"
                            onClick={() => pickModel(m)}
                          >
                            <span className="jcx-pop-dot">
                              <Icon name={m.icon} size={11} />
                            </span>
                            <div className="jcx-pop-info">
                              <strong>{m.label}</strong>
                              {isDisabled ? (
                                <small>{av.reason || '不可用'}</small>
                              ) : (
                                m.hint && <small>{m.hint}</small>
                              )}
                            </div>
                            {model === m.key && <Icon name="dot" size={10} />}
                          </button>
                        )
                      })}
                    </div>
                  </PopoverContent>
                </Popover>
              )}

              {leftExtraSlot}
            </div>

            <div className="cx-tool-right">
              {rightExtraSlot}

              {enableFileAttach && (
                <>
                  <input
                    ref={fileAttachInputRef}
                    type="file"
                    multiple
                    className="jcx-file-input"
                    tabIndex={-1}
                    aria-hidden="true"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || [])
                      for (const file of files) onAttachFile?.(file)
                      e.target.value = ''
                    }}
                  />
                  <button
                    type="button"
                    className="cx-attach-btn"
                    disabled={disabled}
                    title={t('composer.attachTip')}
                    onClick={() => fileAttachInputRef.current?.click()}
                  >
                    <Icon name="package" size={13} />
                    <span className="cx-attach-label">{t('composer.attachShort', '发送附件')}</span>
                  </button>
                </>
              )}

              <button
                className={`cx-send ${sendActive ? 'is-active' : ''} ${loading ? 'is-loading' : ''}`}
                disabled={loading || disabled}
                type="button"
                title={finalDisabledReason || '发送'}
                onClick={fireSubmit}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="19" x2="12" y2="5" />
                  <polyline points="5 12 12 5 19 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {showChipsRow && (
          <div className="cx-chips">
            {!hideBusinessPicker && !lockBusiness && (
              <>
                {businessOpts.length > 1 ? (
                  <Popover open={businessPopOpen} onOpenChange={setBusinessPopOpen}>
                    <PopoverTrigger asChild>
                      <button className="cx-chip cx-chip-biz" type="button">
                        <Icon name={cfg.icon} size={12} />
                        <span>{cfg.label}</span>
                        <Icon name="chevron" size={11} />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="jcx-pop w-[320px]">
                      <div className="jcx-pop-head">
                        <strong>业务选择</strong>
                        <small>不同业务对应不同插件 / 模式 / 模型</small>
                      </div>
                      <div className="jcx-pop-list">
                        {businessOpts.map((bk) => (
                          <button
                            key={bk}
                            className={`jcx-pop-item ${business === bk ? 'is-active' : ''}`}
                            type="button"
                            onClick={() => {
                              pickBusiness(bk)
                              setBusinessPopOpen(false)
                            }}
                          >
                            <span className="jcx-pop-dot">
                              <Icon name={BUSINESS_CONFIGS[bk].icon} size={11} />
                            </span>
                            <div className="jcx-pop-info">
                              <strong>{BUSINESS_CONFIGS[bk].label}</strong>
                              <small>{BUSINESS_CONFIGS[bk].description}</small>
                            </div>
                            {business === bk && <Icon name="dot" size={10} />}
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                ) : (
                  <span className="cx-chip cx-chip-biz is-locked" title={cfg.label}>
                    <Icon name={cfg.icon} size={12} />
                    <span>{cfg.label}</span>
                  </span>
                )}
              </>
            )}
            {chipsExtraSlot}
          </div>
        )}
      </div>
    </>
  )
}
