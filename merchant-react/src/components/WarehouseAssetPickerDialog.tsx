import { useCallback, useEffect, useMemo, useState } from 'react'
import { getChatKit, type AgentMaterialAsset } from '@xiaoone/chat-kit'
import { Dialog, DialogContent, DialogHeader, DialogTitle, toast } from '@xiaoone/react-ui'
import { Icon } from './Icon'
import { AsyncImage } from './AsyncImage'
import { usePreferences } from '../app/preferences'
import {
  resolveWarehouseAssetPreview,
  warehouseAssetPreviewCandidates,
  type WarehouseAssetKind,
} from '../lib/warehouseAssets'
import './WarehouseAssetPickerDialog.css'

interface WarehouseAssetPickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  allowedKinds?: WarehouseAssetKind[]
  title?: string
  description?: string
  onSelect: (asset: AgentMaterialAsset) => void | Promise<void>
  selectingId?: string
}

const DEFAULT_KINDS: WarehouseAssetKind[] = ['image', 'video', 'file']
const PAGE_SIZE = 36

function kindLabel(kind: WarehouseAssetKind, tr: (key: string) => string) {
  if (kind === 'image') return tr('composer.warehouse.kind.image')
  if (kind === 'video') return tr('composer.warehouse.kind.video')
  return tr('composer.warehouse.kind.file')
}

function assetKindLabel(asset: AgentMaterialAsset, tr: (key: string) => string) {
  if (asset.kind === 'image') return tr('composer.warehouse.kind.image')
  if (asset.kind === 'video') return tr('composer.warehouse.kind.video')
  if (asset.kind === 'presentation') return 'PPT'
  return tr('composer.warehouse.kind.file')
}

function assetSourceLabel(asset: AgentMaterialAsset, tr: (key: string) => string) {
  if (asset.source === 'user_upload') return tr('composer.warehouse.source.upload')
  if (asset.source === 'generation_task') return tr('composer.warehouse.source.generation')
  return tr('composer.warehouse.source.attachment')
}

export function WarehouseAssetPickerDialog({
  open,
  onOpenChange,
  allowedKinds = DEFAULT_KINDS,
  title,
  description,
  onSelect,
  selectingId = '',
}: WarehouseAssetPickerDialogProps) {
  const { t } = usePreferences()
  const kinds = useMemo(() => allowedKinds.length ? allowedKinds : DEFAULT_KINDS, [allowedKinds])
  const [kind, setKind] = useState<WarehouseAssetKind>(kinds[0] || 'image')
  const [items, setItems] = useState<AgentMaterialAsset[]>([])
  const [loading, setLoading] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({})
  const [previewFailures, setPreviewFailures] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (!kinds.includes(kind))
      setKind(kinds[0] || 'image')
  }, [kind, kinds])

  const load = useCallback(async () => {
    if (!open)
      return
    setLoading(true)
    try {
      const { AgentGenerationTaskAPI } = getChatKit()
      const params: Record<string, any> = {
        page_size: PAGE_SIZE,
        page: 1,
        kind,
        ...(search.trim() ? { search: search.trim() } : {}),
      }
      if (kind === 'file')
        params.source = 'user_upload'
      else
        params.status = 'succeeded'
      const result = await AgentGenerationTaskAPI.assets(params)
      const nextItems = (result.items || []).filter(asset => {
        if (kind === 'file')
          return asset.kind === 'file' || asset.kind === 'presentation'
        return asset.kind === kind
      })
      setItems(nextItems)
    }
    catch (error: any) {
      setItems([])
      toast.error(error?.message || t('composer.warehouse.loadFailed'))
    }
    finally {
      setLoading(false)
    }
  }, [kind, open, search, t])

  useEffect(() => {
    if (!open)
      return
    void load()
  }, [load, open])

  useEffect(() => {
    if (!open) {
      setItems(prev => prev.length ? [] : prev)
      setPreviewUrls(prev => Object.keys(prev).length ? {} : prev)
      setPreviewFailures(prev => Object.keys(prev).length ? {} : prev)
      return
    }
    let cancelled = false
    const objectUrls: string[] = []
    setPreviewUrls({})
    setPreviewFailures({})
    ;(async () => {
      for (const asset of items) {
        if (cancelled || !['image', 'video'].includes(asset.kind))
          continue
        const preview = await resolveWarehouseAssetPreview(asset)
        if (!preview.url || cancelled)
          continue
        if (preview.revoke)
          objectUrls.push(preview.url)
        setPreviewUrls(prev => ({ ...prev, [asset.id]: preview.url }))
      }
    })()
    return () => {
      cancelled = true
      objectUrls.forEach(url => URL.revokeObjectURL(url))
    }
  }, [items, open])

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
      setPreviewUrls(prev => ({ ...prev, [asset.id]: preview.url }))
      return
    }
    setPreviewFailures(prev => ({ ...prev, [asset.id]: true }))
  }, [previewFailures, previewUrls])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="x1-warehouse-dialog">
        <DialogHeader className="x1-warehouse-dialog__header">
          <DialogTitle>{title || t('composer.warehouse.dialogTitle')}</DialogTitle>
          <p className="x1-warehouse-dialog__desc">{description || t('composer.warehouse.dialogDesc')}</p>
        </DialogHeader>

        <div className="x1-warehouse-dialog__toolbar">
          {kinds.length > 1 ? (
            <div className="x1-warehouse-dialog__tabs" role="tablist" aria-label={t('composer.warehouse.kindTabs')}>
              {kinds.map(item => (
                <button
                  key={item}
                  type="button"
                  role="tab"
                  aria-selected={kind === item}
                  className={kind === item ? 'is-active' : ''}
                  onClick={() => setKind(item)}
                >
                  {kindLabel(item, t)}
                </button>
              ))}
            </div>
          ) : (
            <span className="x1-warehouse-dialog__tabs" aria-label={kindLabel(kind, t)}>
              <button type="button" className="is-active">{kindLabel(kind, t)}</button>
            </span>
          )}
          <form
            className="x1-warehouse-dialog__search"
            onSubmit={(event) => {
              event.preventDefault()
              setSearch(searchInput)
            }}
          >
            <input
              value={searchInput}
              onChange={event => setSearchInput(event.target.value)}
              placeholder={t('composer.warehouse.searchPlaceholder')}
            />
            <button type="submit" disabled={loading}>
              <Icon name="search" size={13} />
              {loading ? t('composer.warehouse.loading') : t('composer.warehouse.search')}
            </button>
          </form>
        </div>

        <div className="x1-warehouse-grid" aria-busy={loading}>
          {loading && items.length === 0 ? (
            <div className="x1-warehouse-empty">{t('composer.warehouse.loading')}</div>
          ) : null}
          {!loading && items.length === 0 ? (
            <div className="x1-warehouse-empty">{t('composer.warehouse.empty')}</div>
          ) : null}
          {items.map(asset => {
            const previewFailed = Boolean(previewFailures[asset.id])
            const preview = previewFailed ? '' : (previewUrls[asset.id] || '')
            const isSelecting = selectingId === asset.id
            return (
              <article key={asset.id} className="x1-warehouse-card">
                <div className="x1-warehouse-card__preview">
                  {asset.kind === 'image' ? (
                    <AsyncImage
                      src={previewFailed ? undefined : preview || undefined}
                      alt={asset.name || assetKindLabel(asset, t)}
                      pending={!preview && !previewFailed}
                      failed={Boolean(previewFailures[asset.id])}
                      loadingLabel={t('common.image.loading')}
                      failedLabel={t('common.image.loadFailed')}
                      loading="lazy"
                      onError={() => void handlePreviewError(asset)}
                    />
                  ) : preview && asset.kind === 'video' ? (
                    <video
                      src={preview}
                      muted
                      playsInline
                      preload="metadata"
                      onError={() => void handlePreviewError(asset)}
                    />
                  ) : (
                    <div className="x1-warehouse-card__placeholder" aria-hidden="true">
                      <Icon name={asset.kind === 'video' ? 'video' : 'file'} size={24} />
                    </div>
                  )}
                </div>
                <div className="x1-warehouse-card__meta">
                  <strong title={asset.name || asset.id}>{asset.name || asset.id}</strong>
                  <span>{assetKindLabel(asset, t)} · {assetSourceLabel(asset, t)}</span>
                </div>
                <button
                  type="button"
                  className="x1-warehouse-card__select"
                  disabled={Boolean(selectingId)}
                  onClick={() => void onSelect(asset)}
                >
                  {isSelecting ? t('composer.warehouse.selecting') : t('composer.warehouse.select')}
                </button>
              </article>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
