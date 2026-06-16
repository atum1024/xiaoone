import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState, type CSSProperties, type UIEvent } from 'react'
import { Square, CircleHelp, Trash2 } from 'lucide-react'
import './XiaooneComposer.css'
import { Popover, PopoverContent, PopoverTrigger, toast, Tooltip, TooltipContent, TooltipTrigger } from '@xiaoone/react-ui'
import { Icon, type IconName } from './Icon'
import { WarehouseAssetPickerDialog } from './WarehouseAssetPickerDialog'
import {
  ARK_IMAGE_MAX_REFERENCE,
  ARK_IMAGE_TOTAL_BUDGET,
  maxOutputCountForReferences,
} from '../lib/arkImageLimits'
import { isSupportedReferenceImage, SUPPORTED_REFERENCE_IMAGE_ACCEPT } from '../lib/imageUploadFormats'
import { usePreferences } from '../app/preferences'
import {
  BUSINESS_LIST,
  MARKETING_IMAGE_MODEL_KEYS,
  MARKETING_REASONING_MODEL_KEYS,
  MARKETING_VIDEO_MODEL_KEYS,
  getComposerLabels,
  getLocalizedBusinessConfig,
  getModels,
  PROGRAMMER_HERMES_MODEL_KEYS,
  pluginNeedsModel,
  resolveModeTitle,
  resolveModes,
  type BusinessKey,
  type ModelOption,
  type PluginItem,
  type ModeItem,
} from '../lib/composer'
import {
  ARK_IMAGE_TEMPLATE_CATEGORY_ORDER,
  ARK_VIDEO_TEMPLATE_CATEGORY_ORDER,
  arkVideoTemplateSelection,
  findArkImageTemplate,
  findArkVideoTemplate,
  getArkImageTemplateCategoryLabels,
  getArkImageTemplates,
  getArkVideoTemplateCategoryLabels,
  getArkVideoTemplates,
  type ArkImageTemplate,
  type ArkImageTemplateCategory,
  type ArkVideoTemplate,
  type ArkVideoTemplateCategory,
  type ArkVideoTemplateSelection,
} from '../lib/arkTemplates'
import { ARK_VIRTUAL_PORTRAITS, arkAssetUrl, fetchArkVirtualPortraits, normalizeArkAssetId, type ArkVirtualPortrait } from '../lib/arkVirtualPortraits'
import {
  formatPortraitHint,
  formatPortraitLabel,
  localizePortraitField,
  portraitCountryValue,
  portraitMetadataValue,
  portraitSearchTokens,
  sortPortraitCountries,
} from '../lib/arkVirtualPortraitL10n'
import type { AgentMaterialAsset, AgentModelAvailability } from '@xiaoone/chat-kit'
import { fetchImageSkills, imageSkillToPluginItem } from '../lib/imageSkillsApi'
import { useAuthStore } from '../store/auth'
import { warehouseAssetToFile, type WarehouseAssetKind } from '../lib/warehouseAssets'

export interface CommerceBrief {
  product_name?: string
  brand?: string
  selling_points?: string
  specifications?: string
  materials?: string
  use_cases?: string
  compliance_notes?: string
}

type CommerceBriefField = keyof CommerceBrief

interface CommerceBriefProfile {
  id: string
  label: string
  brief: CommerceBrief
  updated_at: string
}

const COMMERCE_BRIEF_KEYS: CommerceBriefField[] = [
  'product_name',
  'brand',
  'selling_points',
  'specifications',
  'materials',
  'use_cases',
  'compliance_notes',
]

const COMMERCE_BRIEF_LIMITS: Record<CommerceBriefField, number> = {
  product_name: 80,
  brand: 80,
  selling_points: 600,
  specifications: 700,
  materials: 500,
  use_cases: 500,
  compliance_notes: 500,
}

const VIDEO_REFERENCE_ACCEPT = 'image/png,image/jpeg,video/mp4,video/quicktime,audio/mpeg,audio/wav,audio/mp4'
const COPY_REFERENCE_ACCEPT = 'image/png,image/jpeg,application/pdf,text/plain,text/markdown,text/csv,application/json,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const COPY_REFERENCE_CONTENT_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'application/pdf',
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/json',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])
const COPY_REFERENCE_EXTENSION_RE = /\.(png|jpe?g|pdf|txt|md|csv|json|xlsx?|docx?)$/i

function isSupportedCopyReferenceFile(file: File) {
  const type = file.type.split(';')[0].trim().toLowerCase()
  const name = file.name || ''
  if (type.startsWith('video/') || type.startsWith('audio/'))
    return false
  if (type.startsWith('image/'))
    return type === 'image/png' || type === 'image/jpeg' || type === 'image/jpg'
  return COPY_REFERENCE_CONTENT_TYPES.has(type) || COPY_REFERENCE_EXTENSION_RE.test(name)
}

const COMMERCE_BRIEF_FIELDS: Array<{
  key: CommerceBriefField
  label: string
  hint: string
  placeholder: string
  multiline?: boolean
}> = [
  { key: 'product_name', label: '商品名', hint: '真实名称或品类', placeholder: '例：便携式筋膜枪' },
  { key: 'brand', label: '品牌', hint: '可留空', placeholder: '例：xiaoone' },
  { key: 'selling_points', label: '核心卖点', hint: '一行一个卖点', placeholder: '例：静音电机\n例：6 档力度\n例：Type-C 充电', multiline: true },
  { key: 'specifications', label: '规格参数', hint: '尺寸、重量、容量、型号', placeholder: '例：重量 480g\n例：电池 2500mAh\n例：尺寸 14 x 8 x 4cm', multiline: true },
  { key: 'materials', label: '材质成分', hint: '只填确定信息', placeholder: '例：铝合金机身\n例：食品级硅胶按摩头', multiline: true },
  { key: 'use_cases', label: '使用场景', hint: '适用人群或场景', placeholder: '例：运动后放松\n例：办公室久坐肩颈放松', multiline: true },
  { key: 'compliance_notes', label: '禁写内容', hint: '功效、认证、价格边界', placeholder: '例：不要写医疗功效\n例：不要编造认证、销量、价格', multiline: true },
]

function normalizeCommerceBriefText(value: unknown, maxLength: number) {
  let text = ''
  if (Array.isArray(value)) {
    text = value.map(item => String(item || '').trim()).filter(Boolean).join('\n')
  } else if (value && typeof value === 'object') {
    text = Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => `${key}: ${String(item || '').trim()}`)
      .filter(line => line.replace(/^[^:]+:\s*/, '').trim())
      .join('\n')
  } else {
    text = String(value || '')
  }
  const normalized = text
    .replace(/\r/g, '\n')
    .replace(/\t/g, ' ')
    .split('\n')
    .map(line => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n')
  return normalized.slice(0, maxLength)
}

export function normalizeCommerceBrief(value?: Partial<CommerceBrief> | null): CommerceBrief {
  const raw = value && typeof value === 'object' ? value : {}
  const brief: CommerceBrief = {}
  for (const key of COMMERCE_BRIEF_KEYS) {
    const text = normalizeCommerceBriefText(raw[key], COMMERCE_BRIEF_LIMITS[key])
    if (text)
      brief[key] = text
  }
  return brief
}

export function compactCommerceBrief(value?: Partial<CommerceBrief> | null): CommerceBrief | undefined {
  const brief = normalizeCommerceBrief(value)
  return COMMERCE_BRIEF_KEYS.some(key => Boolean(brief[key])) ? brief : undefined
}

const COMMERCE_BRIEF_STORAGE_KEY = 'xiaoone:marketing:commerce-brief:last'
const COMMERCE_BRIEF_PROFILE_STORAGE_KEY = 'xiaoone:marketing:commerce-brief:profiles:v1'
const COMMERCE_BRIEF_PROFILE_LIMIT = 24

function commerceBriefSignature(value?: Partial<CommerceBrief> | null) {
  const compact = compactCommerceBrief(value)
  if (!compact)
    return ''
  return COMMERCE_BRIEF_KEYS.map(key => `${key}:${compact[key] || ''}`).join('\n')
}

function commerceBriefProfileMatchKey(brief?: Partial<CommerceBrief> | null) {
  const compact = compactCommerceBrief(brief)
  if (!compact)
    return ''
  const product = String(compact.product_name || '').trim().toLowerCase()
  const brand = String(compact.brand || '').trim().toLowerCase()
  return product ? `${brand}\n${product}` : commerceBriefSignature(compact)
}

function commerceBriefProfileLabel(brief: Partial<CommerceBrief>, label?: string) {
  const explicit = normalizeCommerceBriefText(label, 80)
  if (explicit)
    return explicit
  const product = normalizeCommerceBriefText(brief.product_name, COMMERCE_BRIEF_LIMITS.product_name)
  const brand = normalizeCommerceBriefText(brief.brand, COMMERCE_BRIEF_LIMITS.brand)
  if (product && brand)
    return `${brand} / ${product}`.slice(0, 80)
  return product || brand || '未命名商品'
}

function commerceBriefProfileSummary(brief: Partial<CommerceBrief>) {
  const compact = normalizeCommerceBrief(brief)
  const firstLine = (value?: string) => String(value || '').split('\n').map(line => line.trim()).find(Boolean) || ''
  const parts = [
    compact.selling_points ? `卖点 ${firstLine(compact.selling_points)}` : '',
    compact.specifications ? `参数 ${firstLine(compact.specifications)}` : '',
    compact.materials ? `材质 ${firstLine(compact.materials)}` : '',
    compact.use_cases ? `场景 ${firstLine(compact.use_cases)}` : '',
  ].filter(Boolean)
  return parts.slice(0, 3).join(' · ') || '已保存结构化商品资料'
}

function normalizeCommerceBriefProfile(value: unknown): CommerceBriefProfile | undefined {
  if (!value || typeof value !== 'object')
    return undefined
  const raw = value as Partial<CommerceBriefProfile> & { brief?: Partial<CommerceBrief> }
  const brief = compactCommerceBrief(raw.brief)
  if (!brief)
    return undefined
  const id = normalizeCommerceBriefText(raw.id, 80) || `commerce-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  const updatedAt = normalizeCommerceBriefText(raw.updated_at, 40) || new Date().toISOString()
  return {
    id,
    label: commerceBriefProfileLabel(brief, raw.label),
    brief,
    updated_at: updatedAt,
  }
}

function readStoredCommerceBriefProfiles(): CommerceBriefProfile[] {
  if (typeof window === 'undefined')
    return []
  try {
    const raw = window.localStorage.getItem(COMMERCE_BRIEF_PROFILE_STORAGE_KEY)
    if (!raw)
      return []
    const parsed = JSON.parse(raw)
    const items = Array.isArray(parsed) ? parsed : []
    return items
      .map(normalizeCommerceBriefProfile)
      .filter((item): item is CommerceBriefProfile => Boolean(item))
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
      .slice(0, COMMERCE_BRIEF_PROFILE_LIMIT)
  } catch {
    return []
  }
}

function writeStoredCommerceBriefProfiles(profiles: CommerceBriefProfile[]) {
  if (typeof window === 'undefined')
    return
  const normalized = profiles
    .map(normalizeCommerceBriefProfile)
    .filter((item): item is CommerceBriefProfile => Boolean(item))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, COMMERCE_BRIEF_PROFILE_LIMIT)
  try {
    window.localStorage.setItem(COMMERCE_BRIEF_PROFILE_STORAGE_KEY, JSON.stringify(normalized))
  } catch {
    // localStorage can be unavailable in private or restricted browser contexts.
  }
}

function upsertCommerceBriefProfile(profiles: CommerceBriefProfile[], brief: Partial<CommerceBrief>) {
  const compact = compactCommerceBrief(brief)
  if (!compact)
    return profiles
  const now = new Date().toISOString()
  const signature = commerceBriefSignature(compact)
  const matchKey = commerceBriefProfileMatchKey(compact)
  let found = false
  const next = profiles.map((profile) => {
    const sameProfile = commerceBriefSignature(profile.brief) === signature || commerceBriefProfileMatchKey(profile.brief) === matchKey
    if (!sameProfile)
      return profile
    found = true
    return {
      ...profile,
      label: commerceBriefProfileLabel(compact, profile.label),
      brief: compact,
      updated_at: now,
    }
  })
  if (!found) {
    next.unshift({
      id: `commerce-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      label: commerceBriefProfileLabel(compact),
      brief: compact,
      updated_at: now,
    })
  }
  return next.sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, COMMERCE_BRIEF_PROFILE_LIMIT)
}

function readStoredCommerceBrief(): CommerceBrief | undefined {
  if (typeof window === 'undefined')
    return undefined
  try {
    const raw = window.localStorage.getItem(COMMERCE_BRIEF_STORAGE_KEY)
    if (!raw)
      return undefined
    return compactCommerceBrief(JSON.parse(raw))
  } catch {
    return undefined
  }
}

function writeStoredCommerceBrief(brief?: Partial<CommerceBrief> | null) {
  if (typeof window === 'undefined')
    return
  const compact = compactCommerceBrief(brief)
  if (!compact)
    return
  try {
    window.localStorage.setItem(COMMERCE_BRIEF_STORAGE_KEY, JSON.stringify(compact))
  } catch {
    // localStorage can be unavailable in private or restricted browser contexts.
  }
}

function appendCommerceBriefDraftField(draft: Partial<CommerceBrief>, key: CommerceBriefField, value: string) {
  const text = normalizeCommerceBriefText(value, COMMERCE_BRIEF_LIMITS[key])
  if (!text)
    return
  const existing = draft[key]
  const lines = new Set((existing ? `${existing}\n${text}` : text).split('\n').map(line => line.trim()).filter(Boolean))
  draft[key] = Array.from(lines).join('\n').slice(0, COMMERCE_BRIEF_LIMITS[key])
}

const COMMERCE_IMPORT_LABELS: Array<{ key: CommerceBriefField; labels: string[] }> = [
  { key: 'product_name', labels: ['商品名', '商品名称', '产品名', '产品名称', '品名', '名称', '标题', 'title', 'product name'] },
  { key: 'brand', labels: ['品牌', 'brand'] },
  { key: 'selling_points', labels: ['卖点', '核心卖点', '特点', '优势', '亮点', 'features', 'benefits'] },
  { key: 'specifications', labels: ['规格', '规格参数', '参数', '尺寸', '重量', '容量', '型号', '配置', 'spec', 'specs'] },
  { key: 'materials', labels: ['材质', '材料', '成分', '面料', '工艺', 'material', 'materials'] },
  { key: 'use_cases', labels: ['使用场景', '适用场景', '适用人群', '适用', '场景', '人群', '用途', 'use case', 'use cases'] },
  { key: 'compliance_notes', labels: ['禁写', '禁写内容', '合规', '合规要求', '注意事项', '禁止', '不要', '不得', '不能', 'compliance'] },
]

const COMMERCE_IMPORT_SPEC_RE = /(规格|参数|尺寸|重量|容量|电池|型号|功率|电压|长|宽|高|直径|厚度|\d\s*(?:g|kg|mg|cm|mm|mAh|wh|w|v|ml|l|oz)\b|inch|英寸|毫安|克|千克|厘米|毫米)/i
const COMMERCE_IMPORT_MATERIAL_RE = /(材质|材料|成分|面料|铝合金|硅胶|不锈钢|玻璃|陶瓷|棉|涤纶|皮革|abs|pp|pc|silicone|steel|aluminum|cotton|polyester)/i
const COMMERCE_IMPORT_USE_CASE_RE = /(适用|场景|人群|用途|办公室|户外|旅行|通勤|居家|运动后|健身|厨房|车载|儿童|宠物|老人|学生|business|office|travel|home|outdoor|fitness)/i
const COMMERCE_IMPORT_COMPLIANCE_RE = /(不要|禁止|不得|不能|不应|避免|请勿|禁写|合规|不可|不承诺|不保证|不编造|no fake|do not|avoid|forbidden|compliance)/i
const COMMERCE_IMPORT_SELLING_RE = /(卖点|特点|优势|亮点|静音|便携|快充|耐用|轻量|高效|防水|舒适|升级|feature|benefit|quiet|portable|durable|waterproof|fast charge)/i

function commerceImportLabelKey(label: string): CommerceBriefField | null {
  const normalized = label.replace(/\s+/g, ' ').trim().toLowerCase()
  if (!normalized)
    return null
  for (const item of COMMERCE_IMPORT_LABELS) {
    if (item.labels.some(candidate => normalized === candidate.toLowerCase()))
      return item.key
  }
  return null
}

function splitCommerceImportLine(line: string): { key: CommerceBriefField | null; value: string } {
  const match = line.match(/^([^:：\-—]{1,24})\s*[:：\-—]\s*(.+)$/)
  if (!match)
    return { key: null, value: line }
  return { key: commerceImportLabelKey(match[1]), value: match[2] }
}

function inferCommerceImportField(line: string): CommerceBriefField {
  if (COMMERCE_IMPORT_COMPLIANCE_RE.test(line))
    return 'compliance_notes'
  if (COMMERCE_IMPORT_SPEC_RE.test(line))
    return 'specifications'
  if (COMMERCE_IMPORT_MATERIAL_RE.test(line))
    return 'materials'
  if (COMMERCE_IMPORT_USE_CASE_RE.test(line))
    return 'use_cases'
  if (COMMERCE_IMPORT_SELLING_RE.test(line))
    return 'selling_points'
  return 'selling_points'
}

function extractCommerceBriefDraft(source: string): CommerceBrief {
  const rawLines = String(source || '')
    .replace(/\r/g, '\n')
    .replace(/\t/g, ' ')
    .split('\n')
    .map(line => line.replace(/^[\s\-*•·、]+/, '').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
  const draft: Partial<CommerceBrief> = {}
  for (const line of rawLines) {
    const { key, value } = splitCommerceImportLine(line)
    if (key) {
      appendCommerceBriefDraftField(draft, key, value)
      continue
    }
    if (!draft.product_name && rawLines.indexOf(line) === 0 && line.length <= COMMERCE_BRIEF_LIMITS.product_name && !COMMERCE_IMPORT_SPEC_RE.test(line) && !COMMERCE_IMPORT_COMPLIANCE_RE.test(line)) {
      appendCommerceBriefDraftField(draft, 'product_name', line)
      continue
    }
    appendCommerceBriefDraftField(draft, inferCommerceImportField(line), line)
  }
  return normalizeCommerceBrief(draft)
}

function mergeCommerceBriefDraft(current: Partial<CommerceBrief>, draft: Partial<CommerceBrief>) {
  const currentBrief = normalizeCommerceBrief(current)
  const draftBrief = normalizeCommerceBrief(draft)
  const merged: Partial<CommerceBrief> = { ...currentBrief }
  for (const key of COMMERCE_BRIEF_KEYS) {
    if (!merged[key] && draftBrief[key])
      merged[key] = draftBrief[key]
  }
  return normalizeCommerceBrief(merged)
}

function commerceBriefDraftMissingHints(brief?: Partial<CommerceBrief> | null) {
  const compact = normalizeCommerceBrief(brief)
  const hints: string[] = []
  if (!compact.product_name)
    hints.push('未识别到明确商品名')
  if (!compact.selling_points)
    hints.push('未识别到明确核心卖点')
  if (!compact.specifications)
    hints.push('未识别到明确规格参数')
  if (!compact.materials)
    hints.push('未识别到明确材质成分')
  if (!compact.use_cases)
    hints.push('未识别到明确使用场景')
  if (!compact.compliance_notes)
    hints.push('未识别到禁写内容')
  return hints
}

const COMMERCE_BRIEF_PROMPT_LABELS: Record<CommerceBriefField, string> = {
  product_name: '商品名',
  brand: '品牌',
  selling_points: '核心卖点',
  specifications: '规格参数',
  materials: '材质成分',
  use_cases: '使用场景',
  compliance_notes: '禁写内容',
}

const COMMERCE_TEMPLATE_BRIEF_MARKER = '【本次电商生成 brief】'
const TEMPLATE_INTENT_MARKER = '【模板意图】'
const VIRTUAL_PORTRAIT_MARKER = '【虚拟人物】'
const VIRTUAL_PORTRAIT_MARKERS = [VIRTUAL_PORTRAIT_MARKER, '[Virtual character]']
const SHOW_COMMERCE_BRIEF_TRIGGER = false

type ImageMediaTab = 'portrait' | ArkImageTemplateCategory
type VideoMediaTab = 'portrait' | ArkVideoTemplateCategory
/** Composer popovers open downward; never flip upward (avoids header clipping at viewport top). */
const COMPOSER_POP_PROPS = {
  side: 'bottom' as const,
  sideOffset: 8,
  avoidCollisions: false,
  collisionPadding: { left: 12, right: 12 },
} as const

const COMPOSER_DOCK_POP_PROPS = {
  ...COMPOSER_POP_PROPS,
  sideOffset: 10,
} as const

function commerceTemplateBriefMarkerCount(text: string) {
  const source = String(text || '')
  if (!source)
    return 0
  let count = 0
  let cursor = source.indexOf(COMMERCE_TEMPLATE_BRIEF_MARKER)
  while (cursor >= 0) {
    count += 1
    cursor = source.indexOf(COMMERCE_TEMPLATE_BRIEF_MARKER, cursor + COMMERCE_TEMPLATE_BRIEF_MARKER.length)
  }
  return count
}

function commerceBriefPromptBlock(brief?: Partial<CommerceBrief> | null) {
  const compact = compactCommerceBrief(brief)
  if (!compact)
    return ''
  const lines = ['商品资料：']
  for (const key of COMMERCE_BRIEF_KEYS) {
    const value = compact[key]
    if (value)
      lines.push(`- ${COMMERCE_BRIEF_PROMPT_LABELS[key]}：${value}`)
  }
  lines.push('约束：只使用商品资料、用户正文和上传素材中明确给出的参数、材质、认证、功效、价格和销量；缺失信息不得编造；禁写内容优先级最高。')
  return lines.join('\n')
}

function stripGeneratedCommerceTemplateBrief(text: string) {
  const source = String(text || '').trim()
  if (!source)
    return ''
  const markerIndex = source.indexOf(COMMERCE_TEMPLATE_BRIEF_MARKER)
  return markerIndex >= 0 ? source.slice(0, markerIndex).trim() : source
}

function generatedCommerceTemplateBrief(text: string) {
  const source = String(text || '').trim()
  if (!source)
    return ''
  const markerIndex = source.indexOf(COMMERCE_TEMPLATE_BRIEF_MARKER)
  return markerIndex >= 0 ? source.slice(markerIndex).trim() : ''
}

function commerceTemplateBriefPreview(text: string) {
  const userText = stripGeneratedCommerceTemplateBrief(text)
  const generatedBrief = generatedCommerceTemplateBrief(text)
  if (!generatedBrief)
    return ''
  return [
    userText ? `用户正文：\n${userText}` : '',
    generatedBrief,
  ].filter(Boolean).join('\n\n')
}

function stripPortraitBlock(text: string) {
  const source = String(text || '').trim()
  if (!source)
    return ''
  let markerIndex = -1
  for (const marker of VIRTUAL_PORTRAIT_MARKERS) {
    const index = source.indexOf(marker)
    if (index >= 0 && (markerIndex < 0 || index < markerIndex))
      markerIndex = index
  }
  return markerIndex >= 0 ? source.slice(0, markerIndex).trimEnd() : source
}

function findArkVirtualPortraitByAssetId(portraits: ArkVirtualPortrait[], assetId?: string) {
  const normalized = normalizeArkAssetId(assetId || '')
  if (!normalized)
    return null
  return portraits.find(portrait => normalizeArkAssetId(portrait.assetId) === normalized) || null
}

function commerceReadableCurrentInputSource(text: string) {
  const userText = stripGeneratedCommerceTemplateBrief(stripPortraitBlock(text))
  if (userText)
    return userText
  const generatedBrief = generatedCommerceTemplateBrief(text)
  if (!generatedBrief)
    return ''
  const productLines = generatedBrief
    .split('\n')
    .map(line => line.trim())
    .filter(line => /^-\s*(商品名|品牌|核心卖点|规格参数|材质成分|使用场景|禁写内容)[:：]/.test(line))
  return productLines.join('\n')
}

function normalizeCommerceAttachmentNames(names?: string[] | null) {
  return (names || [])
    .map(name => normalizeCommerceBriefText(name, 120))
    .filter(Boolean)
    .slice(0, 8)
}

function stripTemplateIntentBlock(text: string) {
  const markerIndex = text.indexOf(TEMPLATE_INTENT_MARKER)
  if (markerIndex < 0)
    return text.trim()
  return text.slice(0, markerIndex).trim()
}

function mergeTemplateIntentIntoPrompt(currentValue: string, templatePrompt: string) {
  const intent = templatePrompt.trim()
  if (!intent)
    return currentValue
  const userText = stripTemplateIntentBlock(currentValue)
  if (!userText)
    return `${TEMPLATE_INTENT_MARKER}\n${intent}`
  if (userText.includes(intent))
    return userText
  return `${userText}\n\n${TEMPLATE_INTENT_MARKER}\n${intent}`
}

function composeCommerceTemplatePrompt(params: {
  currentValue: string
  templateLabel: string
  templateCategoryLabel: string
  templatePrompt: string
  commerceBrief?: Partial<CommerceBrief> | null
}) {
  const briefBlock = commerceBriefPromptBlock(params.commerceBrief)
  if (!briefBlock)
    return params.templatePrompt
  const userText = stripGeneratedCommerceTemplateBrief(params.currentValue)
  const blocks = [
    userText,
    [
      COMMERCE_TEMPLATE_BRIEF_MARKER,
      `模板：${params.templateCategoryLabel} / ${params.templateLabel}`,
      params.templatePrompt ? `模板意图：${params.templatePrompt}` : '',
      briefBlock,
      '生成前 brief：请合并用户已有需求、模板意图、商品资料和可见参数执行；不要把模板文案当成可编造商品事实的来源。',
    ].filter(Boolean).join('\n'),
  ].filter(Boolean)
  return blocks.join('\n\n')
}

function commerceBriefRiskHints(brief?: Partial<CommerceBrief> | null) {
  const compact = normalizeCommerceBrief(brief)
  const hints: string[] = []
  if (!compact.specifications)
    hints.push('缺少规格参数，尺寸、重量、容量、型号不得编造。')
  if (!compact.materials)
    hints.push('缺少材质成分，材料、工艺、面料不得编造。')
  if (!compact.use_cases)
    hints.push('缺少使用场景，适用人群和场景只按已给信息表达。')
  if (!compact.compliance_notes)
    hints.push('未填写禁写内容，仍需避免编造认证、功效、价格、销量。')
  return hints
}

export interface VideoGenerationOptions {
  style_mode?: 'rich' | 'clean'
  frame_mode: 'first' | 'first_last'
  ratio: 'auto' | '21:9' | '16:9' | '4:3' | '1:1' | '3:4' | '9:16'
  resolution: '480p' | '720p' | '1080p'
  duration: number
  count: number
  generate_audio: boolean
  reference_images?: VideoReferenceImage[]
  video_skill?: string
  platform?: string
  subtitle?: boolean
  voiceover?: boolean
  cta?: string
  language?: string
  reference_assets?: Array<{ asset_id: string; role?: string }>
  shots?: Array<{ role: string; duration?: number; prompt?: string; caption?: string }>
  commerce_brief?: CommerceBrief
  template_id?: string
  template_label?: string
  template_category?: string
  virtual_portrait?: {
    asset_id?: string
    label?: string
    hint?: string
    cover_url?: string
  }
}

export interface VideoReferenceImage {
  url: string
  role?: 'reference_image' | 'first_frame' | 'last_frame'
  name?: string
  cover_url?: string
  asset_id?: string
  source?: 'ark_virtual_portrait' | string
}

export interface ImageGenerationOptions {
  style_mode?: 'rich' | 'clean'
  group_mode: 'auto' | 'storybook' | 'comic'
  image_skill?: string
  role_counts?: Record<string, number>
  resolution: '2K' | '4K'
  ratio: 'auto' | '1:1' | '3:4' | '4:3' | '16:9' | '9:16' | '2:3' | '3:2' | '21:9'
  width: number
  height: number
  count: number
  commerce_brief?: CommerceBrief
  template_id?: string
  template_label?: string
  template_category?: string
  reference_images?: VideoReferenceImage[]
  virtual_portrait?: {
    asset_id?: string
    label?: string
    hint?: string
    cover_url?: string
  }
}

export interface PptComposerOptions {
  template: 'business_plan' | 'work_report' | 'product_intro' | 'project_proposal' | 'training_course' | 'data_report'
  ratio: '16:9' | '4:3'
  slides: number
  tone: 'business' | 'visual' | 'minimal'
}

const PPT_TEMPLATES: Array<{ key: PptComposerOptions['template']; label: string; hint: string }> = [
  { key: 'business_plan', label: '商业计划书', hint: '市场、产品、商业模式、财务和融资结构' },
  { key: 'work_report', label: '工作汇报', hint: '目标、进展、结果、问题和下一步计划' },
  { key: 'product_intro', label: '产品介绍', hint: '卖点、场景、功能、案例和转化路径' },
  { key: 'project_proposal', label: '项目方案', hint: '背景、目标、路径、排期、预算和风险' },
  { key: 'training_course', label: '培训课件', hint: '课程目标、知识点、案例、练习和复盘' },
  { key: 'data_report', label: '数据报告', hint: '指标口径、趋势洞察、归因和行动建议' },
]

const PPT_TONES: Array<{ key: PptComposerOptions['tone']; label: string }> = [
  { key: 'business', label: '商务' },
  { key: 'visual', label: '视觉' },
  { key: 'minimal', label: '极简' },
]

const COPY_LANGUAGE_AUTO = 'auto'
const COPY_LANGUAGE_OPTIONS: Array<{ key: string; label: string; hint: string }> = [
  { key: COPY_LANGUAGE_AUTO, label: '自动', hint: '跟随最新输入' },
  { key: 'zh-CN', label: '简体中文', hint: 'Chinese Simplified' },
  { key: 'zh-TW', label: '繁体中文', hint: 'Chinese Traditional' },
  { key: 'en-US', label: 'English', hint: 'English' },
  { key: 'ja', label: '日本語', hint: 'Japanese' },
  { key: 'ko', label: '한국어', hint: 'Korean' },
  { key: 'es', label: 'Español', hint: 'Spanish' },
  { key: 'fr', label: 'Français', hint: 'French' },
  { key: 'de', label: 'Deutsch', hint: 'German' },
  { key: 'it', label: 'Italiano', hint: 'Italian' },
  { key: 'pt', label: 'Português', hint: 'Portuguese' },
  { key: 'ru', label: 'Русский', hint: 'Russian' },
  { key: 'ar', label: 'العربية', hint: 'Arabic' },
  { key: 'hi', label: 'हिन्दी', hint: 'Hindi' },
  { key: 'id', label: 'Bahasa Indonesia', hint: 'Indonesian' },
  { key: 'ms', label: 'Bahasa Melayu', hint: 'Malay' },
  { key: 'th', label: 'ไทย', hint: 'Thai' },
  { key: 'vi', label: 'Tiếng Việt', hint: 'Vietnamese' },
  { key: 'tr', label: 'Türkçe', hint: 'Turkish' },
  { key: 'nl', label: 'Nederlands', hint: 'Dutch' },
  { key: 'pl', label: 'Polski', hint: 'Polish' },
  { key: 'uk', label: 'Українська', hint: 'Ukrainian' },
  { key: 'fa', label: 'فارسی', hint: 'Persian' },
  { key: 'he', label: 'עברית', hint: 'Hebrew' },
  { key: 'sw', label: 'Kiswahili', hint: 'Swahili' },
]

const IMAGE_RATIOS: Array<{ key: ImageGenerationOptions['ratio']; label: string }> = [
  { key: 'auto', label: '智能' },
  { key: '1:1', label: '1:1' },
  { key: '3:4', label: '3:4' },
  { key: '4:3', label: '4:3' },
  { key: '16:9', label: '16:9' },
  { key: '9:16', label: '9:16' },
  { key: '2:3', label: '2:3' },
  { key: '3:2', label: '3:2' },
  { key: '21:9', label: '21:9' },
]

const VIDEO_RATIOS: Array<{ key: VideoGenerationOptions['ratio']; label: string }> = [
  { key: '21:9', label: '21:9' },
  { key: '16:9', label: '16:9' },
  { key: '4:3', label: '4:3' },
  { key: '1:1', label: '1:1' },
  { key: '3:4', label: '3:4' },
  { key: '9:16', label: '9:16' },
  { key: 'auto', label: '智能' },
]

const VIDEO_RESOLUTIONS: VideoGenerationOptions['resolution'][] = ['480p', '720p', '1080p']
const VIDEO_DURATIONS = [5, 10, 15]
const ARK_PORTRAIT_INITIAL_BATCH_SIZE = 30
const ARK_PORTRAIT_INCREMENT_SIZE = 21
type ArkPortraitPanelLayout = 'contained' | 'inline'
type ArkPortraitGenderFilter = 'all' | '男' | '女'
type ArkPortraitAgeFilter = 'all' | '18-24' | '25-34' | '35-44' | '45-54' | '55-64' | '65+'
const DEFAULT_ARK_IMAGE_TEMPLATE_CATEGORY: ArkImageTemplateCategory = 'clean'
const DEFAULT_ARK_VIDEO_TEMPLATE_CATEGORY: ArkVideoTemplateCategory = 'commerce'

const ARK_PORTRAIT_GENDER_FILTERS: Array<{ key: ArkPortraitGenderFilter; label: string }> = [
  { key: 'all', label: '全部' },
  { key: '男', label: '男' },
  { key: '女', label: '女' },
]

const ARK_PORTRAIT_AGE_FILTERS: Array<{ key: ArkPortraitAgeFilter; label: string }> = [
  { key: 'all', label: '全部年龄' },
  { key: '18-24', label: '18-24' },
  { key: '25-34', label: '25-34' },
  { key: '35-44', label: '35-44' },
  { key: '45-54', label: '45-54' },
  { key: '55-64', label: '55-64' },
  { key: '65+', label: '65+' },
]

const IMAGE_COUNT_MIN = 1
const SEEDREAM_MIN_IMAGE_PIXELS = 3_686_400
const IMAGE_DIMENSION_STEP = 16

function normalizeCopyLanguage(value?: string | null) {
  const normalized = String(value || '').replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim()
  return normalized ? normalized.slice(0, 80) : COPY_LANGUAGE_AUTO
}

function copyLanguageLabel(value?: string | null) {
  const normalized = normalizeCopyLanguage(value)
  return COPY_LANGUAGE_OPTIONS.find(item => item.key === normalized)?.label || normalized
}

function alignImageDimension(value: number) {
  return Math.ceil(value / IMAGE_DIMENSION_STEP) * IMAGE_DIMENSION_STEP
}

export function normalizeImageSizeForGeneration(width: number, height: number) {
  const safeWidth = Math.max(64, Math.min(6000, Math.round(Number(width) || 0)))
  const safeHeight = Math.max(64, Math.min(6000, Math.round(Number(height) || 0)))
  const area = safeWidth * safeHeight
  if (area >= SEEDREAM_MIN_IMAGE_PIXELS)
    return { width: safeWidth, height: safeHeight }
  const scale = Math.sqrt(SEEDREAM_MIN_IMAGE_PIXELS / Math.max(1, area))
  return {
    width: Math.min(6000, alignImageDimension(safeWidth * scale)),
    height: Math.min(6000, alignImageDimension(safeHeight * scale)),
  }
}

export function imageDimensions(resolution: ImageGenerationOptions['resolution'], ratio: ImageGenerationOptions['ratio']) {
  const base = resolution === '4K' ? 4096 : 2048
  if (ratio === 'auto' || ratio === '1:1') return normalizeImageSizeForGeneration(base, base)
  const [wRaw, hRaw] = ratio.split(':').map(Number)
  if (!wRaw || !hRaw) return normalizeImageSizeForGeneration(base, base)
  const size = wRaw >= hRaw
    ? { width: base, height: Math.max(64, Math.round(base * hRaw / wRaw)) }
    : { width: Math.max(64, Math.round(base * wRaw / hRaw)), height: base }
  return normalizeImageSizeForGeneration(size.width, size.height)
}

function formatEstimatedPlatformPoints(points: number) {
  return String(Math.max(1, Math.round(points)))
}

function estimateImagePlatformPoints(options?: ImageGenerationOptions | null) {
  if (!options) return 0
  const resolutionFactor = options.resolution === '4K' ? 2 : 1
  const groupFactor = options.group_mode === 'auto' ? 1 : 1.2
  return Math.ceil((options.count || 1) * 24 * resolutionFactor * groupFactor)
}

function estimateVideoPlatformPoints(options?: VideoGenerationOptions | null, hasVideoInput = false, modelKey?: string | null) {
  if (!options) return 0
  const resolutionFactor = options.resolution === '1080p' ? 2.2 : options.resolution === '720p' ? 1.5 : 1
  const inputFactor = hasVideoInput ? 1.35 : 1
  const speedFactor = modelKey === 'seedance-2.0-fast' ? 0.85 : 1
  return Math.ceil(Math.max(1, options.duration || 5) * 18 * resolutionFactor * inputFactor * speedFactor)
}

function imageModelSupportsArkAssetReference(modelKey?: string | null) {
  return false
}

function videoModelSupportsArkAssetReference(modelKey?: string | null) {
  return modelKey === 'seedance-2.0' || modelKey === 'seedance-2.0-fast'
}

function generationOptionsHaveArkAssetReference(options?: { reference_images?: VideoReferenceImage[]; virtual_portrait?: { asset_id?: string } } | null) {
  if (!options) return false
  return (options.reference_images || []).some((item) => {
    const url = typeof item?.url === 'string' ? item.url.trim() : ''
    return url.startsWith('asset://')
  })
}

function imageOptionsMissingArkPortraitCover(options?: ImageGenerationOptions | null) {
  if (!options || !normalizeArkAssetId(options.virtual_portrait?.asset_id))
    return false
  const coverUrl = String(options.virtual_portrait?.cover_url || '').trim()
  if (coverUrl.startsWith('http://') || coverUrl.startsWith('https://'))
    return false
  return !(options.reference_images || []).some((item) => {
    const url = typeof item?.url === 'string' ? item.url.trim() : ''
    return item?.source === 'ark_virtual_portrait' && (url.startsWith('http://') || url.startsWith('https://'))
  })
}

function buildTemplateCohesionSuffix(params: {
  hasReferenceAssets: boolean
  locale: import("../i18n/types").Locale
}): string {
  if (!params.hasReferenceAssets)
    return ''
  return params.locale === 'en'
    ? 'Template provides structure/layout; user-uploaded assets are the primary creative basis.'
    : '模板提供结构与版式；用户上传素材是本次内容的主要依据。'
}


function clampImageCount(value: number, maxCount = ARK_IMAGE_TOTAL_BUDGET) {
  if (!Number.isFinite(value)) return IMAGE_COUNT_MIN
  const cap = Math.max(IMAGE_COUNT_MIN, Math.round(maxCount))
  return Math.max(IMAGE_COUNT_MIN, Math.min(cap, Math.round(value)))
}

function arkVideoTemplateMeta(template: ArkVideoTemplate) {
  const opts = template.videoOptions
  return [
    opts.ratio,
    opts.resolution,
    typeof opts.duration === 'number' ? `${opts.duration}秒` : null,
    opts.generate_audio ? '含音频' : null,
  ].filter(Boolean).join(' · ')
}


function isArkVirtualPortraitReference(item?: VideoReferenceImage | null) {
  const url = typeof item?.url === 'string' ? item.url.trim() : ''
  return item?.source === 'ark_virtual_portrait' || url.startsWith('asset://')
}

function arkVirtualPortraitReferenceAssetId(item?: VideoReferenceImage | null) {
  return normalizeArkAssetId(item?.asset_id || item?.url)
}

function listArkVirtualPortraitReferences(options?: { reference_images?: VideoReferenceImage[] } | null): VideoReferenceImage[] {
  return (options?.reference_images || []).filter(isArkVirtualPortraitReference)
}

function materialMentionToken(index: number) {
  return `@素材${index}`
}

function materialLabel(index: number) {
  return `素材${index}`
}

function escapeMaterialRegex(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function extractMaterialMentions(text: string) {
  return (text.match(/@素材\d+/g) || [])
}

function fileMaterialKey(file: File, index: number) {
  return `file:${file.name}:${file.size}:${file.lastModified}:${index}`
}

function previewKindForFile(file: File): 'image' | 'video' | 'file' {
  const type = file.type.split(';')[0].trim().toLowerCase()
  const name = (file.name || '').toLowerCase()
  if (type.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/.test(name))
    return 'image'
  if (type.startsWith('video/') || /\.(mp4|m4v|mov|webm)$/.test(name))
    return 'video'
  return 'file'
}

function renumberMaterialPortraitReferences(refs: VideoReferenceImage[]): VideoReferenceImage[] {
  return refs.map((ref, index) => ({
    ...ref,
    name: materialMentionToken(index + 1),
  }))
}

function portraitReferenceSignature(refs: VideoReferenceImage[]) {
  return refs.map(ref => [
    normalizeArkAssetId(ref.url),
    ref.name || '',
    ref.role || 'reference_image',
    ref.source || '',
    ref.cover_url || '',
  ].join('|')).join(';;')
}

function composerMaterialsSignature(items: Array<{ key: string; mention: string }>) {
  return items.map(item => `${item.key}:${item.mention}`).join('|')
}

function selectedArkVirtualPortraitReference(options?: VideoGenerationOptions | null): VideoReferenceImage | null {
  const refs = options?.reference_images
  if (!Array.isArray(refs))
    return null
  return listArkVirtualPortraitReferences(options)[0] || null
}

function isInternalArkAssetLabel(label: string, assetId?: string) {
  const normalized = normalizeArkAssetId(label)
  return Boolean(normalized && (!assetId || normalized === assetId))
}

function arkVirtualPortraitLabel(portrait: ArkVirtualPortrait, index?: number) {
  const label = String(portrait.label || '').trim()
  if (label && !label.startsWith('asset://') && !isInternalArkAssetLabel(label, portrait.assetId))
    return label
  return typeof index === 'number' ? `官方人物 ${index + 1}` : 'Ark 虚拟人物'
}

function selectedArkVirtualPortraitLabel(reference?: VideoReferenceImage | null) {
  const name = String(reference?.name || '').trim()
  const assetId = normalizeArkAssetId(reference?.url)
  if (name && !name.startsWith('asset://') && !/asset[-_:]/i.test(name) && !isInternalArkAssetLabel(name, assetId))
    return name
  return 'Ark 虚拟人物'
}

function arkVirtualPortraitHint(portrait: ArkVirtualPortrait) {
  const hint = String(portrait.hint || '').trim()
  if (hint && !hint.startsWith('asset://') && !isInternalArkAssetLabel(hint, portrait.assetId))
    return hint
  return '官方人物素材'
}

function arkPortraitEmptyMessage(status?: string, credentialRequired?: boolean) {
  if (credentialRequired || status === 'needs_credentials')
    return '后台还没有配置 Ark 官方人物库。配置完成后，刷新即可选择人物。'
  if (status === 'needs_subscription')
    return 'Ark OpenAPI 凭据已生效，但当前账号无法通过 Ark 私域素材 API 自动同步人物库；不影响使用已配置的官方人物生成视频。'
  if (status === 'sync_failed')
    return '暂时无法读取官方人物库，请稍后刷新。'
  return '配置官方人物库后，这里会显示可选人物。'
}

function arkPortraitStatusLabel(status?: string) {
  if (!status || status === 'ok')
    return ''
  if (status === 'needs_credentials')
    return '待配置'
  if (status === 'needs_subscription')
    return '自动同步受限'
  if (status === 'sync_failed')
    return '刷新失败'
  return ''
}

function renderArkVirtualPortraitMedia(portrait: ArkVirtualPortrait) {
  const posterUrl = portrait.coverUrl || portrait.previewUrl || ''
  const videoUrl = portrait.videoUrl || ''
  if (videoUrl) {
    return (
      <video
        src={videoUrl}
        poster={posterUrl || undefined}
        muted
        playsInline
        preload="metadata"
        loop
      />
    )
  }
  if (!posterUrl)
    return <Icon name="user" size={18} />
  return <img src={posterUrl} alt="" loading="lazy" />
}

function arkImageGroupLabel(groupMode?: ArkImageTemplate['imageOptions']['group_mode']) {
  if (groupMode === 'storybook') return '绘本组图'
  if (groupMode === 'comic') return '连环画'
  return '智能组图'
}

function arkImageTemplateMeta(template: ArkImageTemplate) {
  const opts = template.imageOptions
  return [
    arkImageGroupLabel(opts.group_mode),
    opts.ratio === 'auto' ? '智能比例' : opts.ratio,
    opts.resolution,
    typeof opts.count === 'number' ? `${opts.count}张` : null,
  ].filter(Boolean).join(' · ')
}

function renderArkTemplateCover(template: ArkImageTemplate | ArkVideoTemplate, modality: 'image' | 'video') {
  return (
    <span className="cx-ark-template-cover" data-cover={template.cover} data-modality={modality} aria-hidden="true">
      <span className="cx-ark-cover-grid" />
      <span className="cx-ark-cover-stage">
        <span className="cx-ark-cover-shape is-main" />
        <span className="cx-ark-cover-shape is-side" />
        <span className="cx-ark-cover-shape is-accent" />
      </span>
      <span className="cx-ark-cover-chip">
        <Icon name={modality === 'video' ? 'video' : 'image'} size={11} />
        <span>{modality === 'video' ? 'Seedance' : 'Seedream'}</span>
      </span>
      {modality === 'video' && (
        <span className="cx-ark-cover-play">
          <Icon name="video" size={13} />
        </span>
      )}
    </span>
  )
}

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
  generationModel?: string | null
  onGenerationModelChange?: (val: string | null) => void
  loading?: boolean
  stopActive?: boolean
  placeholder?: string
  disabled?: boolean
  lockBusiness?: boolean
  /** 插件仅展示、不可切换（例如路由已固定到平面设计 / 视频剪辑 / 营销文案） */
  lockPlugin?: boolean
  /** 模式仅展示、不可切换（如辣鸡PPT / 商务经理 / 维修工固定 xiaoone） */
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
  attachButtonPlacement?: 'left' | 'right'
  hasAttachment?: boolean
  attachmentNames?: string[]
  /** Image-design mode: count of PNG/JPEG reference attachments already selected. */
  referenceImageCount?: number
  modelAvailability?: Record<string, AgentModelAvailability>
  imageOptions?: ImageGenerationOptions
  onImageOptionsChange?: (val: ImageGenerationOptions) => void
  videoOptions?: VideoGenerationOptions
  onVideoOptionsChange?: (val: VideoGenerationOptions) => void
  videoTemplate?: ArkVideoTemplateSelection | null
  onVideoTemplateChange?: (val: ArkVideoTemplateSelection | null) => void
  videoTemplateLocked?: boolean
  pptOptions?: PptComposerOptions
  onPptOptionsChange?: (val: PptComposerOptions) => void
  copyLanguage?: string | null
  onCopyLanguageChange?: (val: string) => void
  hasVideoInput?: boolean
  /** 运营端为 xiaoone 业务配置的可选模型 key；有值时用户端仅展示列表内模型 */
  consultantModelAllowlist?: string[] | null
  onSubmit?: (contentOverride?: string) => void
  onStop?: () => void
  onAttachFile?: (file: File) => void
  pendingAttachFiles?: File[]
  onRemovePendingAttachFile?: (index: number) => void
  aboveSlot?: ReactNode
  chipsExtraSlot?: ReactNode
  leftExtraSlot?: ReactNode
  rightExtraSlot?: ReactNode
  pluginExtraSlot?: ReactNode
  pluginBadge?: {
    label: string
    icon: IconName
    title?: string
  } | null
  expertBadge?: {
    label: string
    icon: IconName
  } | null
  /** New-chat pages show template/portrait dock inline; detail pages use a bottom drawer. */
  mediaDockPlacement?: 'inline' | 'drawer'
}

const EMPTY_PENDING_FILES: File[] = []
const EMPTY_ATTACHMENT_NAMES: string[] = []
const EMPTY_MODEL_AVAILABILITY: Record<string, AgentModelAvailability> = {}

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
  generationModel = null,
  onGenerationModelChange,
  loading = false,
  stopActive = false,
  placeholder = '描述要处理的事项…',
  disabled = false,
  lockBusiness = false,
  lockPlugin = false,
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
  attachButtonPlacement = 'right',
  hasAttachment = false,
  attachmentNames = EMPTY_ATTACHMENT_NAMES,
  referenceImageCount = 0,
  modelAvailability = EMPTY_MODEL_AVAILABILITY,
  imageOptions,
  onImageOptionsChange,
  videoOptions,
  onVideoOptionsChange,
  videoTemplate,
  onVideoTemplateChange,
  videoTemplateLocked = false,
  pptOptions,
  onPptOptionsChange,
  copyLanguage = COPY_LANGUAGE_AUTO,
  onCopyLanguageChange,
  hasVideoInput = false,
  consultantModelAllowlist = null,
  onSubmit,
  onStop,
  onAttachFile,
  pendingAttachFiles = EMPTY_PENDING_FILES,
  onRemovePendingAttachFile,
  aboveSlot,
  chipsExtraSlot,
  leftExtraSlot,
  rightExtraSlot,
  pluginExtraSlot,
  pluginBadge = null,
  expertBadge = null,
  mediaDockPlacement = 'inline',
}: Props) {
  const { t, tpl, locale } = usePreferences()
  const isDrawerDock = mediaDockPlacement === 'drawer'
  const localizedModels = useMemo(() => getModels(locale), [locale])
  const composerLabels = useMemo(() => getComposerLabels(locale), [locale])
  const arkImageTemplates = useMemo(() => getArkImageTemplates(locale), [locale])
  const arkVideoTemplates = useMemo(() => getArkVideoTemplates(locale), [locale])
  const arkImageTemplateCategoryLabels = useMemo(() => getArkImageTemplateCategoryLabels(locale), [locale])
  const arkVideoTemplateCategoryLabels = useMemo(() => getArkVideoTemplateCategoryLabels(locale), [locale])
  const arkImageTemplateCategories = useMemo(
    () => ARK_IMAGE_TEMPLATE_CATEGORY_ORDER.map(key => ({ key, label: arkImageTemplateCategoryLabels[key] })),
    [arkImageTemplateCategoryLabels],
  )
  const arkVideoTemplateCategories = useMemo(
    () => ARK_VIDEO_TEMPLATE_CATEGORY_ORDER.map(key => ({ key, label: arkVideoTemplateCategoryLabels[key] })),
    [arkVideoTemplateCategoryLabels],
  )
  const videoMediaTemplateCategories = useMemo(
    () => arkVideoTemplateCategories.filter(item => item.key !== 'portrait' && item.key !== 'clean'),
    [arkVideoTemplateCategories],
  )
  const imageMediaTemplateCategories = useMemo(
    () => arkImageTemplateCategories.filter(item => item.key !== 'clean'),
    [arkImageTemplateCategories],
  )
  const localizedBusinessConfigs = composerLabels.businessConfigs
  const imageRatios = useMemo(
    () => IMAGE_RATIOS.map(item => ({ ...item, label: item.key === 'auto' ? t('composer.image.smart') : item.label })),
    [t],
  )
  const videoRatios = useMemo(
    () => VIDEO_RATIOS.map(item => ({ ...item, label: item.key === 'auto' ? t('composer.image.smart') : item.label })),
    [t],
  )
  const arkImageGroupLabelLocalized = (groupMode?: ArkImageTemplate['imageOptions']['group_mode']) => {
    if (groupMode === 'storybook') return t('composer.image.group.storybook')
    if (groupMode === 'comic') return t('composer.image.group.comic')
    return t('composer.image.group.auto')
  }
  const commerceBriefFields = useMemo(() => COMMERCE_BRIEF_KEYS.map(key => ({
    key,
    label: t(`composer.commerce.field.${key}.label`),
    hint: t(`composer.commerce.field.${key}.hint`),
    placeholder: t(`composer.commerce.field.${key}.placeholder`),
    multiline: key !== 'product_name' && key !== 'brand',
  })), [t])
  const copyLanguageOptions = useMemo(() => COPY_LANGUAGE_OPTIONS.map(item => {
    if (item.key === COPY_LANGUAGE_AUTO)
      return { ...item, label: t('composer.copyLang.auto'), hint: t('composer.copyLang.autoHint') }
    if (item.key === 'zh-CN')
      return { ...item, label: t('composer.copyLang.zhCN'), hint: item.hint }
    if (item.key === 'zh-TW')
      return { ...item, label: t('composer.copyLang.zhTW'), hint: item.hint }
    if (item.key === 'ja')
      return { ...item, label: t('composer.copyLang.ja'), hint: item.hint }
    return item
  }), [t])
  const copyLanguageLabelLocalized = (value?: string | null) => {
    const normalized = normalizeCopyLanguage(value)
    return copyLanguageOptions.find(item => item.key === normalized)?.label || normalized
  }
  const pptTemplates = useMemo(() => PPT_TEMPLATES.map(item => ({
    ...item,
    label: t(`composer.ppt.template.${item.key}`),
    hint: t(`composer.ppt.template.${item.key}.hint`),
  })), [t])
  const pptTones = useMemo(() => PPT_TONES.map(item => ({
    ...item,
    label: t(`composer.ppt.tone.${item.key}`),
  })), [t])
  const arkPortraitGenderFilters = useMemo(() => ARK_PORTRAIT_GENDER_FILTERS.map(item => ({
    ...item,
    label: item.key === 'all'
      ? t('composer.ark.portrait.filter.all')
      : item.key === '男'
        ? t('composer.ark.portrait.filter.male')
        : t('composer.ark.portrait.filter.female'),
  })), [t])
  const arkPortraitAgeFilters = useMemo(() => ARK_PORTRAIT_AGE_FILTERS.map(item => ({
    ...item,
    label: item.key === 'all' ? t('composer.ark.portrait.filter.allAges') : item.label,
  })), [t])
  const arkVirtualPortraitLabelLocalized = (portrait: ArkVirtualPortrait, index?: number) => {
    const label = formatPortraitLabel(portrait, locale)
    if (label && !label.startsWith('asset://') && !isInternalArkAssetLabel(label, portrait.assetId))
      return label
    return typeof index === 'number'
      ? tpl('composer.ark.portrait.official', String(index + 1))
      : t('composer.ark.portrait.default')
  }
  const arkVirtualPortraitHintLocalized = (portrait: ArkVirtualPortrait) => {
    const hint = formatPortraitHint(portrait, locale)
    if (hint)
      return hint
    return t('composer.ark.portrait.asset')
  }
  const selectedArkVirtualPortraitLabelLocalized = (reference?: VideoReferenceImage | null) => {
    const name = String(reference?.name || '').trim()
    const assetId = normalizeArkAssetId(reference?.url)
    if (name && !name.startsWith('asset://') && !/asset[-_:]/i.test(name) && !isInternalArkAssetLabel(name, assetId))
      return name
    return t('composer.ark.portrait.default')
  }
  const arkPortraitEmptyMessageLocalized = (status?: string, credentialRequired?: boolean) => {
    if (credentialRequired || status === 'needs_credentials')
      return t('composer.ark.portrait.empty.notConfigured')
    if (status === 'needs_subscription')
      return t('composer.ark.portrait.empty.syncLimited')
    if (status === 'sync_failed')
      return t('composer.ark.portrait.empty.refreshFailed')
    return t('composer.ark.portrait.empty.default')
  }
  const arkPortraitStatusLabelLocalized = (status?: string) => {
    if (!status || status === 'ok')
      return ''
    if (status === 'needs_credentials')
      return t('composer.ark.portrait.status.pending')
    if (status === 'needs_subscription')
      return t('composer.ark.portrait.status.syncLimited')
    if (status === 'sync_failed')
      return t('composer.ark.portrait.status.refreshFailed')
    return ''
  }
  const arkImageTemplateMetaLocalized = (template: ArkImageTemplate) => {
    const opts = template.imageOptions
    return [
      arkImageGroupLabelLocalized(opts.group_mode),
      opts.ratio === 'auto' ? t('composer.image.meta.smartRatio') : opts.ratio,
      opts.resolution,
      typeof opts.count === 'number' ? tpl('composer.image.meta.count', String(opts.count)) : null,
    ].filter(Boolean).join(' · ')
  }
  const arkVideoTemplateMetaLocalized = (template: ArkVideoTemplate) => {
    const opts = template.videoOptions
    return [
      opts.ratio,
      opts.resolution,
      typeof opts.duration === 'number' ? `${opts.duration}${t('composer.video.secUnit')}` : null,
      opts.generate_audio ? t('composer.video.withAudioShort') : null,
    ].filter(Boolean).join(' · ')
  }
  const commerceBriefDraftMissingHintsLocalized = (brief?: Partial<CommerceBrief> | null) => {
    const compact = normalizeCommerceBrief(brief)
    const hints: string[] = []
    if (!compact.product_name)
      hints.push(t('composer.commerce.warn.noProductName'))
    if (!compact.selling_points)
      hints.push(t('composer.commerce.warn.noSellingPoints'))
    if (!compact.specifications)
      hints.push(t('composer.commerce.warn.noSpecifications'))
    if (!compact.materials)
      hints.push(t('composer.commerce.warn.noMaterials'))
    if (!compact.use_cases)
      hints.push(t('composer.commerce.warn.noUseCases'))
    if (!compact.compliance_notes)
      hints.push(t('composer.commerce.warn.noCompliance'))
    return hints
  }
  const taRef = useRef<HTMLTextAreaElement>(null)
  const fileAttachInputRef = useRef<HTMLInputElement>(null)
  const arkPortraitLoadMoreRef = useRef<HTMLDivElement>(null)

  const [pluginPopOpen, setPluginPopOpen] = useState(false)
  const [modePopOpen, setModePopOpen] = useState(false)
  const [businessPopOpen, setBusinessPopOpen] = useState(false)
  const [modelPopOpen, setModelPopOpen] = useState(false)
  const [generationModelPopOpen, setGenerationModelPopOpen] = useState(false)
  const [imageMediaTab, setImageMediaTab] = useState<ImageMediaTab>('portrait')
  const [imageMediaDrawerOpen, setImageMediaDrawerOpen] = useState(false)
  const [imageParamsPopOpen, setImageParamsPopOpen] = useState(false)
  const [videoMediaDrawerOpen, setVideoMediaDrawerOpen] = useState(false)
  const [videoMediaTab, setVideoMediaTab] = useState<VideoMediaTab>('portrait')
  const [videoParamsPopOpen, setVideoParamsPopOpen] = useState(false)
  const [addAssetPopOpen, setAddAssetPopOpen] = useState(false)
  const [copyLanguagePopOpen, setCopyLanguagePopOpen] = useState(false)
  const [copyLanguageCustom, setCopyLanguageCustom] = useState('')
  const [commerceBriefPopOpen, setCommerceBriefPopOpen] = useState(false)
  const [commerceBriefPreviewOpen, setCommerceBriefPreviewOpen] = useState(false)
  const [commerceBriefAutoImportDisabled, setCommerceBriefAutoImportDisabled] = useState(false)
  const [recentCommerceBrief, setRecentCommerceBrief] = useState<CommerceBrief | undefined>(() => readStoredCommerceBrief())
  const [commerceBriefProfiles, setCommerceBriefProfiles] = useState<CommerceBriefProfile[]>(() => readStoredCommerceBriefProfiles())
  const [commerceBriefLibraryOpen, setCommerceBriefLibraryOpen] = useState(false)
  const [commerceBriefImportOpen, setCommerceBriefImportOpen] = useState(false)
  const [commerceBriefImportText, setCommerceBriefImportText] = useState('')
  const [commerceBriefImportDraft, setCommerceBriefImportDraft] = useState<CommerceBrief>({})
  const [commerceBriefImportSources, setCommerceBriefImportSources] = useState<string[]>([])
  const [commerceBriefImportWarnings, setCommerceBriefImportWarnings] = useState<string[]>([])
  const [commerceSendConfirmEnabled, setCommerceSendConfirmEnabled] = useState(true)
  const [commerceSendConfirmOpen, setCommerceSendConfirmOpen] = useState(false)
  const [commerceSendConfirmText, setCommerceSendConfirmText] = useState('')
  const [arkPortraitPopOpen, setArkPortraitPopOpen] = useState(false)
  const [arkPortraitFiltersOpen, setArkPortraitFiltersOpen] = useState(false)
  const [arkPortraitFilterMenu, setArkPortraitFilterMenu] = useState<'gender' | 'age' | 'country' | null>(null)
  const [arkVirtualPortraits, setArkVirtualPortraits] = useState<ArkVirtualPortrait[]>(ARK_VIRTUAL_PORTRAITS)
  const [arkPortraitVisibleCount, setArkPortraitVisibleCount] = useState(ARK_PORTRAIT_INITIAL_BATCH_SIZE)
  const [arkPortraitSearch, setArkPortraitSearch] = useState('')
  const [arkPortraitGenderFilter, setArkPortraitGenderFilter] = useState<ArkPortraitGenderFilter>('all')
  const [arkPortraitAgeFilter, setArkPortraitAgeFilter] = useState<ArkPortraitAgeFilter>('all')
  const [arkPortraitCountryFilter, setArkPortraitCountryFilter] = useState('all')
  const [arkPortraitLoading, setArkPortraitLoading] = useState(false)
  const [arkPortraitMessage, setArkPortraitMessage] = useState('')
  const [arkPortraitStatus, setArkPortraitStatus] = useState('')
  const [arkPortraitSource, setArkPortraitSource] = useState('')
  const [arkPortraitCredentialRequired, setArkPortraitCredentialRequired] = useState(false)
  const [arkImageTemplateCategory, setArkImageTemplateCategory] = useState<ArkImageTemplateCategory>(DEFAULT_ARK_IMAGE_TEMPLATE_CATEGORY)
  const [arkVideoTemplateCategory, setArkVideoTemplateCategory] = useState<ArkVideoTemplateCategory>(DEFAULT_ARK_VIDEO_TEMPLATE_CATEGORY)
  const [pptTemplatePopOpen, setPptTemplatePopOpen] = useState(false)
  const [pptSettingsPopOpen, setPptSettingsPopOpen] = useState(false)
  const [warehousePickerOpen, setWarehousePickerOpen] = useState(false)
  const [warehouseSelectingId, setWarehouseSelectingId] = useState('')
  const [pluginDockOpen, setPluginDockOpen] = useState(false)
  const [remotePluginsByMode, setRemotePluginsByMode] = useState<Record<string, PluginItem[]>>({})
  const [remotePluginLoading, setRemotePluginLoading] = useState(false)
  const hasFeature = useAuthStore(state => state.hasFeature)

  const showChipsRow = !compact && (Boolean(chipsExtraSlot) || (!hideBusinessPicker && !lockBusiness))
  const cfg = getLocalizedBusinessConfig(business, locale)
  const effectiveNeedsModel = pluginNeedsModel(cfg, plugin)
  const resolvedModes = resolveModes(cfg, plugin)
  const resolvedModeTitle = resolveModeTitle(cfg, plugin)
  const businessOpts = businessOptions?.length ? businessOptions : BUSINESS_LIST
  const pluginSourceForMode = mode ? cfg.pluginsByMode?.[mode] : undefined
  const usesRemotePlugins = pluginSourceForMode === 'remote'
  const remotePluginKey = `${cfg.key}:${mode || ''}`
  const remotePluginItemsForMode = remotePluginsByMode[remotePluginKey]
  const hasRemotePluginResult = Object.prototype.hasOwnProperty.call(remotePluginsByMode, remotePluginKey)
  const pluginOptions = useMemo(() => {
    let items: PluginItem[]
    if (Array.isArray(pluginSourceForMode))
      items = pluginSourceForMode
    else if (usesRemotePlugins)
      items = remotePluginItemsForMode || []
    else
      items = cfg.plugins
    return items.filter(item => !item.requiresFeature || hasFeature(item.requiresFeature))
  }, [cfg.plugins, hasFeature, pluginSourceForMode, remotePluginItemsForMode, usesRemotePlugins])
  const effectivePluginTitle = (mode && cfg.pluginTitleByMode?.[mode]) || cfg.pluginTitle
  const pluginPopoverDescription = usesRemotePlugins
    ? (mode === 'text' ? t('composer.skill.textCapability') : t('composer.skill.imageCapability'))
    : cfg.description
  const isImageGenerationMode = business === 'marketing' && mode === 'image'
  const isVideoGenerationMode = business === 'marketing' && mode === 'video'
  const isMaterialMode = isImageGenerationMode || isVideoGenerationMode
  const isMarketingTextMode = business === 'marketing' && mode === 'text'
  const isPptMode = business === 'support' && Boolean(pptOptions)
  const isImageCleanMode = isImageGenerationMode && imageOptions?.style_mode === 'clean'
  const isVideoCleanMode = isVideoGenerationMode && videoOptions?.style_mode === 'clean'
  const showCommerceBriefControl = (isImageGenerationMode || isVideoGenerationMode) && Boolean(onImageOptionsChange || onVideoOptionsChange)
  const enableAttachControl = enableFileAttach
  const showToolbarAttachButton = enableFileAttach && !isImageGenerationMode && !isVideoGenerationMode && !isPptMode
  const attachTitle = business === 'marketing' ? t('composer.attachMarketingTitle') : t('composer.attachTip')
  const attachLabel = business === 'marketing' ? t('composer.attachMarketing') : t('composer.attachShort', '发送附件')
  const warehouseAllowedKinds = useMemo<WarehouseAssetKind[]>(
    () => isImageGenerationMode ? ['image'] : ['image', 'video', 'file'],
    [isImageGenerationMode],
  )
  const warehouseDialogAllowedKinds = warehouseAllowedKinds
  const hideReasoningModelForMedia = isImageGenerationMode || isVideoGenerationMode
  const hasModeOptions = resolvedModes.length > 0
  const pluginLocked = lockPlugin || lockSelections
  const showArkImageTemplates = isImageGenerationMode && Boolean(imageOptions) && Boolean(onImageOptionsChange)
  const showArkVideoTemplates = isVideoGenerationMode && Boolean(videoOptions) && Boolean(onVideoOptionsChange)
  const showArkVirtualPortraits = (isImageGenerationMode || isVideoGenerationMode)
    && Boolean((isImageGenerationMode && imageOptions && onImageOptionsChange) || (isVideoGenerationMode && videoOptions && onVideoOptionsChange))
  const showVideoMediaStage = isVideoGenerationMode && (showArkVideoTemplates || showArkVirtualPortraits)
  const showImageMediaStage = isImageGenerationMode && Boolean(imageOptions) && (showArkImageTemplates || showArkVirtualPortraits)
  const showUnifiedMediaStage = showImageMediaStage || showVideoMediaStage
  const imageMediaTabCount = (showArkVirtualPortraits ? 1 : 0) + (showArkImageTemplates ? imageMediaTemplateCategories.length : 0)
  const showImageMediaTabBar = imageMediaTabCount > 1
  const videoMediaTabCount = (showArkVirtualPortraits ? 1 : 0) + (showArkVideoTemplates ? videoMediaTemplateCategories.length : 0)
  const showVideoMediaTabBar = videoMediaTabCount > 1
  const hasPluginControlOptions = usesRemotePlugins || pluginOptions.length > 0 || Boolean(pluginBadge)
  const usesPluginDock = !hidePlugin
    && !pluginLocked
    && !pluginBadge
    && hasPluginControlOptions
    && !isImageGenerationMode
    && !isVideoGenerationMode
    && !isPptMode
    && (isMarketingTextMode || business === 'agency' || business === 'feedback')
  const showExpertPluginCards = !compact
    && !hidePlugin
    && !pluginBadge
    && !pluginLocked
    && pluginOptions.length > 0
    && !showArkImageTemplates
    && !showArkVideoTemplates
    && !usesPluginDock
  const showPluginControl = !hidePlugin && !showArkImageTemplates && !showExpertPluginCards && hasPluginControlOptions && !usesPluginDock
  const selectedVirtualPortraitAssetIds = useMemo(() => {
    if (isVideoGenerationMode) {
      return new Set(
        listArkVirtualPortraitReferences(videoOptions)
          .map(ref => normalizeArkAssetId(ref.url))
          .filter(Boolean),
      )
    }
    if (isImageGenerationMode) {
      return new Set(
        listArkVirtualPortraitReferences(imageOptions)
          .map(ref => arkVirtualPortraitReferenceAssetId(ref))
          .filter(Boolean),
      )
    }
    return new Set<string>()
  }, [imageOptions, isImageGenerationMode, isVideoGenerationMode, videoOptions])
  const hasSelectedVirtualPortrait = selectedVirtualPortraitAssetIds.size > 0
  const [filePreviewUrls, setFilePreviewUrls] = useState<Record<string, string>>({})
  const prevComposerMaterialsRef = useRef<Array<{ key: string; mention: string }>>([])
  const lastAppliedPortraitRefsSignatureRef = useRef('')
  const draftValueRef = useRef(value)
  const videoMediaTabInitializedRef = useRef(false)
  const imageMediaTabInitializedRef = useRef(false)

  const composerMaterials = useMemo(() => {
    if (!isMaterialMode)
      return [] as Array<{
        key: string
        kind: 'portrait' | 'file'
        mention: string
        label: string
        previewUrl: string
        previewKind: 'image' | 'video' | 'file'
        assetId?: string
        portrait?: ArkVirtualPortrait
        fileIndex?: number
      }>

    const items: Array<{
      key: string
      kind: 'portrait' | 'file'
      mention: string
      label: string
      previewUrl: string
      previewKind: 'image' | 'video' | 'file'
      assetId?: string
      portrait?: ArkVirtualPortrait
      fileIndex?: number
    }> = []

    let index = 0
    const portraitOptions = isVideoGenerationMode ? videoOptions : imageOptions
    for (const ref of listArkVirtualPortraitReferences(portraitOptions)) {
      const assetId = arkVirtualPortraitReferenceAssetId(ref)
      if (!assetId)
        continue
      const portrait = findArkVirtualPortraitByAssetId(arkVirtualPortraits, assetId)
      index += 1
      items.push({
        key: `portrait:${assetId}`,
        kind: 'portrait',
        mention: materialMentionToken(index),
        label: materialLabel(index),
        previewUrl: String(ref.cover_url || (String(ref.url || '').startsWith('http') ? ref.url : '') || portrait?.coverUrl || portrait?.previewUrl || '').trim(),
        previewKind: 'image',
        assetId,
        portrait: portrait || undefined,
      })
    }

    for (let fileIndex = 0; fileIndex < pendingAttachFiles.length; fileIndex += 1) {
      const file = pendingAttachFiles[fileIndex]
      index += 1
      const key = fileMaterialKey(file, fileIndex)
      const kind = previewKindForFile(file)
      items.push({
        key,
        kind: 'file',
        mention: materialMentionToken(index),
        label: materialLabel(index),
        previewUrl: filePreviewUrls[key] || '',
        previewKind: kind,
        fileIndex,
      })
    }

    return items
  }, [arkVirtualPortraits, filePreviewUrls, imageOptions, isMaterialMode, isVideoGenerationMode, pendingAttachFiles, videoOptions])

  const materialMentionTokens = useMemo(
    () => composerMaterials.map(item => item.mention),
    [composerMaterials],
  )

  useEffect(() => {
    if (!isMaterialMode) {
      setFilePreviewUrls(prev => (Object.keys(prev).length ? {} : prev))
      prevComposerMaterialsRef.current = []
      return
    }
    const next: Record<string, string> = {}
    const created: string[] = []
    pendingAttachFiles.forEach((file, fileIndex) => {
      const key = fileMaterialKey(file, fileIndex)
      const kind = previewKindForFile(file)
      if (kind === 'image' || kind === 'video') {
        const url = URL.createObjectURL(file)
        next[key] = url
        created.push(url)
      }
    })
    setFilePreviewUrls(next)
    return () => {
      created.forEach(url => URL.revokeObjectURL(url))
    }
  }, [isMaterialMode, pendingAttachFiles])

  const portraitMaterialsSignature = useMemo(
    () => composerMaterials
      .filter(item => item.kind === 'portrait')
      .map((item, idx) => `${item.assetId}|${materialMentionToken(idx + 1)}`)
      .join(';;'),
    [composerMaterials],
  )

  useEffect(() => {
    if (!isVideoGenerationMode || !videoOptions || !onVideoOptionsChange)
      return
    const portraitMaterials = composerMaterials.filter(item => item.kind === 'portrait')
    const portraitRefs = listArkVirtualPortraitReferences(videoOptions)
    const otherRefs = (videoOptions.reference_images || []).filter(item => !isArkVirtualPortraitReference(item))
    const nextPortraitRefs = portraitMaterials.map((item, idx) => {
      const ref = portraitRefs.find(r => arkVirtualPortraitReferenceAssetId(r) === item.assetId)
      return ref
        ? { ...ref, name: materialMentionToken(idx + 1) }
        : null
    }).filter(Boolean) as VideoReferenceImage[]
    const desiredSignature = `${portraitReferenceSignature(nextPortraitRefs)}::other:${otherRefs.length}`
    const currentSignature = `${portraitReferenceSignature(portraitRefs)}::other:${otherRefs.length}`
    if (desiredSignature === currentSignature || desiredSignature === lastAppliedPortraitRefsSignatureRef.current)
      return
    lastAppliedPortraitRefsSignatureRef.current = desiredSignature
    onVideoOptionsChange({
      ...videoOptions,
      reference_images: nextPortraitRefs.length ? [...otherRefs, ...nextPortraitRefs] : (otherRefs.length ? otherRefs : undefined),
    })
  }, [composerMaterials, isVideoGenerationMode, onVideoOptionsChange, portraitMaterialsSignature, videoOptions])

  useEffect(() => {
    if (!isImageGenerationMode || !imageOptions || !onImageOptionsChange)
      return
    const portraitMaterials = composerMaterials.filter(item => item.kind === 'portrait')
    const portraitRefs = listArkVirtualPortraitReferences(imageOptions)
    const otherRefs = (imageOptions.reference_images || []).filter(item => !isArkVirtualPortraitReference(item))
    const nextPortraitRefs = portraitMaterials.map((item, idx) => {
      const ref = portraitRefs.find(r => arkVirtualPortraitReferenceAssetId(r) === item.assetId)
      return ref
        ? { ...ref, name: materialMentionToken(idx + 1) }
        : null
    }).filter(Boolean) as VideoReferenceImage[]
    const desiredSignature = `${portraitReferenceSignature(nextPortraitRefs)}::other:${otherRefs.length}`
    const currentSignature = `${portraitReferenceSignature(portraitRefs)}::other:${otherRefs.length}`
    if (desiredSignature === currentSignature)
      return
    const next: ImageGenerationOptions = { ...imageOptions }
    if (nextPortraitRefs.length)
      next.reference_images = [...nextPortraitRefs, ...otherRefs]
    else if (otherRefs.length)
      next.reference_images = otherRefs
    else
      delete next.reference_images
    const firstPortraitAssetId = arkVirtualPortraitReferenceAssetId(nextPortraitRefs[0])
    const firstPortrait = firstPortraitAssetId ? findArkVirtualPortraitByAssetId(arkVirtualPortraits, firstPortraitAssetId) : null
    if (firstPortrait) {
      const coverUrl = String(firstPortrait.coverUrl || firstPortrait.previewUrl || '').trim()
      next.virtual_portrait = {
        asset_id: firstPortrait.assetId,
        label: arkVirtualPortraitLabelLocalized(firstPortrait),
        hint: arkVirtualPortraitHintLocalized(firstPortrait),
        cover_url: coverUrl || undefined,
      }
    } else {
      delete next.virtual_portrait
    }
    onImageOptionsChange(next)
  }, [arkVirtualPortraits, composerMaterials, imageOptions, isImageGenerationMode, onImageOptionsChange, portraitMaterialsSignature])

  const composerMaterialsMentionSignature = useMemo(
    () => composerMaterialsSignature(composerMaterials.map(item => ({ key: item.key, mention: item.mention }))),
    [composerMaterials],
  )

  useEffect(() => {
    draftValueRef.current = value
  }, [value])

  useEffect(() => {
    if (!isMaterialMode)
      return
    const prev = prevComposerMaterialsRef.current
    const prevSignature = composerMaterialsSignature(prev)
    if (prevSignature === composerMaterialsMentionSignature) {
      prevComposerMaterialsRef.current = composerMaterials.map(item => ({ key: item.key, mention: item.mention }))
      return
    }
    const prevByKey = new Map(prev.map(item => [item.key, item.mention]))
    const nextByKey = new Map(composerMaterials.map(item => [item.key, item.mention]))
    let nextValue = draftValueRef.current
    let changed = false

    for (const [key, oldMention] of prevByKey.entries()) {
      if (!nextByKey.has(key)) {
        const cleaned = nextValue.replace(new RegExp(`\\s*${escapeMaterialRegex(oldMention)}`, 'g'), '')
        if (cleaned !== nextValue) {
          nextValue = cleaned
          changed = true
        }
      }
    }

    for (const item of composerMaterials) {
      const oldMention = prevByKey.get(item.key)
      if (oldMention && oldMention !== item.mention) {
        const replaced = nextValue.replace(new RegExp(escapeMaterialRegex(oldMention), 'g'), item.mention)
        if (replaced !== nextValue) {
          nextValue = replaced
          changed = true
        }
      }
      if (!prevByKey.has(item.key) && !nextValue.includes(item.mention)) {
        nextValue = nextValue.trim() ? `${nextValue.trim()} ${item.mention}` : item.mention
        changed = true
      }
    }

    if (changed) {
      nextValue = nextValue.replace(/\s{2,}/g, ' ').trim()
      onChange(nextValue)
    }
    prevComposerMaterialsRef.current = composerMaterials.map(item => ({ key: item.key, mention: item.mention }))
  }, [composerMaterials, composerMaterialsMentionSignature, isMaterialMode, onChange])

  const selectedVirtualPortraitAssetId = useMemo(() => {
    const [first] = Array.from(selectedVirtualPortraitAssetIds)
    return first || ''
  }, [selectedVirtualPortraitAssetIds])
  const selectedVirtualPortraitLabel = useMemo(() => {
    const portrait = findArkVirtualPortraitByAssetId(arkVirtualPortraits, selectedVirtualPortraitAssetId)
    if (portrait)
      return formatPortraitLabel(portrait, locale)
    if (isVideoGenerationMode) {
      const ref = selectedArkVirtualPortraitReference(videoOptions)
      return ref ? selectedArkVirtualPortraitLabelLocalized(ref) : ''
    }
    if (isImageGenerationMode) {
      const ref = listArkVirtualPortraitReferences(imageOptions)[0]
      return ref ? selectedArkVirtualPortraitLabelLocalized(ref) : ''
    }
    return ''
  }, [arkVirtualPortraits, imageOptions, isImageGenerationMode, isVideoGenerationMode, locale, selectedVirtualPortraitAssetId, videoOptions])
  const hasArkPortraitFilters = Boolean(arkPortraitSearch.trim()) || arkPortraitGenderFilter !== 'all' || arkPortraitAgeFilter !== 'all' || arkPortraitCountryFilter !== 'all'
  const activeArkPortraitFilterCount = [
    Boolean(arkPortraitSearch.trim()),
    arkPortraitGenderFilter !== 'all',
    arkPortraitAgeFilter !== 'all',
    arkPortraitCountryFilter !== 'all',
  ].filter(Boolean).length
  const arkPortraitCountryOptions = useMemo(() => {
    const countries = new Set<string>()
    for (const portrait of arkVirtualPortraits) {
      const country = portraitCountryValue(portrait)
      if (country)
        countries.add(country)
    }
    return sortPortraitCountries(Array.from(countries), locale)
  }, [arkVirtualPortraits, locale])
  const filteredArkVirtualPortraits = useMemo(() => {
    const query = arkPortraitSearch.trim().toLowerCase()
    return arkVirtualPortraits.filter((portrait) => {
      if (arkPortraitGenderFilter !== 'all' && portraitMetadataValue(portrait, 'gender') !== arkPortraitGenderFilter)
        return false
      if (arkPortraitAgeFilter !== 'all' && portraitMetadataValue(portrait, 'ageBand') !== arkPortraitAgeFilter)
        return false
      if (arkPortraitCountryFilter !== 'all' && portraitCountryValue(portrait) !== arkPortraitCountryFilter)
        return false
      return !query || portraitSearchTokens(portrait, locale).includes(query)
    })
  }, [arkPortraitAgeFilter, arkPortraitCountryFilter, arkPortraitGenderFilter, arkPortraitSearch, arkVirtualPortraits, locale])
  const visibleArkVirtualPortraits = useMemo(
    () => filteredArkVirtualPortraits.slice(0, arkPortraitVisibleCount),
    [arkPortraitVisibleCount, filteredArkVirtualPortraits],
  )
  const hiddenArkPortraitCount = Math.max(0, filteredArkVirtualPortraits.length - visibleArkVirtualPortraits.length)
  const filteredArkImageTemplates = useMemo(
    () => arkImageTemplates.filter(template => template.category === arkImageTemplateCategory),
    [arkImageTemplateCategory, arkImageTemplates],
  )
  const filteredArkVideoTemplates = useMemo(
    () => arkVideoTemplates.filter(template => template.category === arkVideoTemplateCategory),
    [arkVideoTemplateCategory, arkVideoTemplates],
  )
  const selectedArkVideoTemplate = useMemo(
    () => (videoTemplate?.id ? arkVideoTemplates.find(template => template.id === videoTemplate.id) || null : null),
    [arkVideoTemplates, videoTemplate?.id],
  )
  const selectedArkVideoTemplateLabel = selectedArkVideoTemplate
    ? `${arkVideoTemplateCategoryLabels[selectedArkVideoTemplate.category]} / ${selectedArkVideoTemplate.label}`
    : ''
  const currentCommerceBrief = normalizeCommerceBrief(isImageGenerationMode ? imageOptions?.commerce_brief : isVideoGenerationMode ? videoOptions?.commerce_brief : undefined)
  const compactCurrentCommerceBrief = compactCommerceBrief(currentCommerceBrief)
  const hasCommerceBrief = Boolean(compactCurrentCommerceBrief)
  const currentCommerceBriefSignature = commerceBriefSignature(currentCommerceBrief)
  const currentCommerceBriefProfileMatchKey = commerceBriefProfileMatchKey(currentCommerceBrief)
  const recentCommerceBriefSignature = commerceBriefSignature(recentCommerceBrief)
  const canUseRecentCommerceBrief = Boolean(recentCommerceBrief && recentCommerceBriefSignature && recentCommerceBriefSignature !== currentCommerceBriefSignature)
  const commerceBriefProfileCount = commerceBriefProfiles.length
  const currentCommerceBriefProfile = commerceBriefProfiles.find(profile => (
    currentCommerceBriefSignature && (
      commerceBriefSignature(profile.brief) === currentCommerceBriefSignature
      || commerceBriefProfileMatchKey(profile.brief) === currentCommerceBriefProfileMatchKey
    )
  ))
  const commerceBriefTriggerLabel = hasCommerceBrief ? t('composer.commerce.profileFilled') : t('composer.commerce.profileEmpty')
  const commerceBriefModeKey = isImageGenerationMode ? 'image' : isVideoGenerationMode ? 'video' : ''
  const commercePreviewText = showCommerceBriefControl ? commerceTemplateBriefPreview(value) : ''
  const showCommerceBriefPreview = Boolean(commercePreviewText)
  const commerceSendConfirmMarkerCount = commerceTemplateBriefMarkerCount(commerceSendConfirmText)
  const commerceSendConfirmInvalid = !commerceSendConfirmText.trim() || commerceSendConfirmMarkerCount !== 1
  const commerceSendConfirmRiskHints = useMemo(() => {
    const compact = normalizeCommerceBrief(currentCommerceBrief)
    const hints: string[] = []
    if (!compact.specifications)
      hints.push(t('composer.commerce.hint.missingSpec'))
    if (!compact.materials)
      hints.push(t('composer.commerce.hint.missingMaterial'))
    if (!compact.use_cases)
      hints.push(t('composer.commerce.hint.missingScene'))
    if (!compact.compliance_notes)
      hints.push(t('composer.commerce.hint.missingCompliance'))
    return hints
  }, [currentCommerceBriefSignature, t])
  const commerceSendConfirmTemplateLabel = (() => {
    if (isImageGenerationMode && imageOptions?.template_id) {
      const template = findArkImageTemplate(imageOptions.template_id, locale)
      const category = template
        ? arkImageTemplateCategoryLabels[template.category]
        : imageOptions.template_category
          ? arkImageTemplateCategoryLabels[imageOptions.template_category as ArkImageTemplateCategory] || imageOptions.template_category
          : ''
      return [category, template?.label || imageOptions.template_label].filter(Boolean).join(' / ')
    }
    if (isVideoGenerationMode && videoOptions?.template_id) {
      const template = findArkVideoTemplate(videoOptions.template_id, locale)
      const category = template
        ? arkVideoTemplateCategoryLabels[template.category]
        : videoOptions.template_category
          ? arkVideoTemplateCategoryLabels[videoOptions.template_category as ArkVideoTemplateCategory] || videoOptions.template_category
          : ''
      return [category, template?.label || videoOptions.template_label].filter(Boolean).join(' / ')
    }
    return t('composer.commerce.noTemplate')
  })()
  const commerceSendConfirmProductLabel = (() => {
    const product = currentCommerceBrief.product_name || ''
    const brand = currentCommerceBrief.brand || ''
    return [brand, product].filter(Boolean).join(' / ') || t('composer.commerce.noProductName')
  })()
  const commerceSendConfirmParamLabel = (() => {
    if (isImageGenerationMode && imageOptions)
      return tpl('composer.commerce.confirm.paramsCount', imageOptions.ratio, imageOptions.resolution, String(imageOptions.count))
    if (isVideoGenerationMode && videoOptions) {
      const portraitLabel = hasSelectedVirtualPortrait ? t('composer.portrait.title') : t('composer.portrait.none')
      const audioLabel = videoOptions.generate_audio ? t('composer.video.withAudio') : t('composer.video.noAudio')
      const ratioLabel = videoOptions.ratio === 'auto' ? t('composer.video.smartRatio') : videoOptions.ratio
      return tpl('composer.video.summary', ratioLabel, videoOptions.resolution, String(videoOptions.duration), audioLabel, portraitLabel)
    }
    return ''
  })()
  const hasCommerceBriefImportText = Boolean(commerceBriefImportText.trim())
  const hasCommerceBriefImportDraft = Boolean(compactCommerceBrief(commerceBriefImportDraft))
  const commerceAttachmentNames = useMemo(() => normalizeCommerceAttachmentNames(attachmentNames), [attachmentNames])
  const hasCommerceReadableCurrentInput = Boolean(commerceReadableCurrentInputSource(value).trim())
  const hasCommerceAttachmentSignal = hasAttachment || commerceAttachmentNames.length > 0

  useEffect(() => {
    if (!selectedArkVideoTemplate || videoMediaTab === 'portrait')
      return
    setArkVideoTemplateCategory(selectedArkVideoTemplate.category)
  }, [selectedArkVideoTemplate?.category, selectedArkVideoTemplate?.id, videoMediaTab])

  useEffect(() => {
    setCommerceBriefAutoImportDisabled(false)
  }, [commerceBriefModeKey])

  useEffect(() => {
    if (!showCommerceBriefPreview && commerceBriefPreviewOpen)
      setCommerceBriefPreviewOpen(false)
  }, [commerceBriefPreviewOpen, showCommerceBriefPreview])

  useEffect(() => {
    if (!showCommerceBriefPreview && commerceSendConfirmOpen)
      setCommerceSendConfirmOpen(false)
  }, [commerceSendConfirmOpen, showCommerceBriefPreview])

  useEffect(() => {
    if (commerceSendConfirmOpen)
      setCommerceSendConfirmOpen(false)
  }, [commerceBriefModeKey])

  useEffect(() => {
    if (!showCommerceBriefControl || hasCommerceBrief || commerceBriefAutoImportDisabled || !recentCommerceBrief)
      return
    const recentBrief = compactCommerceBrief(recentCommerceBrief)
    if (!recentBrief)
      return
    if (isImageGenerationMode && imageOptions && onImageOptionsChange) {
      onImageOptionsChange({ ...imageOptions, commerce_brief: recentBrief })
      return
    }
    if (isVideoGenerationMode && videoOptions && onVideoOptionsChange) {
      onVideoOptionsChange({ ...videoOptions, count: 1, commerce_brief: recentBrief })
    }
  }, [
    commerceBriefAutoImportDisabled,
    hasCommerceBrief,
    imageOptions,
    isImageGenerationMode,
    isVideoGenerationMode,
    onImageOptionsChange,
    onVideoOptionsChange,
    recentCommerceBrief,
    showCommerceBriefControl,
    videoOptions,
  ])

  const syncArkVirtualPortraits = (force = false) => {
    setArkPortraitLoading(true)
    setArkPortraitMessage('')
    void fetchArkVirtualPortraits(force)
      .then((result) => {
        setArkVirtualPortraits(result.items)
        setArkPortraitStatus(result.status)
        setArkPortraitSource(result.source || '')
        setArkPortraitCredentialRequired(Boolean(result.credentialRequired))
        setArkPortraitMessage(result.items.length ? '' : arkPortraitEmptyMessageLocalized(result.status, result.credentialRequired))
        setArkPortraitVisibleCount(ARK_PORTRAIT_INITIAL_BATCH_SIZE)
      })
      .catch(() => {
        setArkPortraitStatus('sync_failed')
        setArkPortraitSource('ark_list_assets')
        setArkPortraitCredentialRequired(false)
        setArkPortraitMessage(arkPortraitEmptyMessageLocalized('sync_failed'))
      })
      .finally(() => setArkPortraitLoading(false))
  }

  useEffect(() => {
    setArkPortraitVisibleCount(ARK_PORTRAIT_INITIAL_BATCH_SIZE)
  }, [arkPortraitAgeFilter, arkPortraitCountryFilter, arkPortraitGenderFilter, arkPortraitSearch])

  const selectedPlugin = useMemo(() => {
    if (!plugin) return null
    return pluginOptions.find((p) => p.key === plugin) || null
  }, [pluginOptions, plugin])
  const displayPlugin = pluginBadge || selectedPlugin
  const isArkImageTemplateActive = (template: ArkImageTemplate) => {
    const optionEntries = Object.entries(template.imageOptions)
    const requiredEntries = template.prompt
      ? optionEntries
      : optionEntries.filter(([key]) => key === 'style_mode')
    const promptMatches = !template.prompt
      || value === template.prompt
      || (hasCommerceBrief && template.category === 'commerce' && imageOptions?.template_id === template.id)
      || imageOptions?.template_id === template.id
    return (
      promptMatches
      && Boolean(imageOptions)
      && requiredEntries.every(([key, optionValue]) => (
        imageOptions?.[key as keyof ImageGenerationOptions] === optionValue
      ))
      && (!template.pluginKey || plugin === template.pluginKey)
    )
  }
  const selectedImageTemplateById = useMemo(
    () => (imageOptions?.template_id ? arkImageTemplates.find(template => template.id === imageOptions.template_id) || null : null),
    [arkImageTemplates, imageOptions?.template_id],
  )
  const selectedArkImageTemplate = showArkImageTemplates
    ? arkImageTemplates.find(template => isArkImageTemplateActive(template)) || null
    : null
  const pluginDockTriggerLabel = displayPlugin?.label
    || (usesRemotePlugins && remotePluginLoading ? t('composer.plugin.loading') : '')
    || effectivePluginTitle
  const imageTemplateTriggerLabel = selectedImageTemplateById?.label
    || selectedArkImageTemplate?.label
    || selectedPlugin?.label
    || t('composer.image.templateFallback')
  const videoTemplateTriggerLabel = selectedArkVideoTemplate
    ? tpl('composer.ark.template.video.selected', selectedArkVideoTemplateLabel)
    : t('composer.video.templateFallback')

  useEffect(() => {
    if (!selectedArkImageTemplate || imageMediaTab === 'portrait')
      return
    setArkImageTemplateCategory(selectedArkImageTemplate.category)
  }, [selectedArkImageTemplate?.category, selectedArkImageTemplate?.id, imageMediaTab])

  const selectedMode = useMemo(() => {
    if (!mode) return null
    return resolvedModes.find((m) => m.key === mode) || null
  }, [resolvedModes, mode])

  useEffect(() => {
    if (!usesRemotePlugins || !mode)
      return
    if (hasRemotePluginResult)
      return
    let cancelled = false
    setRemotePluginLoading(true)
    void fetchImageSkills(cfg.key, mode)
      .then((items) => {
        if (cancelled) return
        setRemotePluginsByMode(prev => ({
          ...prev,
          [remotePluginKey]: items.map(skill => imageSkillToPluginItem(skill, locale)),
        }))
      })
      .catch(() => {
        if (cancelled) return
        setRemotePluginsByMode(prev => ({ ...prev, [remotePluginKey]: [] }))
        toast.warning(tpl('composer.skill.loadFailedNamed', mode === 'text' ? t('composer.skill.text') : t('composer.skill.image')))
      })
      .finally(() => {
        if (!cancelled)
          setRemotePluginLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [cfg.key, hasRemotePluginResult, locale, mode, remotePluginKey, usesRemotePlugins])

  useEffect(() => {
    setPluginDockOpen(false)
  }, [business, mode, pluginLocked, pluginBadge, hidePlugin])

  useEffect(() => {
    if (!showArkVirtualPortraits)
      return
    syncArkVirtualPortraits(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showArkVirtualPortraits])

  useEffect(() => {
    if (!isVideoGenerationMode) {
      videoMediaTabInitializedRef.current = false
      lastAppliedPortraitRefsSignatureRef.current = ''
      setVideoMediaDrawerOpen(false)
      return
    }
    if (videoMediaTabInitializedRef.current)
      return
    videoMediaTabInitializedRef.current = true
    if (showArkVideoTemplates && !showArkVirtualPortraits) {
      setVideoMediaTab(DEFAULT_ARK_VIDEO_TEMPLATE_CATEGORY)
      setArkVideoTemplateCategory(DEFAULT_ARK_VIDEO_TEMPLATE_CATEGORY)
    } else if (!showArkVideoTemplates && showArkVirtualPortraits) {
      setVideoMediaTab('portrait')
    }
  }, [isVideoGenerationMode, showArkVideoTemplates, showArkVirtualPortraits])

  useEffect(() => {
    if (!isImageGenerationMode) {
      imageMediaTabInitializedRef.current = false
      setImageMediaDrawerOpen(false)
      return
    }
    if (imageMediaTabInitializedRef.current)
      return
    imageMediaTabInitializedRef.current = true
    if (showArkImageTemplates && !showArkVirtualPortraits) {
      setImageMediaTab(DEFAULT_ARK_IMAGE_TEMPLATE_CATEGORY)
      setArkImageTemplateCategory(DEFAULT_ARK_IMAGE_TEMPLATE_CATEGORY)
    } else if (!showArkImageTemplates && showArkVirtualPortraits) {
      setImageMediaTab('portrait')
    }
  }, [isImageGenerationMode, showArkImageTemplates, showArkVirtualPortraits])

  useEffect(() => {
    setArkPortraitVisibleCount(ARK_PORTRAIT_INITIAL_BATCH_SIZE)
  }, [showArkVirtualPortraits])

  useEffect(() => {
    if (!usesRemotePlugins || pluginLocked || !onPluginChange || remotePluginLoading || !pluginOptions.length)
      return
    if (plugin && pluginOptions.some(item => item.key === plugin))
      return
    const preferred = mode ? cfg.defaultPluginByMode?.[mode] : ''
    const fallback = pluginOptions.find(item => item.key === preferred)?.key || pluginOptions[0]?.key || null
    if (fallback)
      onPluginChange(fallback)
  }, [cfg.defaultPluginByMode, mode, onPluginChange, plugin, pluginLocked, pluginOptions, remotePluginLoading, usesRemotePlugins])

  useEffect(() => {
    const keys = new Set(resolvedModes.map((m) => m.key))
    if (mode && !keys.has(mode)) {
      onModeChange?.(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business, plugin, resolvedModes])

  useEffect(() => {
    if (!plugin || !onPluginChange)
      return
    if (usesRemotePlugins && remotePluginLoading)
      return
    if (pluginOptions.some(item => item.key === plugin))
      return
    if (imageOptions?.template_id || videoOptions?.template_id)
      return
    onPluginChange(null)
  }, [imageOptions?.template_id, onPluginChange, plugin, pluginOptions, remotePluginLoading, usesRemotePlugins, videoOptions?.template_id])

  const requiredModelCapability = useMemo<ModelOption['capability'] | null>(() => {
    if (business === 'marketing') return 'reasoning'
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
      base = localizedModels
    }
    else {
      const filtered = localizedModels.filter((m) => m.capability === requiredModelCapability)
      base = filtered.length ? filtered : localizedModels
    }
    if (business === 'marketing') {
      const allowed = new Set<string>(MARKETING_REASONING_MODEL_KEYS)
      const ark = base.filter(m => allowed.has(m.key))
      if (ark.length)
        base = ark
    }
    if (business === 'software' && plugin === 'self') {
      const allowed = new Set<string>(PROGRAMMER_HERMES_MODEL_KEYS)
      base = base.filter(m => allowed.has(m.key))
    }
    if (business === 'consultant' && consultantModelAllowlist?.length) {
      const allow = new Set(consultantModelAllowlist)
      const narrowed = base.filter(m => allow.has(m.key))
      if (narrowed.length)
        base = narrowed
    }
    const hasAvailability = base.some(m => Boolean(modelAvailability[m.key]))
    if (hasAvailability)
      base = base.filter(m => modelAvailability[m.key]?.available === true)
    return base
  }, [requiredModelCapability, business, plugin, consultantModelAllowlist, modelAvailability, localizedModels])

  const selectedModel = useMemo(() => {
    return modelOptions.find((m) => m.key === model) || modelOptions[0] || null
  }, [modelOptions, model])

  const selectedModelAvailability = selectedModel ? modelAvailability[selectedModel.key] : null

  const generationModelOptions = useMemo(() => {
    if (business !== 'marketing') return []
    const keys = mode === 'image'
      ? MARKETING_IMAGE_MODEL_KEYS
      : mode === 'video'
        ? MARKETING_VIDEO_MODEL_KEYS
        : []
    const base = keys
      .map((key) => localizedModels.find((m) => m.key === key))
      .filter((m): m is ModelOption => Boolean(m))
    const hasAvailability = base.some(m => Boolean(modelAvailability[m.key]))
    if (!hasAvailability)
      return base
    return base.filter(m => modelAvailability[m.key]?.available === true)
  }, [business, mode, modelAvailability, localizedModels])

  const selectedGenerationModel = useMemo(() => {
    return generationModelOptions.find((m) => m.key === generationModel) || generationModelOptions[0] || null
  }, [generationModelOptions, generationModel])

  const selectedGenerationAvailability = selectedGenerationModel ? modelAvailability[selectedGenerationModel.key] : null

  const isHardUnavailable = (availability: AgentModelAvailability | null | undefined) => {
    if (!availability || availability.available) return false
    const status = String(availability.status || '').toLowerCase()
    const reason = String(availability.reason || '').toLowerCase()
    if (status === 'unconfigured' || reason.includes('api key')) return false
    return true
  }
  const selectedImageSkill = isImageGenerationMode ? selectedPlugin : null
  const selectedTextSkill = business === 'marketing' && mode === 'text' ? selectedPlugin : null
  const selectedTextSkillNeedsAttachment = Boolean(selectedTextSkill?.requiresVision)
  const showCopyLanguageControl = isMarketingTextMode && Boolean(onCopyLanguageChange)
  const normalizedCopyLanguage = normalizeCopyLanguage(copyLanguage)
  const selectedCopyLanguageOption = copyLanguageOptions.find(item => item.key === normalizedCopyLanguage) || null
  const rawImageTemplateRecommendedCount = selectedImageTemplateById?.imageOptions.count
  const imageReferenceCount = Math.max(0, Math.round(referenceImageCount || 0))
  const imageOutputMax = useMemo(
    () => maxOutputCountForReferences(imageReferenceCount),
    [imageReferenceCount],
  )
  const clampComposerImageCount = (value: number) => clampImageCount(value, imageOutputMax)
  const imageBudgetUsed = imageReferenceCount + (imageOptions?.count || 1)
  const imageTemplateRecommendedCount = typeof rawImageTemplateRecommendedCount === 'number'
    ? clampComposerImageCount(rawImageTemplateRecommendedCount)
    : null
  const showImageTemplateRecommendation = Boolean(
    imageOptions
    && imageTemplateRecommendedCount
    && imageOptions.count !== imageTemplateRecommendedCount,
  )
  const estimatedImagePlatformPoints = useMemo(
    () => isImageGenerationMode ? estimateImagePlatformPoints(imageOptions) : 0,
    [imageOptions, isImageGenerationMode],
  )
  const estimatedVideoPlatformPoints = useMemo(
    () => isVideoGenerationMode ? estimateVideoPlatformPoints(videoOptions, hasVideoInput, selectedGenerationModel?.key) : 0,
    [hasVideoInput, isVideoGenerationMode, selectedGenerationModel?.key, videoOptions],
  )
  const mediaSendBlockReason = (() => {
    if (isImageGenerationMode) {
      if (!imageOptions) return t('composer.send.templateUnavailable')
      if (imageOptions.template_id && !selectedImageTemplateById) return t('composer.send.templateInvalid')
      if (imageOptionsMissingArkPortraitCover(imageOptions))
        return t('composer.send.portraitCoverMissing')
      if (generationOptionsHaveArkAssetReference(imageOptions) && !imageModelSupportsArkAssetReference(generationModel))
        return t('composer.send.assetReferenceUnsupported')
      if (imageOptions.count < IMAGE_COUNT_MIN || imageOptions.count > imageOutputMax || imageBudgetUsed > ARK_IMAGE_TOTAL_BUDGET)
        return t('composer.send.invalidImageCount')
    }
    if (isVideoGenerationMode) {
      if (!videoOptions) return t('composer.send.templateUnavailable')
      if (videoOptions.template_id && !selectedArkVideoTemplate) return t('composer.send.templateInvalid')
      if (generationOptionsHaveArkAssetReference(videoOptions) && !videoModelSupportsArkAssetReference(generationModel))
        return t('composer.send.assetReferenceUnsupported')
    }
    return ''
  })()

  useEffect(() => {
    if (!isImageGenerationMode || !imageOptions || !onImageOptionsChange)
      return
    const nextCount = clampComposerImageCount(imageOptions.count)
    if (nextCount === imageOptions.count)
      return
    onImageOptionsChange({ ...imageOptions, count: nextCount })
  }, [imageOutputMax, isImageGenerationMode])

  const patchImageOptions = (patch: Partial<ImageGenerationOptions>) => {
    if (!imageOptions || !onImageOptionsChange) return
    const nextPatch = { ...patch }
    if (typeof nextPatch.count === 'number')
      nextPatch.count = clampComposerImageCount(nextPatch.count)
    const nextOptions: ImageGenerationOptions = { ...imageOptions, ...nextPatch }
    const hasRoleCountsPatch = Object.prototype.hasOwnProperty.call(nextPatch, 'role_counts')
    if ((typeof nextPatch.count === 'number' && !hasRoleCountsPatch) || (hasRoleCountsPatch && !nextPatch.role_counts))
      delete nextOptions.role_counts
    onImageOptionsChange(nextOptions)
  }

  const attachReferenceImage = (file: File) => {
    if (!isImageGenerationMode || !isSupportedReferenceImage(file)) {
      onAttachFile?.(file)
      return
    }
    if (imageReferenceCount >= ARK_IMAGE_MAX_REFERENCE) {
      toast.warning(tpl('composer.image.quota.maxReference', String(ARK_IMAGE_MAX_REFERENCE)))
      return
    }
    const outputCount = imageOptions?.count || 1
    if (imageReferenceCount + 1 + outputCount > ARK_IMAGE_TOTAL_BUDGET) {
      toast.warning(tpl(
        'composer.image.quota.attachBlocked',
        String(imageReferenceCount),
        String(outputCount),
        String(ARK_IMAGE_TOTAL_BUDGET),
      ))
      return
    }
    onAttachFile?.(file)
  }

  const patchImageResolution = (resolution: ImageGenerationOptions['resolution']) => {
    if (!imageOptions || !onImageOptionsChange) return
    onImageOptionsChange({ ...imageOptions, resolution, ...imageDimensions(resolution, imageOptions.ratio) })
  }

  const patchImageRatio = (ratio: ImageGenerationOptions['ratio']) => {
    if (!imageOptions || !onImageOptionsChange) return
    onImageOptionsChange({ ...imageOptions, ratio, ...imageDimensions(imageOptions.resolution, ratio) })
  }

  const patchVideoOptions = (patch: Partial<VideoGenerationOptions>) => {
    if (!videoOptions || !onVideoOptionsChange) return
    onVideoOptionsChange({ ...videoOptions, ...patch, frame_mode: 'first', count: 1 })
  }

  const rememberCommerceBrief = (brief?: CommerceBrief) => {
    if (!brief)
      return
    setRecentCommerceBrief(brief)
    writeStoredCommerceBrief(brief)
  }

  const setCommerceBriefForCurrentMode = (brief?: Partial<CommerceBrief> | null, remember = true) => {
    const nextBrief = compactCommerceBrief(brief)
    if (nextBrief && remember)
      rememberCommerceBrief(nextBrief)
    if (isImageGenerationMode && imageOptions && onImageOptionsChange) {
      const next: ImageGenerationOptions = { ...imageOptions }
      if (nextBrief)
        next.commerce_brief = nextBrief
      else
        delete next.commerce_brief
      onImageOptionsChange(next)
      return
    }
    if (isVideoGenerationMode && videoOptions && onVideoOptionsChange) {
      const next: VideoGenerationOptions = { ...videoOptions, count: 1 }
      if (nextBrief)
        next.commerce_brief = nextBrief
      else
        delete next.commerce_brief
      onVideoOptionsChange(next)
    }
  }

  const patchCommerceBrief = (patch: Partial<CommerceBrief>) => {
    setCommerceBriefAutoImportDisabled(false)
    setCommerceBriefForCurrentMode({ ...currentCommerceBrief, ...patch })
  }

  const useRecentCommerceBrief = () => {
    const recentBrief = compactCommerceBrief(recentCommerceBrief)
    if (!recentBrief)
      return
    setCommerceBriefAutoImportDisabled(false)
    setCommerceBriefForCurrentMode(recentBrief, false)
  }

  const saveCommerceBriefProfile = () => {
    const currentBrief = compactCommerceBrief(currentCommerceBrief)
    if (!currentBrief) {
      toast.warning(t('composer.commerce.toast.fillProfile'))
      return
    }
    const nextProfiles = upsertCommerceBriefProfile(commerceBriefProfiles, currentBrief)
    setCommerceBriefProfiles(nextProfiles)
    writeStoredCommerceBriefProfiles(nextProfiles)
    rememberCommerceBrief(currentBrief)
    setCommerceBriefLibraryOpen(true)
    toast.info(t('composer.commerce.toast.saved'))
  }

  const applyCommerceBriefProfile = (profile: CommerceBriefProfile) => {
    const profileBrief = compactCommerceBrief(profile.brief)
    if (!profileBrief)
      return
    setCommerceBriefAutoImportDisabled(false)
    setCommerceBriefForCurrentMode(profileBrief)
    setCommerceBriefLibraryOpen(false)
  }

  const deleteCommerceBriefProfile = (profileId: string) => {
    const nextProfiles = commerceBriefProfiles.filter(profile => profile.id !== profileId)
    setCommerceBriefProfiles(nextProfiles)
    writeStoredCommerceBriefProfiles(nextProfiles)
    toast.info(t('composer.commerce.toast.deleted'))
  }

  const setCommerceDraftFromSource = (source: string, sources: string[], extraWarnings: string[] = []) => {
    const draft = extractCommerceBriefDraft(source)
    setCommerceBriefImportDraft(draft)
    setCommerceBriefImportSources(sources)
    const missingHints = commerceBriefDraftMissingHintsLocalized(draft)
    setCommerceBriefImportWarnings([...extraWarnings, ...missingHints])
    if (!compactCommerceBrief(draft))
      toast.warning(t('composer.commerce.toast.noData'))
  }

  const extractCommerceBriefImport = () => {
    const source = commerceBriefImportText.trim()
    if (!source) {
      toast.warning(t('composer.commerce.toast.pasteFirst'))
      return
    }
    setCommerceDraftFromSource(source, [t('composer.commerce.source.import')])
  }

  const extractCommerceBriefFromCurrentInput = () => {
    const source = commerceReadableCurrentInputSource(value).trim()
    if (!source) {
      toast.warning(t('composer.commerce.toast.noExtract'))
      return
    }
    setCommerceDraftFromSource(source, [t('composer.commerce.source.input')])
  }

  const extractCommerceBriefFromAttachments = () => {
    const textSource = [commerceBriefImportText.trim(), commerceReadableCurrentInputSource(value).trim()].filter(Boolean).join('\n')
    const attachmentSummary = commerceAttachmentNames.length
      ? commerceAttachmentNames.map(name => tpl('composer.commerce.toast.attachmentFilename', name)).join('\n')
      : ''
    const sources = [
      hasCommerceBriefImportText ? t('composer.commerce.source.import') : '',
      hasCommerceReadableCurrentInput ? t('composer.commerce.source.input') : '',
      hasCommerceAttachmentSignal ? t('composer.commerce.source.attachment') : '',
    ].filter(Boolean)
    if (!hasCommerceAttachmentSignal) {
      toast.warning(t('composer.commerce.toast.uploadFirst'))
      return
    }
    if (!textSource) {
      setCommerceBriefImportSources(sources.length ? sources : [t('composer.commerce.source.attachment')])
      setCommerceBriefImportWarnings([
        t('composer.commerce.toast.noOcr'),
        ...commerceAttachmentNames.map(name => tpl('composer.commerce.toast.seenFilename', name)),
      ])
      setCommerceBriefImportDraft({})
      toast.warning(t('composer.commerce.toast.noOcr'))
      return
    }
    setCommerceDraftFromSource(
      [textSource, attachmentSummary].filter(Boolean).join('\n'),
      sources,
      hasCommerceAttachmentSignal ? [t('composer.commerce.toast.ocrNote')] : [],
    )
  }

  const patchCommerceBriefImportDraft = (patch: Partial<CommerceBrief>) => {
    setCommerceBriefImportDraft(normalizeCommerceBrief({ ...commerceBriefImportDraft, ...patch }))
  }

  const applyCommerceBriefImportDraft = () => {
    const draft = compactCommerceBrief(commerceBriefImportDraft)
    if (!draft)
      return
    setCommerceBriefAutoImportDisabled(false)
    setCommerceBriefForCurrentMode(mergeCommerceBriefDraft(currentCommerceBrief, draft))
    setCommerceBriefImportOpen(false)
  }

  const clearCommerceBrief = () => {
    setCommerceBriefAutoImportDisabled(true)
    setCommerceBriefForCurrentMode(undefined, false)
  }

  const applyArkImageTemplate = (template: ArkImageTemplate) => {
    if (disabled) return
    const strippedValue = stripTemplateIntentBlock(value)
    const currentValueForTemplate = arkImageTemplates.some(item => item.prompt && item.prompt.trim() === value.trim())
      ? ''
      : strippedValue
    const usesCommerceBriefMerge = hasCommerceBrief && template.category === 'commerce'
    const templatePrompt = usesCommerceBriefMerge
      ? composeCommerceTemplatePrompt({
          currentValue: currentValueForTemplate,
          templateLabel: template.label,
          templateCategoryLabel: arkImageTemplateCategoryLabels[template.category],
          templatePrompt: template.prompt,
          commerceBrief: currentCommerceBrief,
        })
      : mergeTemplateIntentIntoPrompt(currentValueForTemplate, template.prompt)
    let nextPrompt = (template.prompt || usesCommerceBriefMerge) ? templatePrompt : stripPortraitBlock(value)
    const cohesionSuffix = buildTemplateCohesionSuffix({
      hasReferenceAssets: imageReferenceCount > 0,
      locale,
    })
    if (cohesionSuffix && nextPrompt)
      nextPrompt = `${nextPrompt}\n\n${cohesionSuffix}`
    if ((template.prompt || usesCommerceBriefMerge) && nextPrompt)
      onChange(nextPrompt)
    if (template.generationModel && generationModelOptions.some(m => m.key === template.generationModel && !isHardUnavailable(modelAvailability[m.key])))
      onGenerationModelChange?.(template.generationModel)
    if (imageOptions && onImageOptionsChange) {
      const resolution = template.imageOptions.resolution || imageOptions.resolution
      const ratio = template.imageOptions.ratio || imageOptions.ratio
      const { role_counts: _staleRoleCounts, image_skill: _staleImageSkill, ...baseImageOptions } = imageOptions
      onImageOptionsChange({
        ...baseImageOptions,
        style_mode: 'rich',
        ...template.imageOptions,
        ...imageDimensions(resolution, ratio),
        count: clampComposerImageCount(template.imageOptions.count ?? imageOptions.count),
        template_id: template.id,
        template_label: template.label,
        template_category: template.category,
        image_skill: template.pluginKey || undefined,
      })
    }
  }

  const applyArkVideoTemplate = (template: ArkVideoTemplate) => {
    if (disabled || videoTemplateLocked) return
    let nextVideoPrompt = stripPortraitBlock(value)
    const hasVideoCreativeRefs = Boolean(
      (videoOptions?.reference_assets || []).length
      || (videoOptions?.reference_images || []).some((item) => {
        const url = typeof item?.url === 'string' ? item.url.trim() : ''
        return item?.source !== 'ark_virtual_portrait' && !url.startsWith('asset://')
      }),
    )
    const videoCohesionSuffix = buildTemplateCohesionSuffix({
      hasReferenceAssets: hasVideoCreativeRefs,
      locale,
    })
    if (videoCohesionSuffix) {
      const base = nextVideoPrompt.trim() || stripPortraitBlock(value)
      nextVideoPrompt = base ? `${base}\n\n${videoCohesionSuffix}` : videoCohesionSuffix
    }
    if (nextVideoPrompt.trim() && nextVideoPrompt.trim() !== value.trim())
      onChange(nextVideoPrompt)
    onVideoTemplateChange?.(arkVideoTemplateSelection(template))
    if (videoOptions && onVideoOptionsChange) {
      onVideoOptionsChange({
        ...videoOptions,
        style_mode: 'rich',
        ...template.videoOptions,
        frame_mode: 'first',
        count: 1,
        template_id: template.id,
        template_label: template.label,
        template_category: template.category,
      })
    }
  }

  const appendMaterialMention = (mention: string) => {
    const token = mention.trim()
    if (!token || value.includes(token))
      return
    const trimmed = value.trim()
    onChange(trimmed ? `${trimmed} ${token}` : token)
  }

  const removeMaterialMention = (mention: string) => {
    const token = mention.trim()
    if (!token)
      return
    const next = value
      .replace(new RegExp(`\\s*${escapeMaterialRegex(token)}`, 'g'), '')
      .replace(/\s{2,}/g, ' ')
      .trim()
    if (next !== value.trim())
      onChange(next)
  }

  const insertMaterialMentionAtCursor = (mention: string) => {
    const token = mention.trim()
    if (!token || disabled)
      return
    const el = taRef.current
    if (!el) {
      appendMaterialMention(token)
      return
    }
    const start = el.selectionStart ?? value.length
    const end = el.selectionEnd ?? value.length
    const before = value.slice(0, start)
    const after = value.slice(end)
    const spacerBefore = before && !/\s$/.test(before) ? ' ' : ''
    const spacerAfter = after && !/^\s/.test(after) ? ' ' : ''
    const next = `${before}${spacerBefore}${token}${spacerAfter}${after}`.replace(/\s{2,}/g, ' ').trim()
    onChange(next)
    requestAnimationFrame(() => {
      const pos = (before + spacerBefore + token).length
      el.focus()
      el.setSelectionRange(pos, pos)
    })
  }

  const applyArkVirtualPortrait = (input: string, portrait?: ArkVirtualPortrait) => {
    if (disabled || !portrait) return
    const url = arkAssetUrl(input)
    if (!url) {
      toast.error(t('composer.send.noPortraitAsset'))
      return
    }
    const label = arkVirtualPortraitLabelLocalized(portrait)
    const coverUrl = String(portrait.coverUrl || portrait.previewUrl || '').trim()
    if (isVideoGenerationMode && videoOptions && onVideoOptionsChange) {
      const assetId = normalizeArkAssetId(portrait.assetId)
      const portraitRefs = listArkVirtualPortraitReferences(videoOptions)
      const otherRefs = (videoOptions.reference_images || []).filter(item => !isArkVirtualPortraitReference(item))
      const alreadySelected = portraitRefs.some(ref => arkVirtualPortraitReferenceAssetId(ref) === assetId)
      if (alreadySelected) {
        const removedMention = portraitRefs.find(ref => arkVirtualPortraitReferenceAssetId(ref) === assetId)?.name || ''
        const nextPortraitRefs = portraitRefs.filter(ref => arkVirtualPortraitReferenceAssetId(ref) !== assetId)
        const next: VideoGenerationOptions = {
          ...videoOptions,
          frame_mode: 'first',
          count: 1,
          reference_images: nextPortraitRefs.length ? [...otherRefs, ...nextPortraitRefs] : (otherRefs.length ? otherRefs : undefined),
        }
        if (normalizeArkAssetId(videoOptions.virtual_portrait?.asset_id) === assetId)
          delete next.virtual_portrait
        onVideoOptionsChange(next)
        if (removedMention)
          removeMaterialMention(removedMention)
        return
      }
      const nextPortraitRefs: VideoReferenceImage[] = [
        ...portraitRefs,
        {
          url,
          role: 'reference_image',
          name: materialMentionToken(portraitRefs.length + 1),
          cover_url: coverUrl || undefined,
          source: 'ark_virtual_portrait',
        },
      ]
      onVideoOptionsChange({
        ...videoOptions,
        frame_mode: 'first',
        count: 1,
        virtual_portrait: {
          asset_id: portrait.assetId,
          label,
          hint: arkVirtualPortraitHintLocalized(portrait),
          cover_url: coverUrl || undefined,
        },
        reference_images: [...otherRefs, ...nextPortraitRefs],
      })
      appendMaterialMention(materialMentionToken(portraitRefs.length + 1))
      return
    }
    if (isImageGenerationMode && !coverUrl) {
      toast.error(t('composer.send.portraitCoverMissing'))
      return
    }
    if (isImageGenerationMode && imageOptions && onImageOptionsChange) {
      const assetId = normalizeArkAssetId(portrait.assetId)
      const imagePortraitReferenceUrl = coverUrl || url
      const portraitRefs = listArkVirtualPortraitReferences(imageOptions)
      const otherRefs = (imageOptions.reference_images || []).filter(item => !isArkVirtualPortraitReference(item))
      const alreadySelected = portraitRefs.some(ref => arkVirtualPortraitReferenceAssetId(ref) === assetId)
      if (alreadySelected) {
        const removedMention = portraitRefs.find(ref => arkVirtualPortraitReferenceAssetId(ref) === assetId)?.name || ''
        const nextPortraitRefs = portraitRefs
          .filter(ref => arkVirtualPortraitReferenceAssetId(ref) !== assetId)
          .map((ref, index) => ({ ...ref, name: materialMentionToken(index + 1) }))
        const next: ImageGenerationOptions = { ...imageOptions }
        if (nextPortraitRefs.length)
          next.reference_images = [...nextPortraitRefs, ...otherRefs]
        else if (otherRefs.length)
          next.reference_images = otherRefs
        else
          delete next.reference_images
        const firstAssetId = arkVirtualPortraitReferenceAssetId(nextPortraitRefs[0])
        const firstPortrait = firstAssetId ? findArkVirtualPortraitByAssetId(arkVirtualPortraits, firstAssetId) : null
        if (firstPortrait) {
          const firstCoverUrl = String(firstPortrait.coverUrl || firstPortrait.previewUrl || '').trim()
          next.virtual_portrait = {
            asset_id: firstPortrait.assetId,
            label: arkVirtualPortraitLabelLocalized(firstPortrait),
            hint: arkVirtualPortraitHintLocalized(firstPortrait),
            cover_url: firstCoverUrl || undefined,
          }
        } else {
          delete next.virtual_portrait
        }
        onImageOptionsChange(next)
        if (removedMention)
          removeMaterialMention(removedMention)
        return
      }
      const nextPortraitRefs: VideoReferenceImage[] = [
        ...portraitRefs,
        {
          url: imagePortraitReferenceUrl,
          role: 'reference_image',
          name: materialMentionToken(portraitRefs.length + 1),
          cover_url: coverUrl || undefined,
          asset_id: portrait.assetId,
          source: 'ark_virtual_portrait',
        },
      ]
      onImageOptionsChange({
        ...imageOptions,
        virtual_portrait: imageOptions.virtual_portrait || {
          asset_id: portrait.assetId,
          label,
          hint: arkVirtualPortraitHintLocalized(portrait),
          cover_url: coverUrl || undefined,
        },
        reference_images: [...nextPortraitRefs, ...otherRefs],
      })
      appendMaterialMention(materialMentionToken(portraitRefs.length + 1))
      return
    }
  }

  const clearArkVirtualPortrait = () => {
    if (isVideoGenerationMode && videoOptions && onVideoOptionsChange) {
      const portraitRefs = listArkVirtualPortraitReferences(videoOptions)
      const rest = (videoOptions.reference_images || []).filter(item => !isArkVirtualPortraitReference(item))
      const next: VideoGenerationOptions = { ...videoOptions, count: 1 }
      if (rest.length)
        next.reference_images = rest
      else
        delete next.reference_images
      delete next.virtual_portrait
      onVideoOptionsChange(next)
      portraitRefs.forEach(ref => {
        if (ref.name)
          removeMaterialMention(ref.name)
      })
    }
    if (isImageGenerationMode && imageOptions && onImageOptionsChange) {
      const rest = (imageOptions.reference_images || []).filter((item) => {
        const itemUrl = typeof item?.url === 'string' ? item.url.trim() : ''
        return item?.source !== 'ark_virtual_portrait' && !itemUrl.startsWith('asset://')
      })
      const next: ImageGenerationOptions = { ...imageOptions }
      delete next.virtual_portrait
      if (rest.length)
        next.reference_images = rest
      else
        delete next.reference_images
      onImageOptionsChange(next)
    }
  }

  const clearArkPortraitFilters = () => {
    setArkPortraitSearch('')
    setArkPortraitGenderFilter('all')
    setArkPortraitAgeFilter('all')
    setArkPortraitCountryFilter('all')
    setArkPortraitFiltersOpen(false)
  }

  const loadMoreArkPortraits = () => {
    setArkPortraitVisibleCount(count => Math.min(filteredArkVirtualPortraits.length, count + ARK_PORTRAIT_INCREMENT_SIZE))
  }

  const handleArkPortraitListScroll = (event: UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget
    if (hiddenArkPortraitCount <= 0)
      return
    if (target.scrollTop + target.clientHeight >= target.scrollHeight - 96)
      loadMoreArkPortraits()
  }

  useEffect(() => {
    if ((!isVideoGenerationMode && !isImageGenerationMode) || !showArkVirtualPortraits)
      return
    const sentinel = arkPortraitLoadMoreRef.current
    if (!sentinel || hiddenArkPortraitCount <= 0)
      return
    const scrollRoot = sentinel.parentElement
    const observer = new IntersectionObserver((entries) => {
      if (entries.some(entry => entry.isIntersecting))
        loadMoreArkPortraits()
    }, {
      root: scrollRoot && scrollRoot.scrollHeight > scrollRoot.clientHeight ? scrollRoot : null,
      rootMargin: '120px 0px',
    })
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [
    hiddenArkPortraitCount,
    isImageGenerationMode,
    isVideoGenerationMode,
    showArkVirtualPortraits,
    visibleArkVirtualPortraits.length,
    filteredArkVirtualPortraits.length,
  ])

  const patchPptOptions = (patch: Partial<PptComposerOptions>) => {
    if (!pptOptions || !onPptOptionsChange) return
    onPptOptionsChange({ ...pptOptions, ...patch })
  }

  useEffect(() => {
    if (!isVideoGenerationMode || !videoOptions || !onVideoOptionsChange) return
    if (selectedGenerationModel?.key === 'seedance-2.0-fast' && videoOptions.resolution === '1080p')
      onVideoOptionsChange({ ...videoOptions, resolution: '720p' })
  }, [isVideoGenerationMode, onVideoOptionsChange, selectedGenerationModel?.key, videoOptions])

  useEffect(() => {
    if (!effectiveNeedsModel || !modelOptions.length)
      return
    const current = localizedModels.find((m) => m.key === model)
    if (requiredModelCapability) {
      if (!current || current.capability !== requiredModelCapability || !modelOptions.some(m => m.key === current.key))
        onModelChange?.(modelOptions[0]?.key || null)
      return
    }
    if (model && !modelOptions.some(m => m.key === model))
      onModelChange?.(modelOptions[0]?.key || null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, model, requiredModelCapability, modelOptions, effectiveNeedsModel, business, consultantModelAllowlist, localizedModels])

  useEffect(() => {
    if (!generationModelOptions.length) {
      if (generationModel)
        onGenerationModelChange?.(null)
      return
    }
    if (!generationModel || !generationModelOptions.some(m => m.key === generationModel))
      onGenerationModelChange?.(generationModelOptions[0]?.key || null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business, mode, generationModel, generationModelOptions])

  useEffect(() => {
    if (!copyLanguagePopOpen)
      return
    setCopyLanguageCustom(selectedCopyLanguageOption ? '' : normalizedCopyLanguage)
  }, [copyLanguagePopOpen, normalizedCopyLanguage, selectedCopyLanguageOption])

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
    if (pluginLocked) return
    onPluginChange?.(p.key)
    setPluginPopOpen(false)
  }

  const pickCopyLanguage = (value: string) => {
    onCopyLanguageChange?.(normalizeCopyLanguage(value))
    setCopyLanguagePopOpen(false)
  }

  const submitCustomCopyLanguage = (event: FormEvent) => {
    event.preventDefault()
    const next = normalizeCopyLanguage(copyLanguageCustom)
    if (next === COPY_LANGUAGE_AUTO) {
      toast.warning(t('composer.send.enterLanguage'))
      return
    }
    pickCopyLanguage(next)
  }

  const pluginStyle = (p: PluginItem): CSSProperties => (
    p.color ? { '--cx-plugin-brand': p.color } as CSSProperties : {}
  )

  const pickMode = (m: ModeItem) => {
    if (lockSelections || lockMode) return
    onModeChange?.(m.key)
    if (m.warning) toast.warning(m.warning)
    else if (m.key === 'xiaowan') toast.info(t('composer.xiaowan.selfService'))
    setModePopOpen(false)
  }

  const pickModel = (m: ModelOption) => {
    const availability = modelAvailability[m.key]
    if (isHardUnavailable(availability)) {
      toast.warning(availability.reason || t('composer.send.modelBlocked'))
      return
    }
    onModelChange?.(m.key)
    setModelPopOpen(false)
  }

  const pickGenerationModel = (m: ModelOption) => {
    const availability = modelAvailability[m.key]
    if (isHardUnavailable(availability)) {
      toast.warning(availability.reason || t('composer.send.modelBlocked'))
      return
    }
    onGenerationModelChange?.(m.key)
    setGenerationModelPopOpen(false)
  }

  const mustHaveMode = hasModeOptions && (typeof requireMode === 'boolean' ? requireMode : !hideMode)
  const requiresOwnMediaPrompt = isImageCleanMode || isVideoCleanMode
  const hasSendContent = value.trim().length > 0 || (hasAttachment && !requiresOwnMediaPrompt)
  const blocksSend = loading && !stopActive
  const mustHavePlugin = !hidePlugin && requirePlugin && hasPluginControlOptions

  const fireSubmit = (contentOverride?: string) => {
    if (stopActive) {
      onStop?.()
      return
    }
    if (loading) return
    if (mustHavePlugin && !plugin) {
      toast.warning(tpl('composer.send.pickPlugin', effectivePluginTitle))
      setPluginPopOpen(true)
      return
    }
    if (mustHaveMode && !mode) {
      toast.warning(tpl('composer.send.pickMode', resolvedModeTitle))
      setModePopOpen(true)
      return
    }
    if (effectiveNeedsModel && !selectedModel) {
      toast.warning(t('composer.send.noModel'))
      return
    }
    const submitValue = contentOverride ?? value
    if (requiresOwnMediaPrompt && !submitValue.trim() && hasAttachment) {
      toast.warning(t('composer.send.cleanModeRequiresPrompt'))
      return
    }
    const hasSubmitContent = submitValue.trim().length > 0 || (hasAttachment && !requiresOwnMediaPrompt)
    if (!hasSubmitContent) {
      toast.warning(t('composer.send.needContent'))
      return
    }
    if (disabled) {
      if (disabledReason) toast.warning(disabledReason)
      return
    }
    if (effectiveNeedsModel && isHardUnavailable(selectedModelAvailability)) {
      toast.warning(selectedModelAvailability?.reason || t('composer.send.modelUnavailable'))
      return
    }
    if (selectedTextSkillNeedsAttachment && !hasAttachment) {
      toast.warning(t('composer.send.skillImageVideo'))
      return
    }
    if (isHardUnavailable(selectedGenerationAvailability)) {
      toast.warning(selectedGenerationAvailability?.reason || t('composer.send.genModelUnavailable'))
      return
    }
    if (mediaSendBlockReason) {
      toast.warning(mediaSendBlockReason)
      return
    }
    if (isImageGenerationMode && imageOptions && selectedImageSkill?.minCount && selectedImageSkill?.maxCount) {
      const min = selectedImageSkill.minCount
      const max = selectedImageSkill.maxCount
      if (imageOptions.count < min || imageOptions.count > max)
        toast.warning(tpl('composer.send.skillCountWarn', String(min), String(max), String(imageOptions.count)))
    }
    if (showCommerceBriefPreview && commerceSendConfirmEnabled && contentOverride === undefined) {
      setCommerceSendConfirmText(value)
      setCommerceSendConfirmOpen(true)
      setCommerceBriefPreviewOpen(true)
      return
    }
    setCommerceSendConfirmOpen(false)
    onSubmit?.(contentOverride)
  }

  const confirmCommerceSend = () => {
    if (commerceSendConfirmInvalid) {
      toast.warning(commerceSendConfirmMarkerCount === 1 ? t('composer.send.needFinalContent') : t('composer.send.oneBriefMarker'))
      return
    }
    fireSubmit(commerceSendConfirmText)
  }

  const commerceBriefImportDraftHint = (field: (typeof commerceBriefFields)[number]) => {
    if (!commerceBriefImportDraft[field.key])
      return tpl('composer.send.unrecognizedField', field.label)
    const source = commerceBriefImportSources.join(' / ') || t('composer.commerce.source.extract')
    return currentCommerceBrief[field.key]
      ? `${source} · ${t('composer.commerce.source.wontOverwrite')}`
      : `${source} · ${t('composer.commerce.source.willFill')}`
  }

  const sendActive = (() => {
    if (stopActive) return true
    if (!hasSendContent || disabled || blocksSend) return false
    if (effectiveNeedsModel && !selectedModel) return false
    if (effectiveNeedsModel && isHardUnavailable(selectedModelAvailability)) return false
    if (selectedTextSkillNeedsAttachment && !hasAttachment) return false
    if (isHardUnavailable(selectedGenerationAvailability)) return false
    if (mediaSendBlockReason) return false
    if (mustHavePlugin && !plugin) return false
    if (mustHaveMode && !mode) return false
    return true
  })()

  const finalDisabledReason = (() => {
    if (stopActive) return t('composer.send.stop')
    if (blocksSend) return t('composer.send.sending')
    if (effectiveNeedsModel && !selectedModel) return t('composer.send.noModel')
    if (effectiveNeedsModel && isHardUnavailable(selectedModelAvailability))
      return selectedModelAvailability?.reason || t('composer.send.modelUnavailable')
    if (selectedTextSkillNeedsAttachment && !hasAttachment) return t('composer.send.needAttachment')
    if (isHardUnavailable(selectedGenerationAvailability))
      return selectedGenerationAvailability?.reason || t('composer.send.genModelUnavailable')
    if (mediaSendBlockReason) return mediaSendBlockReason
    if (mustHavePlugin && !plugin) return tpl('composer.send.pickPlugin', effectivePluginTitle)
    if (mustHaveMode && !mode) return tpl('composer.send.pickMode', resolvedModeTitle)
    if (!hasSendContent) return t('composer.send.needContent')
    if (disabled) return disabledReason || null
    return null
  })()

  const showLeftAttachButton = showToolbarAttachButton && attachButtonPlacement === 'left'
  const showRightAttachButton = showToolbarAttachButton && attachButtonPlacement !== 'left'
  const renderToolbarAttachButton = (iconOnly = false) => (
    <button
      type="button"
      className={`cx-attach-btn ${iconOnly ? 'cx-attach-btn--icon' : ''} ${hasAttachment ? 'is-active' : ''}`}
      disabled={disabled}
      title={attachTitle}
      aria-label={attachTitle}
      onClick={() => fileAttachInputRef.current?.click()}
    >
      <Icon name={iconOnly ? 'paperclip' : 'package'} size={13} />
      {!iconOnly && <span className="cx-attach-label">{attachLabel}</span>}
    </button>
  )
  const openWarehousePicker = () => {
    setWarehousePickerOpen(true)
  }
  const setWarehousePickerOpenState = (open: boolean) => {
    setWarehousePickerOpen(open)
  }
  const renderWarehouseAttachButton = (iconOnly = false) => (
    <button
      type="button"
      className={`cx-attach-btn cx-attach-btn--warehouse ${iconOnly ? 'cx-attach-btn--icon' : ''}`}
      disabled={disabled}
      title={t('composer.warehouse.pick')}
      aria-label={t('composer.warehouse.pick')}
      onClick={() => openWarehousePicker()}
    >
      <Icon name="database" size={13} />
      {!iconOnly && <span className="cx-attach-label">{t('composer.warehouse.pickShort')}</span>}
    </button>
  )
  const renderInlineLocalButton = () => (
    <button
      type="button"
      className="cx-image-upload-inline"
      data-no-screenshot
      disabled={disabled}
      title={t('composer.image.upload')}
      onClick={() => fileAttachInputRef.current?.click()}
    >
      <Icon name="paperclip" size={13} />
      <span>{t('composer.image.upload')}</span>
    </button>
  )

  const renderInlineAddAssetButton = () => (
    <Popover open={addAssetPopOpen} onOpenChange={setAddAssetPopOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="cx-image-upload-inline cx-image-upload-inline--asset"
          data-no-screenshot
          disabled={disabled}
          title={t('composer.addAsset')}
          aria-expanded={addAssetPopOpen}
        >
          <Icon name="plus" size={13} />
          <span>{t('composer.addAssetShort')}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="cx-add-asset-pop cx-composer-pop-down" {...COMPOSER_POP_PROPS}>
        <div className="cx-add-asset-menu" role="menu" aria-label={t('composer.addAsset')}>
          <button
            type="button"
            role="menuitem"
            disabled={disabled}
            onClick={() => {
              fileAttachInputRef.current?.click()
              setAddAssetPopOpen(false)
            }}
          >
            <Icon name="paperclip" size={13} />
            <span>{t('composer.image.upload')}</span>
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={disabled}
            onClick={() => {
              openWarehousePicker()
              setAddAssetPopOpen(false)
            }}
          >
            <Icon name="database" size={13} />
            <span>{t('composer.warehouse.pickShort')}</span>
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
  const renderVideoInlineControls = () => {
    if (!isVideoGenerationMode || !videoOptions)
      return null
    return (
      <div className="cx-video-inline-controls" data-no-screenshot>
        <Popover open={videoParamsPopOpen} onOpenChange={setVideoParamsPopOpen}>
          <PopoverTrigger asChild>
            <button
              className={`cx-video-param cx-video-param--inline ${videoParamsPopOpen ? 'is-open' : ''}`}
              type="button"
              data-no-screenshot
              disabled={disabled}
              title={tpl('composer.video.settingsTitle', videoOptions.ratio === 'auto' ? t('composer.video.smartRatio') : videoOptions.ratio, videoOptions.resolution, String(videoOptions.duration))}
              aria-expanded={videoParamsPopOpen}
            >
              <svg width="13" height="13" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M4 2v12M12 2v12M2 5h4M10 11h4" />
              </svg>
              <span>{videoOptions.ratio === 'auto' ? t('composer.video.smartRatio') : videoOptions.ratio}</span>
              <span className="cx-video-param-sep" />
              <span>{videoOptions.resolution}</span>
              <span className="cx-video-param-sep" />
              <span>{videoOptions.duration}{t('composer.video.secUnit')}</span>
              <span className="cx-video-param-sep" />
              <span>1{t('composer.video.stripUnit')}</span>
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="cx-video-param-pop cx-composer-pop-down" {...COMPOSER_POP_PROPS}>
            <div className="cx-image-dock-panel-body cx-video-params-panel">
              {renderVideoParamsPanelContent()}
            </div>
          </PopoverContent>
        </Popover>
        <button
          type="button"
          className={`cx-video-control cx-video-control--inline ${videoOptions.generate_audio ? 'is-active' : ''}`}
          data-no-screenshot
          disabled={disabled}
          title={t('composer.video.outputAudio')}
          onClick={() => patchVideoOptions({ generate_audio: !videoOptions.generate_audio })}
        >
          <Icon name="bell" size={13} />
          <span>{t('composer.video.outputAudio')}</span>
        </button>
      </div>
    )
  }
  const renderImageInlineControls = () => {
    if (!isImageGenerationMode || !imageOptions)
      return null
    return (
      <div className="cx-video-inline-controls" data-no-screenshot>
        <Popover open={imageParamsPopOpen} onOpenChange={setImageParamsPopOpen}>
          <PopoverTrigger asChild>
            <button
              className={`cx-video-param cx-video-param--inline ${imageParamsPopOpen ? 'is-open' : ''}`}
              type="button"
              data-no-screenshot
              disabled={disabled}
              title={tpl('composer.image.settingsTitle', String(imageOptions.count), imageOptions.resolution, imageOptions.ratio === 'auto' ? t('composer.image.smart') : imageOptions.ratio)}
              aria-expanded={imageParamsPopOpen}
            >
              <span>{imageOptions.count}{t('composer.image.countUnit')}</span>
              <span className="cx-video-param-sep" />
              <span>{imageOptions.resolution}</span>
              <span className="cx-video-param-sep" />
              <span>{imageOptions.ratio === 'auto' ? t('composer.image.smart') : imageOptions.ratio}</span>
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="cx-video-param-pop cx-composer-pop-down" {...COMPOSER_POP_PROPS}>
            <div className="cx-image-dock-panel-body cx-image-params-panel">
              {renderImageParamsPanelContent()}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    )
  }
  const renderInlineWarehouseButton = () => (
    <button
      type="button"
      className="cx-image-upload-inline cx-image-upload-inline--warehouse"
      data-no-screenshot
      disabled={disabled}
      title={t('composer.warehouse.pick')}
      onClick={() => openWarehousePicker()}
    >
      <Icon name="database" size={13} />
      <span>{t('composer.warehouse.pickShort')}</span>
    </button>
  )
  const renderImageParamsPanelContent = () => (
    <>
      <div className="cx-image-dock-panel-body cx-image-count-panel">
        <div className="cx-image-pop-title">
          <span>{t('composer.image.countTitle')}</span>
        </div>
        <div className="cx-image-count-choice">
          <div className="cx-image-count-choice__row">
            <span>{t('composer.image.templateRecommendedCount')}</span>
            <strong>
              {imageTemplateRecommendedCount
                ? `${imageTemplateRecommendedCount}${t('composer.image.countUnit')}`
                : t('composer.image.noTemplateRecommendation')}
            </strong>
            {showImageTemplateRecommendation && imageTemplateRecommendedCount ? (
              <button
                type="button"
                disabled={disabled}
                onClick={() => patchImageOptions({ count: imageTemplateRecommendedCount, role_counts: undefined })}
              >
                {t('composer.image.applyTemplateRecommendation')}
              </button>
            ) : null}
          </div>
          <div className="cx-image-count-choice__row cx-image-count-choice__row--control">
            <span>{t('composer.image.userSelectedCount')}</span>
            <div className="cx-image-count-stepper">
              <button
                type="button"
                disabled={disabled || imageOptions!.count <= IMAGE_COUNT_MIN}
                onClick={() => patchImageOptions({ count: imageOptions!.count - 1 })}
              >
                -
              </button>
              <input
                type="number"
                min={IMAGE_COUNT_MIN}
                max={imageOutputMax}
                value={imageOptions!.count}
                aria-label={t('composer.image.userSelectedCount')}
                onChange={e => patchImageOptions({ count: Number(e.target.value) })}
              />
              <button
                type="button"
                disabled={disabled || imageOptions!.count >= imageOutputMax}
                onClick={() => patchImageOptions({ count: imageOptions!.count + 1 })}
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="cx-image-dock-panel-body cx-image-size-panel">
        <div className="cx-image-pop-label">{t('composer.image.resolutionLabel')}</div>
        <div className="cx-image-segment">
          {(['2K', '4K'] as const).map(res => (
            <button key={res} type="button" className={imageOptions!.resolution === res ? 'is-active' : ''} onClick={() => patchImageResolution(res)}>
              {res}
            </button>
          ))}
        </div>
        <div className="cx-image-pop-label">{t('composer.image.ratioLabel')}</div>
        <div className="cx-ratio-grid">
          {imageRatios.map(item => (
            <button key={item.key} type="button" className={imageOptions!.ratio === item.key ? 'is-active' : ''} onClick={() => patchImageRatio(item.key)}>
              <span className={`cx-ratio-icon ratio-${item.key.replace(':', '-')}`} />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
        <div className="cx-image-pop-label">{t('composer.image.sizeLabel')}</div>
        <div className="cx-size-fields">
          <label><span>W</span><input value={imageOptions!.width} type="number" min={64} max={6000} onChange={e => patchImageOptions({ width: Number(e.target.value) || imageOptions!.width })} /></label>
          <Icon name="link" size={16} />
          <label><span>H</span><input value={imageOptions!.height} type="number" min={64} max={6000} onChange={e => patchImageOptions({ height: Number(e.target.value) || imageOptions!.height })} /></label>
        </div>
      </div>
    </>
  )
  const renderVideoParamsPanelContent = () => (
    <>
      <div className="cx-video-pop-label">{t('composer.video.ratioLabel')}</div>
      <div className="cx-video-ratio-grid">
        {videoRatios.map(item => (
          <button key={item.key} type="button" className={videoOptions?.ratio === item.key ? 'is-active' : ''} onClick={() => patchVideoOptions({ ratio: item.key })}>
            <span className={`cx-ratio-icon ratio-${item.key.replace(':', '-')}`} />
            <span>{item.label}</span>
          </button>
        ))}
      </div>
      <div className="cx-video-pop-label">{t('composer.video.resolutionLabel')}</div>
      <div className="cx-video-segment">
        {VIDEO_RESOLUTIONS.map(res => {
          const blocked = selectedGenerationModel?.key === 'seedance-2.0-fast' && res === '1080p'
          return (
            <button key={res} type="button" disabled={blocked} className={videoOptions?.resolution === res ? 'is-active' : ''} onClick={() => patchVideoOptions({ resolution: res })}>
              {res}{blocked ? t('composer.video.notSupported') : ''}
            </button>
          )
        })}
      </div>
      <div className="cx-video-pop-label">{t('composer.video.durationLabel')}</div>
      <div className="cx-video-duration-mode">
        <button type="button" className="is-active">{t('composer.video.durationBySec')}</button>
        <button type="button" disabled>{t('composer.video.durationSmart')}</button>
      </div>
      <div className="cx-video-slider-row">
        <input
          type="range"
          min={VIDEO_DURATIONS[0]}
          max={VIDEO_DURATIONS[VIDEO_DURATIONS.length - 1]}
          step={5}
          value={videoOptions?.duration || VIDEO_DURATIONS[0]}
          onChange={(event) => patchVideoOptions({ duration: Number(event.currentTarget.value) })}
        />
        <span>{videoOptions?.duration}{t('composer.video.secUnit')}</span>
      </div>
    </>
  )
  const renderArkPortraitFilterTabs = () => (
    <div className="cx-ark-portrait-filters" aria-label={t('composer.portrait.filtersAria')}>
      <div className="cx-ark-portrait-filter-group">
        <span>{t('composer.ark.portrait.filter.gender')}</span>
        <div className="cx-ark-portrait-filter-tabs" role="tablist" aria-label={t('composer.ark.portrait.filter.gender')}>
          {arkPortraitGenderFilters.map(item => (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={arkPortraitGenderFilter === item.key}
              className={arkPortraitGenderFilter === item.key ? 'is-active' : ''}
              disabled={disabled}
              onClick={() => setArkPortraitGenderFilter(item.key as ArkPortraitGenderFilter)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <div className="cx-ark-portrait-filter-group">
        <span>{t('composer.ark.portrait.filter.age')}</span>
        <div className="cx-ark-portrait-filter-tabs" role="tablist" aria-label={t('composer.ark.portrait.filter.age')}>
          {arkPortraitAgeFilters.map(item => (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={arkPortraitAgeFilter === item.key}
              className={arkPortraitAgeFilter === item.key ? 'is-active' : ''}
              disabled={disabled}
              onClick={() => setArkPortraitAgeFilter(item.key as ArkPortraitAgeFilter)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <div className="cx-ark-portrait-filter-group">
        <span>{t('composer.ark.portrait.filter.country')}</span>
        <div className="cx-ark-portrait-filter-tabs is-scrollable" role="tablist" aria-label={t('composer.ark.portrait.filter.country')}>
          <button
            type="button"
            role="tab"
            aria-selected={arkPortraitCountryFilter === 'all'}
            className={arkPortraitCountryFilter === 'all' ? 'is-active' : ''}
            disabled={disabled}
            onClick={() => setArkPortraitCountryFilter('all')}
          >
            {t('composer.ark.portrait.filter.all')}
          </button>
          {arkPortraitCountryOptions.map(country => (
            <button
              key={country}
              type="button"
              role="tab"
              aria-selected={arkPortraitCountryFilter === country}
              className={arkPortraitCountryFilter === country ? 'is-active' : ''}
              disabled={disabled}
              onClick={() => setArkPortraitCountryFilter(country)}
            >
              {localizePortraitField(country, locale, 'country')}
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  const renderArkPortraitInlineFilterBar = () => {
    const countryOptions = [
      { key: 'all', label: t('composer.ark.portrait.filter.all') },
      ...arkPortraitCountryOptions.map(country => ({
        key: country,
        label: localizePortraitField(country, locale, 'country'),
      })),
    ]
    const filterMenus: Array<{
      menu: 'gender' | 'age' | 'country'
      options: Array<{ key: string; label: string }>
      activeKey: string
      onPick: (key: string) => void
    }> = [
      { menu: 'gender', options: arkPortraitGenderFilters, activeKey: arkPortraitGenderFilter, onPick: key => setArkPortraitGenderFilter(key as ArkPortraitGenderFilter) },
      { menu: 'age', options: arkPortraitAgeFilters, activeKey: arkPortraitAgeFilter, onPick: key => setArkPortraitAgeFilter(key as ArkPortraitAgeFilter) },
      { menu: 'country', options: countryOptions, activeKey: arkPortraitCountryFilter, onPick: key => setArkPortraitCountryFilter(key) },
    ]
    const activeMenu = filterMenus.find(item => item.menu === arkPortraitFilterMenu) || null
    const filterLabel = (menu: 'gender' | 'age' | 'country') => (
      menu === 'gender'
        ? t('composer.ark.portrait.filter.gender')
        : menu === 'age'
          ? t('composer.ark.portrait.filter.age')
          : t('composer.ark.portrait.filter.country')
    )
    const renderFilterButton = ({ menu, activeKey }: typeof filterMenus[number]) => (
      <button
        key={menu}
        type="button"
        className={`cx-ark-portrait-filter-bar-item ${activeKey !== 'all' ? 'is-active' : ''}`}
        disabled={disabled}
        aria-expanded={arkPortraitFilterMenu === menu}
        aria-haspopup="listbox"
        onClick={() => setArkPortraitFilterMenu(arkPortraitFilterMenu === menu ? null : menu)}
      >
        <span>{filterLabel(menu)}</span>
        <Icon name="chevron" size={11} />
      </button>
    )

    return (
      <div className="cx-ark-portrait-filter-stack">
        <div className="cx-ark-portrait-filter-bar" role="toolbar" aria-label={t('composer.portrait.filtersAria')}>
          {renderFilterButton(filterMenus[0])}
          <span className="cx-ark-portrait-filter-bar-divider" aria-hidden="true" />
          {renderFilterButton(filterMenus[1])}
          <span className="cx-ark-portrait-filter-bar-divider" aria-hidden="true" />
          {renderFilterButton(filterMenus[2])}
        </div>
        {activeMenu ? (
          <div
            className="cx-ark-portrait-filter-menu cx-ark-portrait-filter-menu--inline cx-composer-pop-down"
            role="presentation"
          >
            <div className="cx-ark-portrait-filter-menu-list" role="listbox" aria-label={filterLabel(activeMenu.menu)}>
              {activeMenu.options.map(item => (
                <button
                  key={item.key}
                  type="button"
                  role="option"
                  aria-selected={activeMenu.activeKey === item.key}
                  className={activeMenu.activeKey === item.key ? 'is-active' : ''}
                  disabled={disabled}
                  onClick={() => {
                    activeMenu.onPick(item.key)
                    setArkPortraitFilterMenu(null)
                  }}
                >
                  <span>{item.label}</span>
                  {activeMenu.activeKey === item.key ? <Icon name="check" size={12} /> : null}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    )
  }

  const renderMaterialPreview = (item: typeof composerMaterials[number]) => {
    if (item.previewUrl && (item.previewKind === 'image' || item.previewKind === 'video')) {
      if (item.previewKind === 'video')
        return <video src={item.previewUrl} muted playsInline preload="metadata" />
      return <img src={item.previewUrl} alt="" loading="lazy" />
    }
    if (item.kind === 'portrait')
      return <Icon name="user" size={18} />
    if (item.previewKind === 'video')
      return <Icon name="video" size={18} />
    if (item.previewKind === 'image')
      return <Icon name="image" size={18} />
    return <Icon name="file" size={18} />
  }

  const removeComposerMaterial = (item: typeof composerMaterials[number]) => {
    removeMaterialMention(item.mention)
    if (item.kind === 'portrait' && item.portrait)
      applyArkVirtualPortrait(item.portrait.assetId, item.portrait)
    else if (item.kind === 'file' && typeof item.fileIndex === 'number')
      onRemovePendingAttachFile?.(item.fileIndex)
  }

  const renderComposerMaterialBar = () => {
    if (!isMaterialMode || composerMaterials.length === 0)
      return null
    return (
      <div className="cx-material-bar" aria-label={t('composer.material.barAria')}>
        {composerMaterials.map(item => (
          <article key={item.key} className="cx-material-card">
            <button
              type="button"
              className="cx-material-card__body"
              disabled={disabled}
              title={t('composer.material.insertMention', item.label)}
              onClick={() => insertMaterialMentionAtCursor(item.mention)}
            >
              <span className="cx-material-card__preview" aria-hidden="true">
                {renderMaterialPreview(item)}
              </span>
              <span className="cx-material-card__label">{item.label}</span>
            </button>
            <button
              type="button"
              className="cx-material-card__remove"
              aria-label={`${t('composer.material.remove')} ${item.label}`}
              disabled={disabled}
              onClick={() => removeComposerMaterial(item)}
            >
              <Trash2 size={11} />
            </button>
          </article>
        ))}
      </div>
    )
  }

  const renderVideoMediaTabSwitcher = () => {
    if (!showVideoMediaTabBar)
      return null
    return (
      <div className="cx-ark-video-media-tabs" role="tablist" aria-label={t('composer.video.mediaTabsAria')}>
        {showArkVideoTemplates && videoMediaTemplateCategories.map(item => {
          const isActive = videoMediaTab === item.key
          const hasSelection = selectedArkVideoTemplate?.category === item.key
          return (
            <button
              key={item.key}
              type="button"
              role="tab"
              className={`cx-ark-video-media-tab ${isActive ? 'is-active' : ''} ${hasSelection ? 'has-selection' : ''}`}
              aria-selected={isActive}
              disabled={disabled || videoTemplateLocked}
              onClick={() => {
                setVideoMediaTab(item.key)
                setArkVideoTemplateCategory(item.key)
                if (isDrawerDock)
                  setVideoMediaDrawerOpen(true)
              }}
            >
              <span>{item.label}</span>
            </button>
          )
        })}
        {showArkVirtualPortraits && (
          <button
            type="button"
            role="tab"
            className={`cx-ark-video-media-tab ${videoMediaTab === 'portrait' ? 'is-active' : ''} ${hasSelectedVirtualPortrait ? 'has-selection' : ''}`}
            aria-selected={videoMediaTab === 'portrait'}
            disabled={disabled}
            onClick={() => {
              setVideoMediaTab('portrait')
              if (isDrawerDock)
                setVideoMediaDrawerOpen(true)
            }}
          >
            <Icon name="user" size={13} />
            <span>{t('composer.portrait.title')}</span>
          </button>
        )}
      </div>
    )
  }

  const renderImageMediaTabSwitcher = () => {
    if (!showImageMediaTabBar)
      return null
    return (
      <div className="cx-ark-video-media-tabs" role="tablist" aria-label={t('composer.image.mediaTabsAria')}>
        {showArkImageTemplates && imageMediaTemplateCategories.map(item => {
          const isActive = imageMediaTab === item.key
          const hasSelection = selectedArkImageTemplate?.category === item.key
          return (
            <button
              key={item.key}
              type="button"
              role="tab"
              className={`cx-ark-video-media-tab ${isActive ? 'is-active' : ''} ${hasSelection ? 'has-selection' : ''}`}
              aria-selected={isActive}
              disabled={disabled}
              onClick={() => {
                setImageMediaTab(item.key)
                setArkImageTemplateCategory(item.key)
                if (isDrawerDock)
                  setImageMediaDrawerOpen(true)
              }}
            >
              <span>{item.label}</span>
            </button>
          )
        })}
        {showArkVirtualPortraits && (
          <button
            type="button"
            role="tab"
            className={`cx-ark-video-media-tab ${imageMediaTab === 'portrait' ? 'is-active' : ''} ${hasSelectedVirtualPortrait ? 'has-selection' : ''}`}
            aria-selected={imageMediaTab === 'portrait'}
            disabled={disabled}
            onClick={() => {
              setImageMediaTab('portrait')
              if (isDrawerDock)
                setImageMediaDrawerOpen(true)
            }}
          >
            <Icon name="user" size={13} />
            <span>{t('composer.portrait.title')}</span>
          </button>
        )}
      </div>
    )
  }

  const renderArkVideoTemplatePanelContent = (layout: 'dock' | 'stage' = 'dock') => {
    const isStageLayout = layout === 'stage'
    return (
      <section
        className={`cx-ark-template-panel cx-ark-template-panel--inline${isStageLayout ? ' cx-ark-template-panel--stage' : ''}`}
        aria-label={t('composer.ark.template.video.panelAria')}
      >
        {!isStageLayout ? (
          <div className="cx-ark-template-toolbar">
            <div>
              <strong>{t('composer.ark.template.video.title')}</strong>
              <small>{t('composer.ark.template.video.hint')}</small>
            </div>
            <div className="cx-ark-template-tabs" aria-label={t('composer.ark.template.video.filterAria')}>
              {arkVideoTemplateCategories.map(item => (
                <button
                  key={item.key}
                  type="button"
                  className={arkVideoTemplateCategory === item.key ? 'is-active' : ''}
                  disabled={disabled || videoTemplateLocked}
                  aria-pressed={arkVideoTemplateCategory === item.key}
                  onClick={() => setArkVideoTemplateCategory(item.key)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        <div className="cx-image-dock-panel-body cx-ark-templates" aria-label={t('composer.ark.template.video.listAria')}>
          {filteredArkVideoTemplates.map((template) => {
            const meta = arkVideoTemplateMetaLocalized(template)
            const isActive = selectedArkVideoTemplate?.id === template.id
            return (
              <button
                key={template.id}
                type="button"
                className={`cx-ark-template-card ${isActive ? 'is-active' : ''}`}
                disabled={disabled || videoTemplateLocked}
                aria-pressed={isActive}
                aria-label={`${template.label}，${meta}`}
                style={{ '--cx-template-color': template.color || 'var(--cx-plugin-brand)' } as CSSProperties}
                onClick={() => applyArkVideoTemplate(template)}
              >
                {renderArkTemplateCover(template, 'video')}
                <span className="cx-ark-template-copy">
                  <div>
                    <span className="cx-ark-template-title">
                      <span className="cx-ark-template-icon">
                        <Icon name={template.icon || 'brand-bytedance'} size={13} />
                      </span>
                      <strong>{template.label}</strong>
                    </span>
                    {template.hint && <small>{template.hint}</small>}
                  </div>
                  <span className="cx-ark-template-meta">{meta}</span>
                </span>
              </button>
            )
          })}
        </div>
      </section>
    )
  }

  const renderArkImageTemplatePanelContent = (layout: 'dock' | 'stage' = 'dock') => {
    const isStageLayout = layout === 'stage'
    return (
      <section
        className={`cx-ark-template-panel cx-ark-template-panel--inline${isStageLayout ? ' cx-ark-template-panel--stage' : ''}`}
        aria-label={t('composer.ark.template.image.panelAria')}
      >
        {!isStageLayout ? (
          <div className="cx-ark-template-toolbar">
            <div>
              <strong>{t('composer.ark.template.image.title')}</strong>
              <small>{t('composer.ark.template.image.hint')}</small>
            </div>
            <div className="cx-ark-template-tabs" aria-label={t('composer.ark.template.image.filterAria')}>
              {arkImageTemplateCategories.map(item => (
                <button
                  key={item.key}
                  type="button"
                  className={arkImageTemplateCategory === item.key ? 'is-active' : ''}
                  disabled={disabled}
                  aria-pressed={arkImageTemplateCategory === item.key}
                  onClick={() => setArkImageTemplateCategory(item.key)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        <div className="cx-image-dock-panel-body cx-ark-templates" aria-label={t('composer.ark.template.image.listAria')}>
          {filteredArkImageTemplates.map((template) => {
            const meta = arkImageTemplateMetaLocalized(template)
            const isActive = isArkImageTemplateActive(template)
            return (
              <button
                key={template.id}
                type="button"
                className={`cx-ark-template-card ${isActive ? 'is-active' : ''}`}
                disabled={disabled}
                aria-pressed={isActive}
                aria-label={`${template.label}，${meta}`}
                style={{ '--cx-template-color': template.color || 'var(--cx-plugin-brand)' } as CSSProperties}
                onClick={() => applyArkImageTemplate(template)}
              >
                {renderArkTemplateCover(template, 'image')}
                <span className="cx-ark-template-copy">
                  <div>
                    <span className="cx-ark-template-title">
                      <span className="cx-ark-template-icon">
                        <Icon name={template.icon || 'brand-bytedance'} size={13} />
                      </span>
                      <strong>{template.label}</strong>
                      {template.tag && <span>{template.tag}</span>}
                    </span>
                    {template.hint && <small>{template.hint}</small>}
                  </div>
                  <span className="cx-ark-template-meta">{meta}</span>
                </span>
              </button>
            )
          })}
        </div>
      </section>
    )
  }

  const renderArkPortraitPanelContent = (layout: ArkPortraitPanelLayout = 'contained') => {
    const isInlinePortraitLayout = layout === 'inline'
    const portraitListClassName = isInlinePortraitLayout
      ? 'cx-ark-portrait-list cx-ark-portrait-list--inline'
      : 'cx-ark-portrait-list'

    return (
    <section className={`cx-ark-portrait-panel${isInlinePortraitLayout ? ' cx-ark-portrait-panel--inline' : ''}`} aria-label={t('composer.portrait.aria')}>
      {!isInlinePortraitLayout && (
        <div className="cx-ark-portrait-head">
          <div className="cx-ark-portrait-title">
            <span className="cx-ark-portrait-head-icon"><Icon name="user" size={14} /></span>
            <div>
              <strong>{t('composer.portrait.title')}</strong>
              <small>
                {arkVirtualPortraits.length > 0
                  ? hasArkPortraitFilters
                    ? tpl('composer.ark.portrait.count.matched', String(filteredArkVirtualPortraits.length), String(arkVirtualPortraits.length))
                    : tpl('composer.ark.portrait.count.loaded', String(arkVirtualPortraits.length))
                  : arkPortraitLoading
                    ? t('composer.ark.portrait.loadingLibrary')
                    : t('composer.ark.portrait.connectHint')}
              </small>
            </div>
          </div>
          <div className="cx-ark-portrait-head-actions">
            {arkVirtualPortraits.length > 0 && (
              <button
                type="button"
                className={`cx-ark-portrait-filter-toggle ${arkPortraitFiltersOpen || hasArkPortraitFilters ? 'is-active' : ''}`}
                disabled={disabled}
                aria-expanded={arkPortraitFiltersOpen}
                aria-label={t('composer.portrait.filtersAria')}
                onClick={() => setArkPortraitFiltersOpen(open => !open)}
              >
                <Icon name="search" size={12} />
                <span>
                  {hasArkPortraitFilters
                    ? tpl('composer.ark.portrait.filter.active', String(activeArkPortraitFilterCount))
                    : t('composer.ark.portrait.filter.toggle')}
                </span>
                <Icon name="chevron" size={10} />
              </button>
            )}
            <button
              type="button"
              className="cx-ark-portrait-sync"
              disabled={disabled || arkPortraitLoading}
              onClick={() => syncArkVirtualPortraits(true)}
            >
              {arkPortraitLoading ? t('composer.ark.portrait.refreshing') : t('composer.ark.portrait.refresh')}
            </button>
          </div>
        </div>
      )}

      {arkVirtualPortraits.length > 0 ? (
        <>
          {!isInlinePortraitLayout && arkPortraitFiltersOpen && (
            <div className="cx-ark-portrait-filter-panel">
              <label className="cx-ark-portrait-search">
                <Icon name="search" size={13} />
                <input
                  value={arkPortraitSearch}
                  disabled={disabled}
                  placeholder={t('composer.ark.portrait.searchPlaceholder')}
                  onChange={event => setArkPortraitSearch(event.currentTarget.value)}
                />
              </label>

              {renderArkPortraitFilterTabs()}
            </div>
          )}

          {filteredArkVirtualPortraits.length > 0 ? (
            isInlinePortraitLayout ? (
                <div
                  className={`${portraitListClassName} cx-ark-portrait-gallery-shell`}
                  aria-label={t('composer.portrait.listAria')}
                  onScroll={handleArkPortraitListScroll}
                >
                  {arkVirtualPortraits.length > 0 ? (
                    <div className="cx-ark-portrait-filter-float">
                      {renderArkPortraitInlineFilterBar()}
                    </div>
                  ) : null}
                  {visibleArkVirtualPortraits.map((portrait, index) => {
                    const active = selectedVirtualPortraitAssetIds.has(normalizeArkAssetId(portrait.assetId))
                    const portraitLabel = arkVirtualPortraitLabelLocalized(portrait, index)
                    return (
                      <button
                        key={portrait.id}
                        type="button"
                        className={`cx-ark-portrait-option ${active ? 'is-active' : ''}`}
                        disabled={disabled}
                        aria-pressed={active}
                        title={portraitLabel}
                        onClick={() => applyArkVirtualPortrait(portrait.assetId, portrait)}
                      >
                        <span className="cx-ark-portrait-thumb">
                          {renderArkVirtualPortraitMedia(portrait)}
                          <span className="cx-ark-portrait-overlay" aria-hidden="true" />
                          <span className="cx-ark-portrait-copy">
                            <strong>{portraitLabel}</strong>
                          </span>
                        </span>
                        {active && (
                          <span className="cx-ark-portrait-check" aria-hidden="true">
                            <Icon name="check" size={12} />
                          </span>
                        )}
                      </button>
                    )
                  })}
                  {hiddenArkPortraitCount > 0 ? (
                    <div ref={arkPortraitLoadMoreRef} className="cx-ark-portrait-load-more-sentinel" aria-hidden="true" />
                  ) : null}
                </div>
            ) : (
              <div
                className={portraitListClassName}
                aria-label={t('composer.portrait.listAria')}
                onScroll={handleArkPortraitListScroll}
              >
                {visibleArkVirtualPortraits.map((portrait, index) => {
                  const active = selectedVirtualPortraitAssetIds.has(normalizeArkAssetId(portrait.assetId))
                  const portraitLabel = arkVirtualPortraitLabelLocalized(portrait, index)
                  return (
                    <button
                      key={portrait.id}
                      type="button"
                      className={`cx-ark-portrait-option ${active ? 'is-active' : ''}`}
                      disabled={disabled}
                      aria-pressed={active}
                      onClick={() => applyArkVirtualPortrait(portrait.assetId, portrait)}
                    >
                      <span className="cx-ark-portrait-thumb">
                        {renderArkVirtualPortraitMedia(portrait)}
                      </span>
                      <span className="cx-ark-portrait-copy">
                        <strong>{portraitLabel}</strong>
                        <small>{arkVirtualPortraitHintLocalized(portrait)}</small>
                      </span>
                      {active && (
                        <span className="cx-ark-portrait-check" aria-hidden="true">
                          <Icon name="check" size={12} />
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )
          ) : (
            <div className="cx-ark-portrait-empty">
              <strong>{t('composer.ark.portrait.noMatch.title')}</strong>
              <small>{t('composer.ark.portrait.noMatch.hint')}</small>
              <button type="button" disabled={disabled} onClick={clearArkPortraitFilters}>
                {t('composer.ark.portrait.clearFilters')}
              </button>
            </div>
          )}

          {hasSelectedVirtualPortrait && !isInlinePortraitLayout && (
            <div className="cx-ark-portrait-current" aria-label={t('composer.portrait.selectedAria')}>
              <span>
                <Icon name="check" size={12} />
                <strong>{tpl('composer.ark.portrait.selectedShort', selectedVirtualPortraitLabel)}</strong>
              </span>
              <button type="button" disabled={disabled} onClick={clearArkVirtualPortrait}>
                {t('composer.ark.portrait.remove')}
              </button>
            </div>
          )}

          {!isInlinePortraitLayout && (
            <div className="cx-ark-portrait-foot">
              <span>{(arkPortraitSource || arkVirtualPortraits.length > 0) ? t('composer.ark.portrait.library.ready') : t('composer.ark.portrait.library.pending')}</span>
              <span>
                {tpl('composer.ark.portrait.foot.shown', String(visibleArkVirtualPortraits.length), String(filteredArkVirtualPortraits.length))}
                {hasArkPortraitFilters ? tpl('composer.ark.portrait.foot.total', String(arkVirtualPortraits.length)) : ''}
              </span>
              {hiddenArkPortraitCount > 0 && <span>{t('composer.ark.portrait.foot.loadMore')}</span>}
              {hasArkPortraitFilters && (
                <button type="button" disabled={disabled} onClick={clearArkPortraitFilters}>
                  {t('composer.ark.portrait.clearFilters')}
                </button>
              )}
              {arkPortraitStatusLabelLocalized(arkPortraitStatus) && <span>{arkPortraitStatusLabelLocalized(arkPortraitStatus)}</span>}
            </div>
          )}
        </>
      ) : (
        <div className="cx-ark-portrait-empty">
          <strong>{arkPortraitLoading ? t('composer.portrait.emptyLoading') : t('composer.portrait.emptyNone')}</strong>
          <small>{arkPortraitMessage || arkPortraitEmptyMessageLocalized(arkPortraitStatus, arkPortraitCredentialRequired)}</small>
          {!arkPortraitLoading && (
            <button type="button" disabled={disabled} onClick={() => syncArkVirtualPortraits(true)}>
              {t('composer.ark.portrait.refreshList')}
            </button>
          )}
        </div>
      )}
    </section>
    )
  }
  const renderArkVirtualPortraitControl = (variant: 'popover' | 'dock-trigger' = 'popover') => {
    if (!showArkVirtualPortraits) return null
    const portraitTrigger = (
      <button
        className={`cx-ark-portrait-trigger ${hasSelectedVirtualPortrait ? 'is-active' : ''}`}
        type="button"
        disabled={disabled}
        aria-expanded={arkPortraitPopOpen}
        title={hasSelectedVirtualPortrait ? tpl('composer.portrait.pickTitle', selectedVirtualPortraitLabel) : t('composer.portrait.pick')}
      >
        <Icon name="user" size={13} />
        <span>
          {hasSelectedVirtualPortrait
            ? tpl('composer.ark.portrait.selectedShort', selectedVirtualPortraitLabel)
            : t('composer.portrait.title')}
        </span>
        <Icon name="chevron" size={11} />
      </button>
    )
    if (variant === 'dock-trigger') return portraitTrigger
    return (
      <Popover
        open={arkPortraitPopOpen}
        onOpenChange={(open) => {
          setArkPortraitPopOpen(open)
          if (open)
            setArkPortraitFiltersOpen(false)
        }}
      >
        <PopoverTrigger asChild>
          {portraitTrigger}
        </PopoverTrigger>
        <PopoverContent align="start" className="cx-ark-portrait-pop cx-composer-dock-pop cx-composer-pop-down" {...COMPOSER_DOCK_POP_PROPS}>
          {renderArkPortraitPanelContent()}
        </PopoverContent>
      </Popover>
    )
  }

  async function handleWarehouseAssetSelect(asset: AgentMaterialAsset) {
    setWarehouseSelectingId(asset.id)
    try {
      const file = await warehouseAssetToFile(asset)
      if (isImageGenerationMode && !isSupportedReferenceImage(file)) {
        toast.warning(t('composer.warehouse.unsupportedImage'))
        return
      }
      if (isImageGenerationMode)
        attachReferenceImage(file)
      else
        onAttachFile?.(file)
      toast.info(tpl('composer.warehouse.selected', file.name))
      setWarehousePickerOpenState(false)
    }
    catch (error: any) {
      const rawMessage = String(error?.message || '')
      const message = rawMessage === 'warehouse_asset_not_downloadable'
        ? t('composer.warehouse.notDownloadable')
        : rawMessage === 'warehouse_asset_download_failed' || rawMessage === 'Failed to fetch'
          ? t('composer.warehouse.downloadFailed')
          : rawMessage || t('composer.warehouse.selectFailed')
      toast.error(message)
    }
    finally {
      setWarehouseSelectingId('')
    }
  }

  return (
    <>
      <div className={`jcx-root ${compact ? 'is-compact' : ''}${isDrawerDock ? ' jcx-root--dock-drawer' : ''}${showUnifiedMediaStage ? ' jcx-root--media-stage' : ''}`}>
        <div className={`cx-composer ${blocksSend ? 'is-loading' : ''} ${disabled ? 'is-disabled' : ''} ${compact ? 'is-compact' : ''}`}>
          {aboveSlot}

          {isImageGenerationMode && imageOptions ? (
            <>
              {renderComposerMaterialBar()}
              <div className="cx-image-input">
                <textarea
                  ref={taRef}
                  className="cx-textarea cx-image-textarea"
                  rows={1}
                  spellCheck="false"
                  value={value}
                  placeholder={isImageCleanMode ? t('composer.image.placeholder.clean') : t('composer.image.placeholder.default')}
                  disabled={disabled}
                  onChange={(e) => onChange(e.target.value)}
                  onKeyDown={handleKey}
                />
              </div>
            </>
          ) : isVideoGenerationMode && videoOptions ? (
            <>
              {renderComposerMaterialBar()}
              <div className="cx-video-input">
                <textarea
                  ref={taRef}
                  className="cx-textarea cx-video-textarea"
                  rows={1}
                  spellCheck="false"
                  value={value}
                  placeholder={isVideoCleanMode ? t('composer.video.placeholder.clean') : t('composer.video.placeholder.reference')}
                  disabled={disabled}
                  onChange={(e) => onChange(e.target.value)}
                  onKeyDown={handleKey}
                />
              </div>
            </>
          ) : isPptMode && pptOptions ? (
            <>
              <div className="cx-ppt-topbar">
                <Popover open={pptTemplatePopOpen} onOpenChange={setPptTemplatePopOpen}>
                  <PopoverTrigger asChild>
                    <button className="cx-ppt-pill" type="button" data-no-screenshot disabled={disabled}>
                      <Icon name="grid" size={13} />
                      <span>{pptTemplates.find(item => item.key === pptOptions.template)?.label || t('composer.ppt.templateFallback')}</span>
                      <Icon name="chevron" size={11} />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="cx-ppt-template-pop cx-composer-pop-down" {...COMPOSER_POP_PROPS}>
                    <div className="cx-image-pop-title">
                      <span>{t('composer.ppt.commonTypes')}</span>
                    </div>
                    <div className="cx-image-mode-list">
                      {pptTemplates.map(item => (
                        <button
                          key={item.key}
                          type="button"
                          className={`cx-image-mode-item ${pptOptions.template === item.key ? 'is-active' : ''}`}
                          onClick={() => {
                            patchPptOptions({ template: item.key })
                            setPptTemplatePopOpen(false)
                          }}
                        >
                          <strong>{item.label}</strong>
                          <span>{item.hint}</span>
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>

                <Popover open={pptSettingsPopOpen} onOpenChange={setPptSettingsPopOpen}>
                  <PopoverTrigger asChild>
                    <button className="cx-ppt-pill" type="button" data-no-screenshot disabled={disabled}>
                      <span>{pptOptions.ratio}</span>
                      <span className="cx-image-pill-sep" />
                      <span>{pptOptions.slides}{t('composer.ppt.slidesUnit')}</span>
                      <span className="cx-image-pill-sep" />
                      <span>{pptTones.find(item => item.key === pptOptions.tone)?.label || t('composer.ppt.tone.business')}</span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="cx-ppt-settings-pop cx-composer-pop-down" {...COMPOSER_POP_PROPS}>
                    <div className="cx-image-pop-label">{t('composer.ppt.ratioLabel')}</div>
                    <div className="cx-image-segment">
                      {(['16:9', '4:3'] as const).map(ratio => (
                        <button key={ratio} type="button" className={pptOptions.ratio === ratio ? 'is-active' : ''} onClick={() => patchPptOptions({ ratio })}>
                          {ratio}
                        </button>
                      ))}
                    </div>
                    <div className="cx-image-pop-label">{t('composer.ppt.slidesLabel')}</div>
                    <div className="cx-count-row">
                      <input
                        type="range"
                        min={6}
                        max={30}
                        step={1}
                        value={pptOptions.slides}
                        onChange={e => patchPptOptions({ slides: Number(e.target.value) })}
                      />
                      <input
                        type="number"
                        min={6}
                        max={30}
                        value={pptOptions.slides}
                        onChange={e => patchPptOptions({ slides: Math.max(6, Math.min(30, Number(e.target.value) || 12)) })}
                      />
                    </div>
                    <div className="cx-image-pop-label">{t('composer.ppt.styleLabel')}</div>
                    <div className="cx-ppt-tone-grid">
                      {pptTones.map(item => (
                        <button key={item.key} type="button" className={pptOptions.tone === item.key ? 'is-active' : ''} onClick={() => patchPptOptions({ tone: item.key })}>
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>

                {enableAttachControl && (
                  <>
                    <button
                      type="button"
                      className="cx-image-upload-inline"
                      data-no-screenshot
                      disabled={disabled}
                      title={t('composer.ppt.uploadTitle')}
                      onClick={() => fileAttachInputRef.current?.click()}
                    >
                      <Icon name="plus" size={13} />
                      <span>{t('composer.ppt.uploadMaterials')}</span>
                    </button>
                    {renderInlineWarehouseButton()}
                  </>
                )}
              </div>

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
            </>
          ) : (
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
          )}

          {showCommerceBriefPreview && (
            <section className={`cx-commerce-brief-preview ${commerceBriefPreviewOpen ? 'is-open' : ''}`} aria-label={t('composer.commerce.preview.title')}>
              <div className="cx-commerce-brief-preview-head">
                <button
                  type="button"
                  className="cx-commerce-brief-preview-trigger"
                  disabled={disabled}
                  aria-expanded={commerceBriefPreviewOpen}
                  onClick={() => setCommerceBriefPreviewOpen(open => !open)}
                >
                  <span>
                    <Icon name="file" size={12} />
                    {t('composer.commerce.preview.title')}
                  </span>
                  <Icon name="chevron" size={11} />
                </button>
                <button
                  type="button"
                  className={`cx-commerce-send-confirm-toggle ${commerceSendConfirmEnabled ? 'is-active' : ''}`}
                  disabled={disabled}
                  aria-pressed={commerceSendConfirmEnabled}
                  title={commerceSendConfirmEnabled ? t('composer.commerce.confirm.enabled') : t('composer.commerce.confirm.disabled')}
                  onClick={() => {
                    setCommerceSendConfirmEnabled(enabled => {
                      const next = !enabled
                      if (!next)
                        setCommerceSendConfirmOpen(false)
                      return next
                    })
                  }}
                >
                  <Icon name="check" size={12} />
                  <span>{t('composer.commerce.confirm.label')}</span>
                </button>
              </div>
              {commerceBriefPreviewOpen && (
                <pre>{commercePreviewText}</pre>
              )}
            </section>
          )}

          {commerceSendConfirmOpen && (
            <section className="cx-commerce-send-confirm" aria-label={t('composer.commerce.confirm.title')}>
              <div className="cx-commerce-send-confirm-head">
                <div>
                  <strong>{t('composer.commerce.confirm.title')}</strong>
                  <small>{t('composer.commerce.confirm.subtitle')}</small>
                </div>
                <button type="button" disabled={disabled} onClick={() => setCommerceSendConfirmOpen(false)}>
                  <Icon name="x" size={12} />
                  <span>{t('composer.commerce.confirm.close')}</span>
                </button>
              </div>
              <div className="cx-commerce-send-confirm-summary" aria-label={t('composer.commerce.confirm.summaryAria')}>
                <span><strong>{t('composer.commerce.confirm.template')}</strong>{commerceSendConfirmTemplateLabel}</span>
                <span><strong>{t('composer.commerce.confirm.product')}</strong>{commerceSendConfirmProductLabel}</span>
                {commerceSendConfirmParamLabel && <span><strong>{t('composer.commerce.confirm.params')}</strong>{commerceSendConfirmParamLabel}</span>}
              </div>
              {commerceSendConfirmRiskHints.length > 0 && (
                <div className="cx-commerce-send-confirm-warnings" role="status">
                  {commerceSendConfirmRiskHints.map(item => (
                    <span key={item}>{item}</span>
                  ))}
                </div>
              )}
              <label className="cx-commerce-send-confirm-editor">
                <span>
                  <strong>{t('composer.commerce.confirm.finalContent')}</strong>
                  <small>{t('composer.commerce.confirm.briefMarkerHint')}</small>
                </span>
                <textarea
                  rows={10}
                  spellCheck="false"
                  value={commerceSendConfirmText}
                  disabled={disabled}
                  onChange={(event) => setCommerceSendConfirmText(event.currentTarget.value)}
                />
              </label>
              <div className={`cx-commerce-send-confirm-marker ${commerceSendConfirmMarkerCount === 1 ? 'is-valid' : 'is-invalid'}`}>
                <Icon name={commerceSendConfirmMarkerCount === 1 ? 'check' : 'file'} size={12} />
                <span>{tpl('composer.commerce.confirm.briefMarkerCount', String(commerceSendConfirmMarkerCount))}</span>
              </div>
              <div className="cx-commerce-send-confirm-actions">
                <button type="button" disabled={disabled} onClick={() => setCommerceSendConfirmOpen(false)}>
                  {t('composer.commerce.confirm.backEdit')}
                </button>
                <button
                  type="button"
                  className="is-primary"
                  disabled={disabled || commerceSendConfirmInvalid}
                  onClick={confirmCommerceSend}
                >
                  <Icon name="check" size={12} />
                  {t('composer.commerce.confirm.confirmSend')}
                </button>
              </div>
            </section>
          )}

          <div className="cx-toolbar">
            <div className="cx-tool-left">
              {isImageGenerationMode && enableAttachControl && (
                <div className="cx-image-input-actions-wrap">
                  <div className="cx-image-input-actions">
                    {renderInlineAddAssetButton()}
                    <Tooltip delayDuration={0}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="cx-image-quota-hint"
                          aria-label={tpl('composer.image.quota.summaryHint', String(ARK_IMAGE_TOTAL_BUDGET))}
                        >
                          {tpl(
                            'composer.image.quota.summary',
                            String(imageBudgetUsed),
                            String(ARK_IMAGE_TOTAL_BUDGET),
                          )}
                          <CircleHelp size={12} className="cx-image-quota-hint__icon" aria-hidden />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="cx-image-quota-tooltip">
                        {tpl('composer.image.quota.summaryHint', String(ARK_IMAGE_TOTAL_BUDGET))}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              )}

              {isVideoGenerationMode && enableAttachControl && (
                <div className="cx-image-input-actions">
                  {renderInlineAddAssetButton()}
                </div>
              )}

              {renderVideoInlineControls()}

              {renderImageInlineControls()}

              {showCommerceBriefControl && SHOW_COMMERCE_BRIEF_TRIGGER && (
                <Popover open={commerceBriefPopOpen} onOpenChange={setCommerceBriefPopOpen}>
                  <PopoverTrigger asChild>
                    <button
                      className={`cx-commerce-brief-trigger ${hasCommerceBrief ? 'is-active' : ''}`}
                      type="button"
                      disabled={disabled}
                      title={hasCommerceBrief ? '编辑商品资料' : '填写商品资料'}
                    >
                      <Icon name="shop" size={13} />
                      <span>{commerceBriefTriggerLabel}</span>
                      <Icon name="chevron" size={11} />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="cx-commerce-brief-pop cx-composer-dock-pop cx-composer-pop-down" {...COMPOSER_DOCK_POP_PROPS}>
                    <section className="cx-commerce-brief-panel" aria-label="商品资料">
                      <div className="cx-commerce-brief-head">
                        <div>
                          <strong>商品资料</strong>
                          <small>用于约束本次图片和视频生成，未填写的信息不会自动编造</small>
                        </div>
                        <div className="cx-commerce-brief-actions">
                          <button
                            type="button"
                            disabled={disabled}
                            aria-pressed={commerceBriefImportOpen}
                            onClick={() => setCommerceBriefImportOpen(open => !open)}
                          >
                            导入资料
                          </button>
                          <button
                            type="button"
                            disabled={disabled}
                            aria-pressed={commerceBriefLibraryOpen}
                            onClick={() => setCommerceBriefLibraryOpen(open => !open)}
                          >
                            选择商品档案{commerceBriefProfileCount ? ` ${commerceBriefProfileCount}` : ''}
                          </button>
                          {hasCommerceBrief && (
                            <button type="button" disabled={disabled} onClick={saveCommerceBriefProfile}>
                              保存为商品档案
                            </button>
                          )}
                          {canUseRecentCommerceBrief && (
                            <button type="button" disabled={disabled} onClick={useRecentCommerceBrief}>
                              使用最近资料
                            </button>
                          )}
                          {hasCommerceBrief && (
                            <button type="button" disabled={disabled} onClick={clearCommerceBrief}>
                              清空当前
                            </button>
                          )}
                        </div>
                      </div>
                      {commerceBriefLibraryOpen && (
                        <div className="cx-commerce-brief-library" aria-label="商品档案">
                          <div className="cx-commerce-brief-library-head">
                            <div>
                              <strong>商品档案</strong>
                              <small>保存在当前浏览器，图片和视频制作共用</small>
                            </div>
                            {hasCommerceBrief && (
                              <button type="button" disabled={disabled} onClick={saveCommerceBriefProfile}>
                                保存当前
                              </button>
                            )}
                          </div>
                          {commerceBriefProfiles.length ? (
                            <div className="cx-commerce-brief-profile-list">
                              {commerceBriefProfiles.map((profile) => {
                                const isCurrentProfile = currentCommerceBriefProfile?.id === profile.id
                                return (
                                  <div className={`cx-commerce-brief-profile-item ${isCurrentProfile ? 'is-current' : ''}`} key={profile.id}>
                                    <button
                                      type="button"
                                      disabled={disabled || isCurrentProfile}
                                      className="cx-commerce-brief-profile-main"
                                      title={isCurrentProfile ? '当前正在使用此商品档案' : '使用此商品档案'}
                                      onClick={() => applyCommerceBriefProfile(profile)}
                                    >
                                      <span>
                                        <strong>{profile.label}</strong>
                                        <small>{commerceBriefProfileSummary(profile.brief)}</small>
                                      </span>
                                      <em>{isCurrentProfile ? '当前' : '使用'}</em>
                                    </button>
                                    <button
                                      type="button"
                                      disabled={disabled}
                                      className="cx-commerce-brief-profile-delete"
                                      title="删除商品档案"
                                      onClick={() => deleteCommerceBriefProfile(profile.id)}
                                    >
                                      删除
                                    </button>
                                  </div>
                                )
                              })}
                            </div>
                          ) : (
                            <div className="cx-commerce-brief-library-empty">
                              <strong>暂无商品档案</strong>
                              <span>填写或导入商品资料后，点击“保存为商品档案”。</span>
                            </div>
                          )}
                        </div>
                      )}
                      {commerceBriefImportOpen && (
                        <div className="cx-commerce-brief-import">
                          <label>
                            <span>
                              <strong>粘贴商品说明</strong>
                              <small>标题、卖点、参数、材质、场景或禁写要求</small>
                            </span>
                            <textarea
                              value={commerceBriefImportText}
                              disabled={disabled}
                              rows={5}
                              maxLength={3000}
                              placeholder="例：便携式筋膜枪&#10;品牌：xiaoone&#10;卖点：静音电机、6 档力度&#10;规格：重量 480g，电池 2500mAh&#10;材质：铝合金机身&#10;适用：运动后放松、办公室久坐&#10;禁写：不要写医疗功效，不要编造认证和销量"
                              onChange={event => setCommerceBriefImportText(event.currentTarget.value)}
                            />
                          </label>
                          <div className="cx-commerce-brief-import-actions">
                            <button type="button" disabled={disabled || !hasCommerceBriefImportText} onClick={extractCommerceBriefImport}>
                              从粘贴资料生成草稿
                            </button>
                            <button type="button" disabled={disabled || !hasCommerceReadableCurrentInput} onClick={extractCommerceBriefFromCurrentInput}>
                              从当前输入生成草稿
                            </button>
                            <button type="button" disabled={disabled || !hasCommerceAttachmentSignal} onClick={extractCommerceBriefFromAttachments}>
                              从上传素材生成草稿
                            </button>
                            <button type="button" disabled={disabled || !hasCommerceBriefImportDraft} onClick={applyCommerceBriefImportDraft}>
                              应用到商品资料
                            </button>
                          </div>
                          {(commerceBriefImportSources.length > 0 || commerceBriefImportWarnings.length > 0) && (
                            <div className="cx-commerce-brief-import-status" aria-label="商品资料草稿来源">
                              {commerceBriefImportSources.length > 0 && (
                                <div>
                                  <strong>来源</strong>
                                  <span>{commerceBriefImportSources.join(' / ')}</span>
                                </div>
                              )}
                              {commerceBriefImportWarnings.length > 0 && (
                                <div>
                                  <strong>提示</strong>
                                  <span>{commerceBriefImportWarnings.join('；')}</span>
                                </div>
                              )}
                            </div>
                          )}
                          {hasCommerceBriefImportDraft && (
                            <div className="cx-commerce-brief-draft" aria-label="商品资料抽取草稿">
                              {commerceBriefFields.map(field => (
                                <label key={field.key} className={field.multiline ? 'is-wide' : ''}>
                                  <span>
                                    <strong>{field.label}</strong>
                                    <small>{commerceBriefImportDraftHint(field)}</small>
                                  </span>
                                  {field.multiline ? (
                                    <textarea
                                      value={commerceBriefImportDraft[field.key] || ''}
                                      disabled={disabled}
                                      maxLength={COMMERCE_BRIEF_LIMITS[field.key]}
                                      rows={2}
                                      onChange={event => patchCommerceBriefImportDraft({ [field.key]: event.currentTarget.value })}
                                    />
                                  ) : (
                                    <input
                                      value={commerceBriefImportDraft[field.key] || ''}
                                      disabled={disabled}
                                      maxLength={COMMERCE_BRIEF_LIMITS[field.key]}
                                      onChange={event => patchCommerceBriefImportDraft({ [field.key]: event.currentTarget.value })}
                                    />
                                  )}
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      <div className="cx-commerce-brief-grid">
                        {commerceBriefFields.map(field => (
                          <label key={field.key} className={field.multiline ? 'is-wide' : ''}>
                            <span>
                              <strong>{field.label}</strong>
                              <small>{field.hint}</small>
                            </span>
                            {field.multiline ? (
                              <textarea
                                value={currentCommerceBrief[field.key] || ''}
                                disabled={disabled}
                                maxLength={COMMERCE_BRIEF_LIMITS[field.key]}
                                placeholder={field.placeholder}
                                rows={3}
                                onChange={event => patchCommerceBrief({ [field.key]: event.currentTarget.value })}
                              />
                            ) : (
                              <input
                                value={currentCommerceBrief[field.key] || ''}
                                disabled={disabled}
                                maxLength={COMMERCE_BRIEF_LIMITS[field.key]}
                                placeholder={field.placeholder}
                                onChange={event => patchCommerceBrief({ [field.key]: event.currentTarget.value })}
                              />
                            )}
                          </label>
                        ))}
                      </div>
                      <div className="cx-commerce-brief-foot">
                        <span>参数、认证、功效、价格和销量只会使用这里、正文或上传素材中明确给出的信息。</span>
                      </div>
                    </section>
                  </PopoverContent>
                </Popover>
              )}

              {showPluginControl && (
                <Popover open={!pluginLocked && pluginPopOpen} onOpenChange={(open) => {
                  if (!pluginLocked)
                    setPluginPopOpen(open)
                }}>
                  <PopoverTrigger asChild>
                    <button
                      className={`cx-plug ${!displayPlugin ? 'is-empty' : 'is-set'} ${pluginLocked ? 'is-locked' : ''}`}
                      type="button"
                      style={selectedPlugin ? pluginStyle(selectedPlugin) : undefined}
                      disabled={pluginLocked || disabled}
                      title={
                        displayPlugin
                          ? pluginLocked
                            ? pluginBadge?.title || tpl('composer.plugin.pickTitle', effectivePluginTitle, displayPlugin.label)
                            : tpl('composer.plugin.pickSwitch', effectivePluginTitle, displayPlugin.label)
                          : effectivePluginTitle
                      }
                    >
                      {!displayPlugin && <Icon name="plus" size={13} className="cx-plug-plus" />}
                      {displayPlugin && (
                        <>
                          {!pluginBadge && !pluginLocked && (
                            <>
                              <Icon name="plus" size={13} className="cx-plug-plus" />
                              <span className="cx-plug-sep" />
                            </>
                          )}
                          <Icon name={displayPlugin.icon || 'grid'} size={11} />
                          <span className="cx-plug-name">{displayPlugin.label}</span>
                          {!pluginLocked && !disabled && !pluginBadge && (
                            <span
                              className="cx-plug-x"
                              role="button"
                              aria-label={t('composer.plugin.clear')}
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
                  <PopoverContent align="start" className="jcx-pop jcx-choice-pop jcx-plugin-pop cx-composer-pop-down" {...COMPOSER_POP_PROPS}>
                    <div className="jcx-pop-head">
                      <strong>{pluginTitle || effectivePluginTitle}</strong>
                      <small>
                        {cfg.label} · {pluginPopoverDescription}
                      </small>
                    </div>
                    <div className="jcx-pop-list">
                      {pluginOptions.map((p) => (
                        <button
                          key={p.key}
                          className={`jcx-pop-item ${plugin === p.key ? 'is-active' : ''}`}
                          style={pluginStyle(p)}
                          type="button"
                          onClick={() => pickPlugin(p)}
                        >
                          <span className="jcx-pop-dot">
                            <Icon name={p.icon || cfg.icon} size={13} />
                          </span>
                          <div className="jcx-pop-info">
                            <strong>{p.label}</strong>
                            {p.hint && <small>{p.hint}</small>}
                          </div>
                          {plugin === p.key && (
                            <span className="jcx-pop-state">
                              <Icon name="check" size={12} />
                              <span>{t('composer.picker.current')}</span>
                            </span>
                          )}
                        </button>
                      ))}
                      {usesRemotePlugins && remotePluginLoading && (
                        <div className="jcx-pop-empty">{t('composer.plugin.loading')}</div>
                      )}
                      {usesRemotePlugins && !remotePluginLoading && pluginOptions.length === 0 && (
                        <div className="jcx-pop-empty">{t('composer.plugin.empty')}</div>
                      )}
                    </div>
                    {pluginExtraSlot}
                  </PopoverContent>
                </Popover>
              )}

              {showCopyLanguageControl && (
                <Popover open={copyLanguagePopOpen} onOpenChange={setCopyLanguagePopOpen}>
                  <PopoverTrigger asChild>
                    <button
                      className={`cx-language-trigger ${normalizedCopyLanguage !== COPY_LANGUAGE_AUTO ? 'is-set' : ''}`}
                      type="button"
                      disabled={disabled}
                      title={tpl('composer.copyLang.titleWith', copyLanguageLabelLocalized(normalizedCopyLanguage))}
                    >
                      <Icon name="globe" size={12} />
                      <span>{copyLanguageLabelLocalized(normalizedCopyLanguage)}</span>
                      <Icon name="chevron" size={11} />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="cx-language-pop cx-composer-pop-down" {...COMPOSER_POP_PROPS}>
                    <div className="cx-language-head">
                      <strong>{t('composer.copyLang.title')}</strong>
                      <small>{t('composer.copyLang.hint')}</small>
                    </div>
                    <div className="cx-language-list">
                      {copyLanguageOptions.map(item => (
                        <button
                          key={item.key}
                          type="button"
                          className={normalizedCopyLanguage === item.key ? 'is-active' : ''}
                          onClick={() => pickCopyLanguage(item.key)}
                        >
                          <span>{item.label}</span>
                          <small>{item.hint}</small>
                          {normalizedCopyLanguage === item.key && <Icon name="check" size={12} />}
                        </button>
                      ))}
                    </div>
                    <form className="cx-language-custom" onSubmit={submitCustomCopyLanguage}>
                      <label htmlFor="copy-language-custom">{t('composer.copyLang.customLabel')}</label>
                      <div>
                        <input
                          id="copy-language-custom"
                          value={copyLanguageCustom}
                          maxLength={80}
                          placeholder="Italiano / Gaeilge / isiZulu"
                          onChange={(event) => setCopyLanguageCustom(event.currentTarget.value)}
                        />
                        <button type="submit">{t('composer.copyLang.apply')}</button>
                      </div>
                    </form>
                  </PopoverContent>
                </Popover>
              )}

              {!isImageGenerationMode && !hideMode && hasModeOptions && lockMode && (
                <span
                  className={`cx-badge cx-badge-mode ${selectedMode ? 'is-set' : ''} ${selectedMode?.warning ? 'is-warn' : ''} is-readonly`}
                  title={`${resolvedModeTitle}：${selectedMode?.label || resolvedModeTitle}`}
                >
                  <span className="cx-dot" />
                  {selectedMode?.label || resolvedModeTitle}
                </span>
              )}
              {!isImageGenerationMode && !hideMode && hasModeOptions && !lockMode && (
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
                  <PopoverContent align="start" className="jcx-pop jcx-choice-pop jcx-mode-pop cx-composer-pop-down" {...COMPOSER_POP_PROPS}>
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
                          <span className="jcx-pop-dot">
                            <Icon name={cfg.icon} size={12} />
                          </span>
                          <div className="jcx-pop-info">
                            <strong>{m.label}</strong>
                            {m.warning ? (
                              <small className="jcx-pop-warn">⚠ {m.warning}</small>
                            ) : (
                              m.hint && <small>{m.hint}</small>
                            )}
                          </div>
                          {mode === m.key && (
                            <span className="jcx-pop-state">
                              <Icon name="check" size={12} />
                              <span>{t('composer.picker.current')}</span>
                            </span>
                          )}
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
                      <PopoverContent align="start" className="jcx-pop w-[320px] cx-composer-pop-down" {...COMPOSER_POP_PROPS}>
                        <div className="jcx-pop-head">
                          <strong>{t('composer.businessPicker.title')}</strong>
                          <small>{t('composer.businessPicker.hint')}</small>
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
                                <Icon name={localizedBusinessConfigs[bk].icon} size={11} />
                              </span>
                              <div className="jcx-pop-info">
                                <strong>{localizedBusinessConfigs[bk].label}</strong>
                                <small>{localizedBusinessConfigs[bk].description}</small>
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

              {leftExtraSlot}

              {showLeftAttachButton && renderToolbarAttachButton(true)}
              {showLeftAttachButton && renderWarehouseAttachButton(true)}
            </div>

            <div className="cx-tool-right">
              {rightExtraSlot}

              {enableAttachControl && (
                <>
                  <input
                    ref={fileAttachInputRef}
                    type="file"
                    multiple
                    accept={isImageGenerationMode ? SUPPORTED_REFERENCE_IMAGE_ACCEPT : isVideoGenerationMode ? VIDEO_REFERENCE_ACCEPT : isMarketingTextMode ? COPY_REFERENCE_ACCEPT : undefined}
                    className="jcx-file-input"
                    tabIndex={-1}
                    aria-hidden="true"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || [])
                      for (const file of files) {
                        if (isImageGenerationMode && !isSupportedReferenceImage(file)) {
                          toast({ title: t('composer.toast.imageFormat'), description: t('composer.toast.imageFormatDesc') })
                          continue
                        }
                        if (isMarketingTextMode && !isSupportedCopyReferenceFile(file)) {
                          toast({ title: t('composer.toast.copyReferenceFormat'), description: t('composer.toast.copyReferenceFormatDesc') })
                          continue
                        }
                        if (isImageGenerationMode)
                          attachReferenceImage(file)
                        else
                          onAttachFile?.(file)
                      }
                      e.target.value = ''
                    }}
                  />
                  {showRightAttachButton && renderToolbarAttachButton(false)}
                  {showRightAttachButton && renderWarehouseAttachButton(false)}
                </>
              )}

              {expertBadge && (
                <span className="cx-expert-badge" title={tpl('composer.model.expertTitle', expertBadge.label)} aria-label={tpl('composer.model.expertTitle', expertBadge.label)}>
                  <Icon name={expertBadge.icon} size={13} />
                  <span>{expertBadge.label}</span>
                </span>
              )}

              {!hideReasoningModelForMedia && !hideModel && effectiveNeedsModel && (
                <Popover open={modelPopOpen} onOpenChange={setModelPopOpen}>
                  <PopoverTrigger asChild>
                    <button
                      className="cx-model"
                      type="button"
                      disabled={lockSelections || disabled || !selectedModel}
                      title={selectedModel ? tpl('composer.model.currentTitle', selectedModel.label) : t('composer.model.none')}
                    >
                      <Icon name={selectedModel?.icon || 'bolt'} size={11} />
                      <span>{selectedModel?.label || t('composer.model.noneShort')}</span>
                      <Icon name="chevron" size={11} />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="jcx-pop w-[240px] cx-composer-pop-down" {...COMPOSER_POP_PROPS}>
                    <div className="jcx-pop-head">
                      <strong>{t('composer.model.title')}</strong>
                      <small>{t('composer.model.pickHint')}</small>
                    </div>
                    <div className="jcx-pop-list">
                      {modelOptions.map((m) => {
                        const av = modelAvailability[m.key]
                        const isDisabled = isHardUnavailable(av)
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
                                <small>{av.reason || t('composer.model.unavailable')}</small>
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

              {isImageGenerationMode && imageOptions && estimatedImagePlatformPoints > 0 && (
                <div className="cx-image-cost">
                  <strong>{tpl('composer.points.amount', formatEstimatedPlatformPoints(estimatedImagePlatformPoints))}</strong>
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="cx-image-cost-hint"
                        aria-label={tpl('composer.points.estimateTitle', selectedGenerationModel?.label || t('composer.genModel.title'), formatEstimatedPlatformPoints(estimatedImagePlatformPoints))}
                      >
                        <CircleHelp size={12} className="cx-image-cost-hint__icon" aria-hidden />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="cx-image-quota-tooltip">
                      {tpl('composer.points.estimateTitle', selectedGenerationModel?.label || t('composer.genModel.title'), formatEstimatedPlatformPoints(estimatedImagePlatformPoints))}
                    </TooltipContent>
                  </Tooltip>
                </div>
              )}

              {isVideoGenerationMode && videoOptions && estimatedVideoPlatformPoints > 0 && (
                <div className="cx-image-cost cx-video-cost-inline">
                  <strong>{tpl('composer.points.amount', formatEstimatedPlatformPoints(estimatedVideoPlatformPoints))}</strong>
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="cx-image-cost-hint"
                        aria-label={tpl('composer.points.estimateTitle', selectedGenerationModel?.label || t('composer.genModel.title'), formatEstimatedPlatformPoints(estimatedVideoPlatformPoints))}
                      >
                        <CircleHelp size={12} className="cx-image-cost-hint__icon" aria-hidden />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="cx-image-quota-tooltip">
                      {tpl('composer.points.estimateTitle', selectedGenerationModel?.label || t('composer.genModel.title'), formatEstimatedPlatformPoints(estimatedVideoPlatformPoints))}
                    </TooltipContent>
                  </Tooltip>
                </div>
              )}

              {!hideModel && generationModelOptions.length > 0 && selectedGenerationModel && (
                <Popover open={generationModelPopOpen} onOpenChange={setGenerationModelPopOpen}>
                  <PopoverTrigger asChild>
                    <button
                      className="cx-model"
                      type="button"
                      disabled={lockSelections || disabled}
                      title={tpl('composer.genModel.currentTitle', selectedGenerationModel.label)}
                    >
                      <Icon name={selectedGenerationModel.icon || 'grid'} size={11} />
                      <span>{selectedGenerationModel.label}</span>
                      <Icon name="chevron" size={11} />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="jcx-pop w-[260px] cx-composer-pop-down" {...COMPOSER_POP_PROPS}>
                    <div className="jcx-pop-head">
                      <strong>{t('composer.genModel.title')}</strong>
                      <small>{t('composer.genModel.hint')}</small>
                    </div>
                    <div className="jcx-pop-list">
                      {generationModelOptions.map((m) => {
                        const av = modelAvailability[m.key]
                        const isDisabled = isHardUnavailable(av)
                        return (
                          <button
                            key={m.key}
                            className={`jcx-pop-item ${generationModel === m.key ? 'is-active' : ''} ${isDisabled ? 'is-disabled' : ''}`}
                            type="button"
                            onClick={() => pickGenerationModel(m)}
                          >
                            <span className="jcx-pop-dot">
                              <Icon name={m.icon} size={11} />
                            </span>
                            <div className="jcx-pop-info">
                              <strong>{m.label}</strong>
                              {isDisabled ? (
                                <small>{av.reason || t('composer.model.unavailable')}</small>
                              ) : (
                                <small>{(isImageGenerationMode || isVideoGenerationMode) ? t('composer.points.modelHint') : m.hint}</small>
                              )}
                            </div>
                            {generationModel === m.key && <Icon name="dot" size={10} />}
                          </button>
                        )
                      })}
                    </div>
                  </PopoverContent>
                </Popover>
              )}

              <button
                className={`cx-send ${sendActive ? 'is-active' : ''} ${stopActive ? 'is-stop' : ''} ${blocksSend ? 'is-loading' : ''}`}
                disabled={(loading && !stopActive) || (disabled && !stopActive)}
                aria-disabled={!sendActive}
                type="button"
                title={finalDisabledReason || t('composer.send.send')}
                onClick={() => fireSubmit()}
              >
                {stopActive ? (
                  <Square size={12} strokeWidth={2.4} />
                ) : (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="19" x2="12" y2="5" />
                    <polyline points="5 12 12 5 19 12" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {isDrawerDock && showImageMediaStage ? (
          <div className="cx-ark-video-media-stage--compact" data-no-screenshot>
            {renderImageMediaTabSwitcher()}
          </div>
        ) : null}

        {usesPluginDock && (
          <div className="cx-image-dock-wrap cx-plugin-dock-wrap" data-no-screenshot>
            <div className="cx-image-dock cx-plugin-dock" role="tablist" aria-label={pluginTitle || effectivePluginTitle}>
              <button
                className={`cx-video-template-trigger cx-image-template-trigger ${pluginDockOpen ? 'is-open' : ''} ${displayPlugin ? 'is-active' : ''}`}
                type="button"
                role="tab"
                aria-selected={pluginDockOpen}
                disabled={disabled}
                title={pluginTitle || effectivePluginTitle}
                onClick={() => setPluginDockOpen(open => !open)}
              >
                <Icon name={displayPlugin?.icon || cfg.icon} size={13} />
                <span>{pluginDockTriggerLabel}</span>
                <Icon name="chevron" size={11} />
              </button>
            </div>

            {pluginDockOpen && (
              <div className="cx-image-dock-panel cx-plugin-dock-panel" role="tabpanel">
                <section
                  className="cx-ark-template-panel cx-ark-template-panel--inline cx-ark-template-panel--plain"
                  aria-label={pluginTitle || effectivePluginTitle}
                >
                  <div className="cx-ark-template-toolbar">
                    <div>
                      <strong>{pluginTitle || effectivePluginTitle}</strong>
                      <small>{pluginPopoverDescription}</small>
                    </div>
                  </div>
                  <div
                    className="cx-image-dock-panel-body cx-ark-templates cx-ark-templates--plain"
                    aria-label={pluginTitle || effectivePluginTitle}
                  >
                    {usesRemotePlugins && remotePluginLoading ? (
                      <div className="cx-ark-template-empty">{t('composer.plugin.loading')}</div>
                    ) : pluginOptions.length === 0 ? (
                      <div className="cx-ark-template-empty">{t('composer.plugin.empty')}</div>
                    ) : (
                      pluginOptions.map((p) => (
                        <button
                          key={p.key}
                          type="button"
                          className={`cx-ark-template-card cx-ark-template-card--plain ${plugin === p.key ? 'is-active' : ''}`}
                          disabled={disabled}
                          aria-pressed={plugin === p.key}
                          aria-label={p.hint ? `${p.label}，${p.hint}` : p.label}
                          style={{ ...pluginStyle(p), '--cx-template-color': p.color || 'var(--cx-plugin-brand)' } as React.CSSProperties}
                          onClick={() => {
                            pickPlugin(p)
                            setPluginDockOpen(false)
                          }}
                        >
                          <span className="cx-ark-template-copy">
                            <div>
                              <span className="cx-ark-template-title">
                                <span className="cx-ark-template-icon">
                                  <Icon name={p.icon || cfg.icon} size={13} />
                                </span>
                                <strong>{p.label}</strong>
                              </span>
                              {p.hint && <small>{p.hint}</small>}
                            </div>
                            {plugin === p.key ? (
                              <span className="cx-ark-template-meta">{t('composer.picker.current')}</span>
                            ) : null}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </section>
              </div>
            )}
          </div>
        )}

        {showExpertPluginCards && (
          <div className="cx-expert-cards" aria-label={pluginTitle || effectivePluginTitle}>
            {pluginOptions.map((p) => (
              <button
                key={p.key}
                type="button"
                className={`cx-expert-card ${plugin === p.key ? 'is-active' : ''}`}
                style={{ ...pluginStyle(p), '--cx-template-color': p.color || 'var(--cx-plugin-brand)' } as React.CSSProperties}
                disabled={disabled}
                onClick={() => pickPlugin(p)}
              >
                <span className="cx-expert-icon">
                  <Icon name={p.icon || cfg.icon} size={15} />
                </span>
                <span className="cx-expert-copy">
                  <div>
                    <strong>{p.label}</strong>
                    {p.hint && <small>{p.hint}</small>}
                  </div>
                  {plugin === p.key && <span className="cx-expert-meta">{t('composer.expert.currentPlugin')}</span>}
                </span>
              </button>
            ))}
          </div>
        )}

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
                    <PopoverContent align="start" className="jcx-pop w-[320px] cx-composer-pop-down" {...COMPOSER_POP_PROPS}>
                      <div className="jcx-pop-head">
                        <strong>{t('composer.businessPicker.title')}</strong>
                        <small>{t('composer.businessPicker.hint')}</small>
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
                              <Icon name={localizedBusinessConfigs[bk].icon} size={11} />
                            </span>
                            <div className="jcx-pop-info">
                              <strong>{localizedBusinessConfigs[bk].label}</strong>
                              <small>{localizedBusinessConfigs[bk].description}</small>
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
        {isDrawerDock && showVideoMediaStage ? (
          <div className="cx-ark-video-media-stage--compact" data-no-screenshot>
            {renderVideoMediaTabSwitcher()}
          </div>
        ) : null}
      </div>
      {showVideoMediaStage && !isDrawerDock ? (
        <div className="cx-ark-portrait-stage cx-ark-video-media-stage" data-no-screenshot>
          {renderVideoMediaTabSwitcher()}
          {videoMediaTab === 'portrait' && showArkVirtualPortraits
            ? renderArkPortraitPanelContent('inline')
            : null}
          {videoMediaTab !== 'portrait' && showArkVideoTemplates
            ? renderArkVideoTemplatePanelContent('stage')
            : null}
        </div>
      ) : null}
      {showVideoMediaStage && isDrawerDock && videoMediaDrawerOpen ? (
        <>
          <button
            type="button"
            className="cx-media-dock-drawer-scrim"
            aria-label={t('common.close', '关闭')}
            onClick={() => setVideoMediaDrawerOpen(false)}
          />
          <div className="cx-media-dock-drawer cx-media-dock-drawer--video" role="dialog" aria-modal="true">
            <div className="cx-ark-portrait-stage cx-ark-video-media-stage cx-ark-video-media-stage--drawer" data-no-screenshot>
              {renderVideoMediaTabSwitcher()}
              {videoMediaTab === 'portrait' && showArkVirtualPortraits
                ? renderArkPortraitPanelContent('inline')
                : null}
              {videoMediaTab !== 'portrait' && showArkVideoTemplates
                ? renderArkVideoTemplatePanelContent('stage')
                : null}
            </div>
          </div>
        </>
      ) : null}
      {showImageMediaStage && !isDrawerDock ? (
        <div className="cx-ark-portrait-stage cx-ark-video-media-stage" data-no-screenshot>
          {renderImageMediaTabSwitcher()}
          {imageMediaTab === 'portrait' && showArkVirtualPortraits
            ? renderArkPortraitPanelContent('inline')
            : null}
          {imageMediaTab !== 'portrait' && showArkImageTemplates
            ? renderArkImageTemplatePanelContent('stage')
            : null}
        </div>
      ) : null}
      {showImageMediaStage && isDrawerDock && imageMediaDrawerOpen ? (
        <>
          <button
            type="button"
            className="cx-media-dock-drawer-scrim"
            aria-label={t('common.close', '关闭')}
            onClick={() => setImageMediaDrawerOpen(false)}
          />
          <div className="cx-media-dock-drawer cx-media-dock-drawer--image" role="dialog" aria-modal="true">
            <div className="cx-ark-portrait-stage cx-ark-video-media-stage cx-ark-video-media-stage--drawer" data-no-screenshot>
              {renderImageMediaTabSwitcher()}
              {imageMediaTab === 'portrait' && showArkVirtualPortraits
                ? renderArkPortraitPanelContent('inline')
                : null}
              {imageMediaTab !== 'portrait' && showArkImageTemplates
                ? renderArkImageTemplatePanelContent('stage')
                : null}
            </div>
          </div>
        </>
      ) : null}
      {enableAttachControl ? (
        <WarehouseAssetPickerDialog
          open={warehousePickerOpen}
          onOpenChange={setWarehousePickerOpenState}
          allowedKinds={warehouseDialogAllowedKinds}
          title={t('composer.warehouse.dialogTitle')}
          description={isImageGenerationMode
            ? t('composer.warehouse.dialogDescImage')
            : t('composer.warehouse.dialogDesc')}
          selectingId={warehouseSelectingId}
          onSelect={handleWarehouseAssetSelect}
        />
      ) : null}
    </>
  )
}
