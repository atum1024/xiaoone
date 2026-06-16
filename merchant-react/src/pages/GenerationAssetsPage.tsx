import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDownAZ, ArrowUpAZ, Clapperboard, Download, Eye, FileImage, FileText, Play, Presentation, RotateCcw, Search, Trash2, Upload } from 'lucide-react'
import { getChatKit, type AgentMaterialAsset } from '@xiaoone/chat-kit'
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, toast } from '@xiaoone/react-ui'
import { useSearchParams } from 'react-router'
import { useRegion } from '@xiaoone/region'
import { useLocalizedTopbarSlot } from '../layout/Topbar'
import { usePreferences } from '../app/preferences'
import { RealNameVerifyDialog } from '../components/RealNameVerifyDialog'
import { AsyncImage } from '../components/AsyncImage'
import { isKycGatedWarehouseTab, requiresMainlandRealName, type KycGatedWarehouseTab } from '../lib/kycGate'
import { useRealNameVerified } from '../lib/useRealNameVerified'
import { authFetch } from '../lib/authFetch'
import {
  resolveWarehouseAssetPreview,
  resolveWarehouseAssetMediaSource,
  resolveWarehouseVideoFramePreview,
  warehouseAssetDownloadCandidates,
  warehouseAssetFileName,
  warehouseAssetHasDirectCover,
  warehouseAssetPlaybackUrl,
  warehouseAssetPreviewCandidates,
  warehouseAssetRequestUrl,
  type WarehouseAssetPreviewResult,
} from '../lib/warehouseAssets'
import { DcpayCardsPage } from './DcpayCardsPage'
import { UsPhoneNumbersPage } from './UsPhoneNumbersPage'
import { WarehouseAcceleratorPanel } from './WarehouseAcceleratorPanel'
import './generation-assets-page.css'

type WarehouseTab = 'image' | 'video' | 'space' | 'accelerator' | 'numbers' | 'ad-card'
type SpaceKindFilter = 'image' | 'video' | 'file'
type SpaceSortOrder = 'desc' | 'asc'

const WAREHOUSE_TAB_VALUES = new Set<WarehouseTab>(['image', 'video', 'space', 'accelerator', 'numbers', 'ad-card'])

const KIND_TAB_KEYS = [
  { value: 'image', labelKey: 'automation.warehouse.tab.image' },
  { value: 'video', labelKey: 'automation.warehouse.tab.video' },
  { value: 'space', labelKey: 'automation.warehouse.tab.space' },
  { value: 'accelerator', labelKey: 'automation.warehouse.tab.accelerator' },
  { value: 'numbers', labelKey: 'automation.warehouse.tab.numbers' },
  { value: 'ad-card', labelKey: 'automation.warehouse.tab.adCard' },
] as const

function warehouseTabFromParam(raw: string | null): WarehouseTab {
  if (raw === 'cross-border') return 'accelerator'
  if (raw && WAREHOUSE_TAB_VALUES.has(raw as WarehouseTab)) return raw as WarehouseTab
  return 'image'
}

const SPACE_KIND_TAB_KEYS: { value: SpaceKindFilter; labelKey: string }[] = [
  { value: 'image', labelKey: 'automation.warehouse.space.image' },
  { value: 'video', labelKey: 'automation.warehouse.space.video' },
  { value: 'file', labelKey: 'automation.warehouse.space.file' },
]

const ASSET_PAGE_SIZE = 30
const PREVIEW_RESOLVE_CONCURRENCY = 6
const VIDEO_FRAME_RESOLVE_CONCURRENCY = 1
const ASSET_TABS = new Set<WarehouseTab>(['image', 'video', 'space'])

function kindLabel(kind: string, source: AgentMaterialAsset['source'] | undefined, tr: (k: string) => string) {
  const isUpload = source === 'user_upload'
  if (kind === 'image') return isUpload ? tr('automation.warehouse.kind.image') : tr('automation.warehouse.kind.aiImage')
  if (kind === 'video') return isUpload ? tr('automation.warehouse.kind.video') : tr('automation.warehouse.kind.aiVideo')
  if (kind === 'presentation') return 'PPT'
  return tr('automation.warehouse.kind.file')
}

function assetPlaceholderIcon(kind: string) {
  if (kind === 'image') return FileImage
  if (kind === 'video') return Clapperboard
  if (kind === 'presentation') return Presentation
  return FileText
}

function previewFailureLabel(failure: WarehouseAssetPreviewResult | undefined, tr: (k: string) => string) {
  if (!failure)
    return tr('automation.warehouse.previewUnavailable')
  if (failure.status === 410)
    return tr('automation.warehouse.preview.sourceUnavailable')
  if (failure.status === 404)
    return tr('automation.warehouse.preview.sourceMissing')
  if (failure.reason === 'no_candidate')
    return tr('automation.warehouse.preview.noCover')
  if (failure.reason === 'timeout')
    return tr('automation.warehouse.preview.timeout')
  if (failure.reason === 'cors_or_network')
    return tr('automation.warehouse.preview.network')
  return tr('automation.warehouse.previewUnavailable')
}

function AssetPlaceholder({
  kind,
  source,
  failed = false,
  pending = false,
  failedLabel,
  t,
}: {
  kind: string
  source?: AgentMaterialAsset['source']
  failed?: boolean
  pending?: boolean
  failedLabel?: string
  t: (k: string) => string
}) {
  const Icon = assetPlaceholderIcon(kind)
  const classes = [
    'gap-asset-placeholder',
    `gap-asset-placeholder--${kind}`,
    failed ? 'gap-asset-placeholder--failed' : '',
    pending ? 'gap-asset-placeholder--pending' : '',
  ].filter(Boolean).join(' ')

  return (
    <div className={classes}>
      <span className="gap-asset-placeholder__badge" aria-hidden="true">
        <Icon size={22} strokeWidth={1.75} />
      </span>
      <div className="gap-asset-placeholder__copy">
        <span className="gap-asset-placeholder__label">{kindLabel(kind, source, t)}</span>
        {failed ? <small className="gap-asset-placeholder__hint">{failedLabel || t('automation.warehouse.previewUnavailable')}</small> : null}
      </div>
    </div>
  )
}




function canPreviewAsset(
  asset: AgentMaterialAsset,
  preview: string | undefined,
  previewFailed: boolean,
  isRunning: boolean,
) {
  if (isRunning) return false
  if (asset.kind === 'image') return Boolean(preview) && !previewFailed
  if (asset.kind === 'video') return Boolean(warehouseAssetPlaybackUrl(asset))
  return false
}

function formatTime(input?: string | null) {
  if (!input) return '—'
  return input.replace('T', ' ').slice(0, 19)
}

function assetSourceLabel(asset: AgentMaterialAsset, tr: (k: string) => string) {
  if (asset.source === 'user_upload') return tr('automation.warehouse.source.upload')
  if (asset.kind === 'presentation') return tr('automation.warehouse.source.hermes')
  if (asset.source === 'generation_task') return tr('automation.warehouse.source.generation')
  return tr('automation.warehouse.source.attachment')
}

function mergeAssets(current: AgentMaterialAsset[], incoming: AgentMaterialAsset[]) {
  const seen = new Set(current.map(item => item.id))
  const merged = current.slice()
  for (const item of incoming) {
    if (seen.has(item.id)) continue
    seen.add(item.id)
    merged.push(item)
  }
  return merged
}

async function downloadBlobUrl(url: string, asset: AgentMaterialAsset, tr: (k: string) => string) {
  if (!url) throw new Error(tr('automation.warehouse.error.notDownloadable'))
  const resp = await authFetch(url)
  if (!resp.ok) throw new Error(tr('automation.warehouse.error.downloadFailed'))
  const blob = await resp.blob()
  if (blob.size <= 0) throw new Error(tr('automation.warehouse.error.downloadFailed'))
  const objectUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = objectUrl
  a.download = warehouseAssetFileName(asset, blob)
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
}

const GENERATING_ASSET_STATUSES = new Set(['submitted', 'queued', 'running'])

function isAssetGenerating(asset: AgentMaterialAsset) {
  return GENERATING_ASSET_STATUSES.has(asset.status)
}

async function resolvePreviewPool(
  assets: AgentMaterialAsset[],
  handlers: {
    onResolved: (assetId: string, url: string, revoke: boolean) => void
    onFailed: (assetId: string, failure: WarehouseAssetPreviewResult) => void
    onSkipped?: (assetId: string) => void
    isCancelled: () => boolean
    signal?: AbortSignal
  },
) {
  let cursor = 0
  async function worker() {
    while (!handlers.isCancelled()) {
      const index = cursor
      cursor += 1
      if (index >= assets.length)
        return
      const asset = assets[index]
      if (isAssetGenerating(asset)) {
        handlers.onSkipped?.(asset.id)
        continue
      }
      const result = await resolveWarehouseAssetPreview(asset, { signal: handlers.signal })
      if (handlers.isCancelled())
        return
      if (result.url) {
        handlers.onResolved(asset.id, result.url, result.revoke)
        continue
      }
      if (asset.kind === 'video' && !warehouseAssetHasDirectCover(asset)) {
        handlers.onSkipped?.(asset.id)
        continue
      }
      handlers.onFailed(asset.id, result)
    }
  }
  await Promise.all(Array.from(
    { length: Math.min(PREVIEW_RESOLVE_CONCURRENCY, Math.max(assets.length, 1)) },
    () => worker(),
  ))
}

async function resolveVideoFramePool(
  assetIds: string[],
  assetById: Map<string, AgentMaterialAsset>,
  handlers: {
    onResolved: (assetId: string, url: string, revoke: boolean) => void
    isCancelled: () => boolean
    signal?: AbortSignal
  },
) {
  let cursor = 0
  async function worker() {
    while (!handlers.isCancelled()) {
      const index = cursor
      cursor += 1
      if (index >= assetIds.length)
        return
      const asset = assetById.get(assetIds[index])
      if (!asset)
        continue
      const result = await resolveWarehouseVideoFramePreview(asset, { signal: handlers.signal })
      if (handlers.isCancelled())
        return
      if (result.url)
        handlers.onResolved(asset.id, result.url, result.revoke)
    }
  }
  await Promise.all(Array.from(
    { length: Math.min(VIDEO_FRAME_RESOLVE_CONCURRENCY, Math.max(assetIds.length, 1)) },
    () => worker(),
  ))
}

function warehouseTabFeatureLabel(tab: KycGatedWarehouseTab, tr: (key: string) => string): string {
  const match = KIND_TAB_KEYS.find(item => item.value === tab)
  return match ? tr(match.labelKey) : tr('common.dialog.featureDefault')
}

export function GenerationAssetsPage() {
  const { t, tpl } = usePreferences()
  const { region } = useRegion()
  const { verified: realNameVerified, loading: realNameLoading, refresh: refreshRealName } = useRealNameVerified()
  const [searchParams, setSearchParams] = useSearchParams()

  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<AgentMaterialAsset[]>([])
  const [filterKind, setFilterKind] = useState<WarehouseTab>(() => warehouseTabFromParam(searchParams.get('tab')))
  const [spaceKindFilter, setSpaceKindFilter] = useState<SpaceKindFilter>('image')
  const [assetPage, setAssetPage] = useState(1)
  const [assetTotal, setAssetTotal] = useState(0)
  const [assetHasMore, setAssetHasMore] = useState(false)
  const [spaceSearch, setSpaceSearch] = useState('')
  const [spaceSearchInput, setSpaceSearchInput] = useState('')
  const [spaceSort, setSpaceSort] = useState<SpaceSortOrder>('desc')
  const [uploading, setUploading] = useState(false)
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({})
  const [previewFailures, setPreviewFailures] = useState<Record<string, WarehouseAssetPreviewResult>>({})
  const [mediaPreview, setMediaPreview] = useState<{ kind: 'image' | 'video'; url: string; name: string } | null>(null)
  const [mediaPreviewLoadingAssetId, setMediaPreviewLoadingAssetId] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<AgentMaterialAsset | null>(null)
  const [deletingAssetId, setDeletingAssetId] = useState('')
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const uploadInputRef = useRef<HTMLInputElement | null>(null)
  const mediaPreviewVideoRef = useRef<HTMLVideoElement | null>(null)
  const mediaPreviewObjectUrlRef = useRef('')
  const mediaPreviewRequestIdRef = useRef(0)
  const fallbackPreviewObjectUrlsRef = useRef<string[]>([])
  const assetsScrollRef = useRef<HTMLDivElement | null>(null)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)
  const galleryItemRefs = useRef<Map<string, HTMLElement>>(new Map())
  const loadRequestIdRef = useRef(0)
  const dismissedKycTabsRef = useRef(new Set<string>())
  const [realNameOpen, setRealNameOpen] = useState(false)
  const [pendingTab, setPendingTab] = useState<WarehouseTab | null>(null)

  const resetAssetList = () => {
    loadRequestIdRef.current += 1
    setItems([])
    setAssetTotal(0)
    setAssetHasMore(false)
    setAssetPage(1)
  }

  const load = async () => {
    const requestId = ++loadRequestIdRef.current
    if (!ASSET_TABS.has(filterKind)) {
      if (requestId !== loadRequestIdRef.current)
        return
      setItems([])
      setAssetTotal(0)
      setAssetHasMore(false)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const { AgentGenerationTaskAPI } = getChatKit()
      if (filterKind === 'space') {
        const r = await AgentGenerationTaskAPI.assets({
          source: 'user_upload',
          kind: spaceKindFilter,
          page: assetPage,
          page_size: ASSET_PAGE_SIZE,
          sort: spaceSort,
          ...(spaceSearch.trim() ? { search: spaceSearch.trim() } : {}),
        })
        if (requestId !== loadRequestIdRef.current)
          return
        const nextItems = r.items || []
        setItems(prev => assetPage === 1 ? nextItems : mergeAssets(prev, nextItems))
        setAssetTotal(r.total ?? nextItems.length ?? 0)
        setAssetHasMore(Boolean(r.has_more))
        return
      }
      const r = await AgentGenerationTaskAPI.assets({
        page: assetPage,
        page_size: ASSET_PAGE_SIZE,
        kind: filterKind,
        status: 'succeeded',
      })
      if (requestId !== loadRequestIdRef.current)
        return
      const nextItems = r.items || []
      setItems(prev => assetPage === 1 ? nextItems : mergeAssets(prev, nextItems))
      setAssetTotal(r.total ?? nextItems.length ?? 0)
      setAssetHasMore(Boolean(r.has_more))
    } catch (e: any) {
      if (requestId !== loadRequestIdRef.current)
        return
      toast({ title: t('automation.warehouse.toast.loadFailed'), description: e?.message || t('automation.archives.unknownError') })
    } finally {
      if (requestId === loadRequestIdRef.current)
        setLoading(false)
    }
  }

  const uploadFiles = async (files: FileList | null) => {
    const selected = Array.from(files || []).filter(Boolean)
    if (selected.length === 0) return
    setUploading(true)
    try {
      const { AgentAttachmentAPI } = getChatKit()
      for (const file of selected) {
        await AgentAttachmentAPI.upload(file)
      }
      toast.success(selected.length === 1 ? t('automation.warehouse.toast.uploadedOne') : tpl('automation.warehouse.toast.uploadedMany', String(selected.length)))
      resetAssetList()
      if (assetPage === 1) {
        await load()
      }
    } catch (e: any) {
      toast({ title: t('automation.warehouse.toast.uploadFailed'), description: e?.message || t('automation.warehouse.toast.retryLater') })
    } finally {
      setUploading(false)
      if (uploadInputRef.current) uploadInputRef.current.value = ''
    }
  }

  const retryOne = async (asset: AgentMaterialAsset) => {
    if (!asset.task) return
    try {
      const { AgentGenerationTaskAPI } = getChatKit()
      await AgentGenerationTaskAPI.retry(asset.task)
      await load()
    } catch (e: any) {
      toast({ title: t('automation.warehouse.toast.retryFailed'), description: e?.message || t('automation.archives.unknownError') })
    }
  }

  const downloadAsset = async (asset: AgentMaterialAsset) => {
    try {
      let downloaded = false
      for (const url of warehouseAssetDownloadCandidates(asset)) {
        try {
          await downloadBlobUrl(url, asset, t)
          downloaded = true
          break
        }
        catch {
          // Try the next same-origin candidate before showing the user an error.
        }
      }
      if (!downloaded)
        throw new Error(t('automation.warehouse.error.notDownloadable'))
    } catch (e: any) {
      toast({ title: t('automation.warehouse.toast.downloadFailed'), description: e?.message || t('automation.archives.unknownError') })
    }
  }

  const removeAsset = async (asset: AgentMaterialAsset) => {
    if (['submitted', 'queued', 'running'].includes(asset.status)) {
      toast({ title: t('automation.warehouse.toast.deleteInProgress') })
      return
    }
    setDeletingAssetId(asset.id)
    try {
      const { AgentGenerationTaskAPI } = getChatKit()
      await AgentGenerationTaskAPI.deleteAsset(asset.id)
      setItems(prev => prev.filter(item => item.id !== asset.id))
      setAssetTotal(prev => Math.max(0, prev - 1))
      setPreviewUrls(prev => {
        const next = { ...prev }
        delete next[asset.id]
        return next
      })
      setPreviewFailures(prev => {
        const next = { ...prev }
        delete next[asset.id]
        return next
      })
      if (mediaPreview?.name === asset.name) closeMediaPreview()
      toast.success(t('automation.warehouse.toast.deleted'))
      setDeleteConfirm(null)
    } catch (e: any) {
      toast({ title: t('automation.warehouse.toast.deleteFailed'), description: e?.message || t('automation.archives.unknownError') })
    } finally {
      setDeletingAssetId('')
    }
  }

  useEffect(() => {
    if (filterKind !== 'space') {
      setSpaceSearch('')
      setSpaceSearchInput('')
    }
  }, [filterKind])

  useEffect(() => {
    void load()
  }, [filterKind, spaceKindFilter, assetPage, spaceSort, spaceSearch])

  useEffect(() => {
    if (filterKind !== 'space') return
    const timer = window.setTimeout(() => {
      const nextSearch = spaceSearchInput.trim()
      if (nextSearch === spaceSearch) return
      resetAssetList()
      setSpaceSearch(nextSearch)
    }, 300)
    return () => window.clearTimeout(timer)
  }, [filterKind, spaceSearch, spaceSearchInput])

  useEffect(() => {
    const tab = warehouseTabFromParam(searchParams.get('tab'))
    if (filterKind === tab) return
    resetAssetList()
    setFilterKind(tab)
  }, [filterKind, searchParams])

  const applyWarehouseTab = useCallback((tab: WarehouseTab) => {
    resetAssetList()
    setFilterKind(tab)
    const next = new URLSearchParams(searchParams)
    if (tab === 'image') next.delete('tab')
    else next.set('tab', tab)
    if (tab !== 'ad-card') next.delete('dcpay')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  const switchWarehouseTab = useCallback((tab: WarehouseTab) => {
    if (filterKind === tab) return
    if (isKycGatedWarehouseTab(tab) && requiresMainlandRealName(region, realNameVerified)) {
      setPendingTab(tab)
      setRealNameOpen(true)
      return
    }
    applyWarehouseTab(tab)
  }, [applyWarehouseTab, filterKind, realNameVerified, region])

  const handleRealNameVerified = useCallback(async () => {
    await refreshRealName()
    if (!pendingTab) return
    dismissedKycTabsRef.current.delete(pendingTab)
    applyWarehouseTab(pendingTab)
    setPendingTab(null)
  }, [applyWarehouseTab, pendingTab, refreshRealName])

  const handleRealNameOpenChange = useCallback((open: boolean) => {
    setRealNameOpen(open)
    if (!open && pendingTab && requiresMainlandRealName(region, realNameVerified)) {
      dismissedKycTabsRef.current.add(pendingTab)
      setPendingTab(null)
    }
  }, [pendingTab, realNameVerified, region])

  useEffect(() => {
    if (realNameLoading) return
    const tab = warehouseTabFromParam(searchParams.get('tab'))
    if (!isKycGatedWarehouseTab(tab)) return
    if (!requiresMainlandRealName(region, realNameVerified)) return
    if (dismissedKycTabsRef.current.has(tab)) return
    setPendingTab(tab)
    setRealNameOpen(true)
  }, [realNameLoading, realNameVerified, region, searchParams])

  const dcpayInitialTab = searchParams.get('dcpay') === 'open' ? 'open' as const : 'cards' as const

  useLocalizedTopbarSlot(() => ({
    className: 'mr-topbar--repo-tabs',
    leading: (
      <nav className="repo-tabs repo-tabs--topbar" role="tablist" aria-label={t('automation.warehouse.tabsAria')}>
        {KIND_TAB_KEYS.map(tab => (
          <button
            key={tab.value}
            ref={node => {
              tabRefs.current[tab.value] = node
            }}
            type="button"
            role="tab"
            className={filterKind === tab.value ? 'is-active' : ''}
            aria-selected={filterKind === tab.value}
            onClick={() => switchWarehouseTab(tab.value)}
          >
            {t(tab.labelKey)}
          </button>
        ))}
      </nav>
    ),
  }), [filterKind, switchWarehouseTab])

  useEffect(() => {
    tabRefs.current[filterKind]?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    })
  }, [filterKind])

  useEffect(() => {
    if (!ASSET_TABS.has(filterKind) || !assetHasMore || loading)
      return
    const root = assetsScrollRef.current
    const target = loadMoreRef.current
    if (!root || !target)
      return
    const observer = new IntersectionObserver((entries) => {
      if (entries.some(entry => entry.isIntersecting))
        setAssetPage(current => current + 1)
    }, { root, rootMargin: '240px 0px', threshold: 0.01 })
    observer.observe(target)
    return () => observer.disconnect()
  }, [assetHasMore, filterKind, loading])

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()
    const objectUrls: string[] = []
    const settled = new Set<string>()
    setPreviewUrls({})
    setPreviewFailures({})
    const previewItems = items.filter(item => ['image', 'video'].includes(item.kind))
    void resolvePreviewPool(previewItems, {
      isCancelled: () => cancelled,
      signal: controller.signal,
      onResolved: (assetId, url, revoke) => {
        settled.add(assetId)
        if (revoke)
          objectUrls.push(url)
        setPreviewUrls(prev => ({ ...prev, [assetId]: url }))
      },
      onFailed: (assetId, failure) => {
        settled.add(assetId)
        setPreviewFailures(prev => ({ ...prev, [assetId]: failure }))
      },
      onSkipped: (assetId) => {
        settled.add(assetId)
      },
    }).then(() => {
      if (cancelled)
        return
      setPreviewFailures(prev => {
        const next = { ...prev }
        for (const item of previewItems) {
          if (settled.has(item.id) || isAssetGenerating(item))
            continue
          if (item.kind === 'video' && !warehouseAssetHasDirectCover(item))
            continue
          next[item.id] = { url: '', revoke: false, reason: 'no_candidate' }
        }
        return next
      })
    })
    return () => {
      cancelled = true
      controller.abort()
      objectUrls.forEach(url => URL.revokeObjectURL(url))
      fallbackPreviewObjectUrlsRef.current.forEach(url => URL.revokeObjectURL(url))
      fallbackPreviewObjectUrlsRef.current = []
    }
  }, [items])

  const registerGalleryItem = useCallback((assetId: string, node: HTMLElement | null) => {
    if (node)
      galleryItemRefs.current.set(assetId, node)
    else
      galleryItemRefs.current.delete(assetId)
  }, [])

  useEffect(() => {
    if (!ASSET_TABS.has(filterKind))
      return

    const pendingVideos = items.filter((item) => {
      if (item.kind !== 'video' || isAssetGenerating(item))
        return false
      if (warehouseAssetHasDirectCover(item))
        return false
      if (previewUrls[item.id])
        return false
      return Boolean(warehouseAssetPlaybackUrl(item))
    })
    if (pendingVideos.length === 0)
      return

    let cancelled = false
    const controller = new AbortController()
    const assetById = new Map(pendingVideos.map(item => [item.id, item]))
    const visibleQueue: string[] = []
    const queued = new Set<string>()
    let pumping = false

    const enqueue = (assetId: string) => {
      if (queued.has(assetId) || previewUrls[assetId])
        return
      queued.add(assetId)
      visibleQueue.push(assetId)
      void pumpVideoFrames()
    }

    async function pumpVideoFrames() {
      if (pumping || cancelled)
        return
      pumping = true
      try {
        while (visibleQueue.length > 0 && !cancelled) {
          const batch = visibleQueue.splice(0, VIDEO_FRAME_RESOLVE_CONCURRENCY)
          await resolveVideoFramePool(batch, assetById, {
            isCancelled: () => cancelled,
            signal: controller.signal,
            onResolved: (assetId, url, revoke) => {
              if (revoke)
                fallbackPreviewObjectUrlsRef.current.push(url)
              setPreviewUrls(prev => (prev[assetId] ? prev : { ...prev, [assetId]: url }))
            },
          })
        }
      }
      finally {
        pumping = false
        if (!cancelled && visibleQueue.length > 0)
          void pumpVideoFrames()
      }
    }

    const root = assetsScrollRef.current
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting)
          continue
        const assetId = entry.target.getAttribute('data-asset-id')
        if (assetId)
          enqueue(assetId)
      }
    }, { root, rootMargin: '160px 0px', threshold: 0.01 })

    for (const asset of pendingVideos) {
      const node = galleryItemRefs.current.get(asset.id)
      if (node)
        observer.observe(node)
    }

    return () => {
      cancelled = true
      controller.abort()
      observer.disconnect()
    }
  }, [filterKind, items, previewUrls])

  const handlePreviewError = useCallback(async (asset: AgentMaterialAsset) => {
    const failedUrl = previewUrls[asset.id]
    if (!failedUrl || previewFailures[asset.id])
      return
    const sources = warehouseAssetPreviewCandidates(asset)
    const failedIndex = sources.indexOf(failedUrl)
    const nextUrl = sources.slice(failedIndex + 1).find(src => src !== failedUrl)
    if (nextUrl && /^https?:\/\//i.test(nextUrl)) {
      setPreviewUrls(prev => ({ ...prev, [asset.id]: nextUrl }))
      return
    }
    const preview = await resolveWarehouseAssetPreview(asset, { skipUrls: [failedUrl] })
    if (preview.url) {
      if (preview.revoke)
        fallbackPreviewObjectUrlsRef.current.push(preview.url)
      setPreviewUrls(prev => ({ ...prev, [asset.id]: preview.url }))
      return
    }
    if (asset.kind === 'video' && !warehouseAssetHasDirectCover(asset)) {
      const framePreview = await resolveWarehouseVideoFramePreview(asset, { skipUrls: [failedUrl] })
      if (framePreview.url) {
        if (framePreview.revoke)
          fallbackPreviewObjectUrlsRef.current.push(framePreview.url)
        setPreviewUrls(prev => ({ ...prev, [asset.id]: framePreview.url }))
      }
      return
    }
    setPreviewFailures(prev => ({ ...prev, [asset.id]: preview || { url: '', revoke: false, reason: 'no_candidate' } }))
  }, [previewFailures, previewUrls])

  function releaseMediaPreviewObjectUrl() {
    if (!mediaPreviewObjectUrlRef.current)
      return
    URL.revokeObjectURL(mediaPreviewObjectUrlRef.current)
    mediaPreviewObjectUrlRef.current = ''
  }

  async function openMediaPreview(asset: AgentMaterialAsset, fallbackUrl = '') {
    if (asset.kind !== 'image' && asset.kind !== 'video')
      return
    const requestId = ++mediaPreviewRequestIdRef.current
    setMediaPreviewLoadingAssetId(asset.id)
    try {
      const resolved = await resolveWarehouseAssetMediaSource(asset, {
        fallbackUrl: asset.kind === 'image' ? fallbackUrl : '',
      })
      if (requestId !== mediaPreviewRequestIdRef.current) {
        if (resolved.revoke)
          URL.revokeObjectURL(resolved.url)
        return
      }
      if (!resolved.url) {
        const label = previewFailureLabel(resolved, t)
        toast({ title: t('automation.warehouse.previewUnavailable'), description: label })
        return
      }
      releaseMediaPreviewObjectUrl()
      if (resolved.revoke)
        mediaPreviewObjectUrlRef.current = resolved.url
      setMediaPreview({ kind: asset.kind, url: resolved.url, name: asset.name })
    }
    catch (e: any) {
      if (requestId === mediaPreviewRequestIdRef.current)
        toast({ title: t('automation.warehouse.previewUnavailable'), description: e?.message || t('automation.archives.unknownError') })
    }
    finally {
      if (requestId === mediaPreviewRequestIdRef.current)
        setMediaPreviewLoadingAssetId('')
    }
  }

  function closeMediaPreview() {
    mediaPreviewRequestIdRef.current += 1
    const video = mediaPreviewVideoRef.current
    if (video) {
      video.pause()
      video.removeAttribute('src')
      video.load()
    }
    mediaPreviewVideoRef.current = null
    releaseMediaPreviewObjectUrl()
    setMediaPreviewLoadingAssetId('')
    setMediaPreview(null)
  }

  useEffect(() => () => releaseMediaPreviewObjectUrl(), [])

  const visibleItems = items

  const useGalleryLayout = filterKind === 'image'
    || filterKind === 'video'
    || (filterKind === 'space' && spaceKindFilter !== 'file')

  const useListLayout = filterKind === 'space' && spaceKindFilter === 'file'

  const galleryItems = useMemo(() => {
    if (!useGalleryLayout) return []
    return visibleItems
  }, [useGalleryLayout, visibleItems])

  const listItems = useMemo(() => {
    if (!useListLayout) return []
    return visibleItems
  }, [useListLayout, visibleItems])

  const isServiceTab = filterKind === 'accelerator' || filterKind === 'numbers' || filterKind === 'ad-card'
  const assetsLayoutClass = isServiceTab
    ? 'gap-assets gap-assets--service'
    : useGalleryLayout
      ? `gap-assets gap-assets--gallery${filterKind === 'space' ? ' gap-assets--space-gallery' : ''}`
      : useListLayout
        ? 'gap-assets gap-assets--list'
        : 'gap-assets'

  const emptyStateCopy = useMemo(() => {
    if (loading) {
      return {
        title: t('automation.warehouse.empty.loadingTitle'),
        body: t('automation.warehouse.empty.loadingBody'),
      }
    }
    if (filterKind === 'space' && spaceSearch.trim()) {
      return {
        title: t('automation.warehouse.empty.searchTitle'),
        body: t('automation.warehouse.empty.searchBody'),
      }
    }
    if (filterKind === 'space') {
      return {
        title: t('automation.warehouse.empty.spaceTitle'),
        body: t('automation.warehouse.empty.spaceBody'),
      }
    }
    return {
      title: t('automation.warehouse.empty.defaultTitle'),
      body: t('automation.warehouse.empty.defaultBody'),
    }
  }, [filterKind, loading, spaceSearch, t])

  const renderGalleryItem = (asset: AgentMaterialAsset) => {
    const preview = previewUrls[asset.id]
    const previewFailure = previewFailures[asset.id]
    const previewFailed = asset.kind === 'image' ? Boolean(previewFailure) : false
    const failureLabel = previewFailureLabel(previewFailures[asset.id], t)
    const isRunning = ['submitted', 'queued', 'running'].includes(asset.status)
    const canRetry = Boolean(asset.task && asset.status === 'failed')
    const directVideoCover = asset.kind === 'video'
      ? warehouseAssetRequestUrl(asset.cover_url || asset.thumbnail_url || '')
      : ''
    const videoCover = directVideoCover || preview
    const mediaPreviewLoading = mediaPreviewLoadingAssetId === asset.id
    const videoCoverPending = asset.kind === 'video'
      && !isRunning
      && !videoCover
      && Boolean(warehouseAssetPlaybackUrl(asset))
    return (
      <article
        key={asset.id}
        className="gap-gallery-item"
        data-asset-id={asset.id}
        ref={node => registerGalleryItem(asset.id, node)}
      >
        <div className="gap-gallery-item__media">
          {asset.kind === 'image' ? (
            isRunning ? (
              <AssetPlaceholder kind={asset.kind} source={asset.source} pending t={t} />
            ) : (
              <button
                type="button"
                className="gap-gallery-item__button"
                onClick={() => {
                  if (!preview || previewFailed || mediaPreviewLoading) return
                  void openMediaPreview(asset, preview)
                }}
                aria-label={tpl('automation.warehouse.viewImage', asset.name)}
                disabled={!preview || previewFailed || mediaPreviewLoading}
              >
                <AsyncImage
                  src={previewFailed ? undefined : preview || undefined}
                  alt={asset.name}
                  pending={!preview && !previewFailed}
                  failed={previewFailed}
                  loadingLabel={t('common.image.loading')}
                  failedLabel={failureLabel}
                  onError={() => void handlePreviewError(asset)}
                />
              </button>
            )
          ) : asset.kind === 'video' ? (() => {
            const playableUrl = warehouseAssetPlaybackUrl(asset)
            const canPlay = Boolean(playableUrl) && !isRunning
            if (videoCover) {
              return (
                <button
                  type="button"
                  className="gap-gallery-item__button"
                  onClick={() => canPlay && !mediaPreviewLoading ? void openMediaPreview(asset) : undefined}
                  aria-label={tpl('automation.warehouse.playVideo', asset.name)}
                  disabled={!canPlay || mediaPreviewLoading}
                >
                  <img src={videoCover} alt={asset.name} loading="lazy" onError={() => void handlePreviewError(asset)} />
                  <span className="gap-gallery-item__play" aria-hidden="true"><Play size={18} aria-hidden /></span>
                </button>
              )
            }
            if (canPlay) {
              return (
                <button
                  type="button"
                  className="gap-gallery-item__button gap-gallery-item__button--placeholder"
                  onClick={() => !mediaPreviewLoading ? void openMediaPreview(asset) : undefined}
                  aria-label={tpl('automation.warehouse.playVideo', asset.name)}
                >
                  <AssetPlaceholder
                    kind={asset.kind}
                    source={asset.source}
                    pending={videoCoverPending}
                    t={t}
                  />
                  <span className="gap-gallery-item__play" aria-hidden="true"><Play size={18} aria-hidden /></span>
                </button>
              )
            }
            return (
              <AssetPlaceholder kind={asset.kind} source={asset.source} t={t} />
            )
          })() : (
            <AssetPlaceholder kind={asset.kind} source={asset.source} failed={previewFailed} failedLabel={failureLabel} t={t} />
          )}
          {isRunning ? <span className="gap-asset-live">{t('automation.warehouse.generating')}</span> : null}
          <div className="gap-gallery-item__overlay">
            <div className="gap-gallery-item__toolbar">
              {!isRunning ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-gallery-item__delete"
                  disabled={deletingAssetId === asset.id}
                  onClick={() => setDeleteConfirm(asset)}
                >
                  <Trash2 size={14} />
                  {t('automation.warehouse.delete')}
                </Button>
              ) : null}
              {warehouseAssetDownloadCandidates(asset).length > 0 ? (
                <Button variant="ghost" size="sm" onClick={() => downloadAsset(asset)}>
                  <Download size={14} />
                  {t('automation.warehouse.download')}
                </Button>
              ) : null}
              {canPreviewAsset(asset, preview, previewFailed, isRunning) ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (mediaPreviewLoading) return
                    void openMediaPreview(asset, asset.kind === 'image' ? preview : '')
                  }}
                >
                  <Eye size={14} />
                  {t('automation.warehouse.view')}
                </Button>
              ) : null}
              {canRetry ? (
                <Button variant="ghost" size="sm" onClick={() => retryOne(asset)}>
                  <RotateCcw size={14} />
                  {t('automation.warehouse.retry')}
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </article>
    )
  }

  const renderListItem = (asset: AgentMaterialAsset) => {
    const canRetry = Boolean(asset.task && asset.status === 'failed')
    return (
      <article key={asset.id} className="gap-file-row">
        <div className="gap-file-row__icon">
          <AssetPlaceholder kind={asset.kind} source={asset.source} t={t} />
        </div>
        <div className="gap-file-row__main">
          <strong title={asset.name}>{asset.name}</strong>
          <span>{asset.mime_type || kindLabel(asset.kind, asset.source, t)}</span>
        </div>
        <div className="gap-file-row__meta">
          <span>{assetSourceLabel(asset, t)}</span>
          <span>{formatTime(asset.created_at)}</span>
        </div>
        <div className="gap-file-row__actions">
          {warehouseAssetDownloadCandidates(asset).length > 0 ? (
            <Button variant="ghost" size="sm" onClick={() => downloadAsset(asset)}>
              <Download size={14} />
              {t('automation.warehouse.download')}
            </Button>
          ) : null}
          {canRetry ? (
            <Button variant="ghost" size="sm" onClick={() => retryOne(asset)}>
              <RotateCcw size={14} />
              {t('automation.warehouse.retry')}
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            className="gap-file-row__delete"
            disabled={deletingAssetId === asset.id}
            onClick={() => setDeleteConfirm(asset)}
          >
            <Trash2 size={14} />
            {t('automation.warehouse.delete')}
          </Button>
        </div>
      </article>
    )
  }

  return (
    <section className="gap-page">
      <div ref={assetsScrollRef} className={assetsLayoutClass} aria-busy={loading}>
        {filterKind === 'space' ? (
          <>
            <div className="gap-space-toolbar">
              <nav className="gap-space-tabs" role="tablist" aria-label={t('automation.warehouse.spaceTabsAria')}>
                {SPACE_KIND_TAB_KEYS.map(tab => (
                  <button
                    key={tab.value}
                    type="button"
                    role="tab"
                    className={spaceKindFilter === tab.value ? 'is-active' : ''}
                    aria-selected={spaceKindFilter === tab.value}
                    onClick={() => {
                      if (spaceKindFilter === tab.value) return
                      setSpaceKindFilter(tab.value)
                      resetAssetList()
                    }}
                  >
                    {t(tab.labelKey)}
                  </button>
                ))}
              </nav>
              <div className="gap-space-toolbar__actions">
                <label className="gap-space-search">
                  <Search size={14} aria-hidden />
                  <input
                    type="search"
                    value={spaceSearchInput}
                    placeholder={t('automation.warehouse.searchPlaceholder')}
                    onChange={event => setSpaceSearchInput(event.target.value)}
                  />
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSpaceSort(current => (current === 'desc' ? 'asc' : 'desc'))
                    resetAssetList()
                  }}
                >
                  {spaceSort === 'desc' ? <ArrowDownAZ size={14} /> : <ArrowUpAZ size={14} />}
                  {spaceSort === 'desc' ? t('automation.warehouse.sortNewest') : t('automation.warehouse.sortOldest')}
                </Button>
                <input
                  ref={uploadInputRef}
                  type="file"
                  multiple
                  className="gap-space-upload-input"
                  onChange={event => void uploadFiles(event.target.files)}
                />
                <Button type="button" size="sm" onClick={() => uploadInputRef.current?.click()} disabled={uploading}>
                  <Upload size={14} />
                  {uploading ? t('automation.warehouse.uploading') : t('automation.warehouse.upload')}
                </Button>
              </div>
            </div>
          </>
        ) : null}
        {filterKind === 'accelerator' ? <WarehouseAcceleratorPanel /> : null}
        {filterKind === 'numbers' ? <UsPhoneNumbersPage embedded /> : null}
        {filterKind === 'ad-card' ? <DcpayCardsPage embedded initialTab={dcpayInitialTab} /> : null}
        {ASSET_TABS.has(filterKind) && visibleItems.length === 0 ? (
          <div className="gap-empty" role="status" aria-live="polite">
            <strong>{emptyStateCopy.title}</strong>
            <span>{emptyStateCopy.body}</span>
          </div>
        ) : ASSET_TABS.has(filterKind) ? (
          <>
            {galleryItems.length > 0 ? (
              <div className="gap-gallery-grid">
                {galleryItems.map(renderGalleryItem)}
              </div>
            ) : null}
            {listItems.length > 0 ? (
              <div className="gap-file-list">
                {listItems.map(renderListItem)}
              </div>
            ) : null}
            {assetTotal > 0 ? (
              <div ref={loadMoreRef} className="gap-load-more" aria-live="polite">
                {assetHasMore ? (loading ? t('automation.warehouse.loading') : t('automation.warehouse.loadMore')) : tpl('automation.warehouse.allShown', String(assetTotal))}
              </div>
            ) : null}
          </>
        ) : null}
      </div>
      <Dialog open={!!mediaPreview} onOpenChange={(open) => !open && closeMediaPreview()}>
        <DialogContent className="gap-media-dialog">
          <DialogHeader className="gap-media-dialog__header">
            <DialogTitle className="gap-media-dialog__title">{mediaPreview?.name || t('automation.warehouse.previewTitle')}</DialogTitle>
          </DialogHeader>
          <div className="gap-media-dialog__stage">
            {mediaPreview?.kind === 'image' ? (
              <img className="gap-media-dialog__image" src={mediaPreview.url} alt={mediaPreview.name} />
            ) : mediaPreview ? (
              <video ref={mediaPreviewVideoRef} className="gap-media-dialog__video" src={mediaPreview.url} controls autoPlay playsInline />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && !deletingAssetId && setDeleteConfirm(null)}>
        <DialogContent className="gap-delete-dialog">
          <DialogHeader>
            <DialogTitle>{t('automation.warehouse.deleteConfirmTitle')}</DialogTitle>
          </DialogHeader>
          <p className="gap-delete-dialog__body">
            {deleteConfirm ? tpl('automation.warehouse.deleteConfirmBody', deleteConfirm.name) : ''}
          </p>
          <div className="gap-delete-dialog__actions">
            <Button type="button" variant="outline" size="sm" disabled={Boolean(deletingAssetId)} onClick={() => setDeleteConfirm(null)}>
              {t('automation.warehouse.cancel')}
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={!deleteConfirm || Boolean(deletingAssetId)}
              onClick={() => deleteConfirm && void removeAsset(deleteConfirm)}
            >
              {t('automation.warehouse.delete')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <RealNameVerifyDialog
        open={realNameOpen}
        onOpenChange={handleRealNameOpenChange}
        featureLabel={pendingTab && isKycGatedWarehouseTab(pendingTab) ? warehouseTabFeatureLabel(pendingTab, t) : undefined}
        onVerified={handleRealNameVerified}
      />
    </section>
  )
}
