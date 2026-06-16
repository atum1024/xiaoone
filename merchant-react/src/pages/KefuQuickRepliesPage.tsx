import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { ClipboardList, MessageSquareText, Pencil, Plus, Save, Trash2, X } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, toast } from '@xiaoone/react-ui'
import { getChatKit, type QuickReply, type Store as StoreRow } from '@xiaoone/chat-kit'
import { usePreferences } from '../app/preferences'
import type { KefuTranslate } from '../i18n/catalog/kefu'
import { describeKefuError } from '../lib/apiErrors'
import './KefuQaTemplatesPage.css'

function quickAnswerMeta(t: KefuTranslate): {
  label: string
  shortLabel: string
  description: string
  emptyTitle: string
  emptyText: string
  contentLabel: string
  contentHint: string
  titlePlaceholder: string
} {
  return {
    label: t('kefu.quickReplies.agentAnswer.label'),
    shortLabel: t('kefu.quickReplies.agentAnswer.shortLabel'),
    description: t('kefu.quickReplies.agentAnswer.description'),
    emptyTitle: t('kefu.quickReplies.agentAnswer.emptyTitle'),
    emptyText: t('kefu.quickReplies.agentAnswer.emptyText'),
    contentLabel: t('kefu.quickReplies.agentAnswer.contentLabel'),
    contentHint: t('kefu.quickReplies.agentAnswer.contentHint'),
    titlePlaceholder: t('kefu.quickReplies.agentAnswer.titlePlaceholder'),
  }
}

export function KefuQuickRepliesPage() {
  const { t, tpl } = usePreferences()
  const answerMeta = useMemo(() => quickAnswerMeta(t), [t])
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([])
  const [stores, setStores] = useState<StoreRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [storeId, setStoreId] = useState('')
  const [tags, setTags] = useState('')
  const [sortOrder, setSortOrder] = useState('0')

  const reload = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [quickRes, storeRes] = await Promise.all([
        getChatKit().QuickReplyAPI.list({ category: 'agent_answer', page_size: 200 }),
        getChatKit().StoreAPI.list({ page_size: 200 }),
      ])
      setQuickReplies(quickRes.items)
      setStores(storeRes.items)
    }
    catch (err) {
      setError(describeKefuError(err, t('kefu.quickReplies.loadFailed')))
    }
    finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void reload()
  }, [reload])

  const visible = useMemo(() => quickReplies, [quickReplies])

  function resetForm() {
    setEditingId(null)
    setTitle('')
    setContent('')
    setStoreId('')
    setTags('')
    setSortOrder('0')
  }

  function closeDialog() {
    setDialogOpen(false)
    resetForm()
  }

  function openCreateDialog() {
    resetForm()
    setDialogOpen(true)
  }

  function openEditDialog(item: QuickReply) {
    setEditingId(item.id)
    setTitle(item.title || '')
    setContent(item.content || '')
    setStoreId(item.store ? String(item.store) : '')
    setTags(item.tags || '')
    setSortOrder(String(item.sort_order ?? 0))
    setDialogOpen(true)
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextTitle = title.trim()
    const nextContent = content.trim()
    if (!nextTitle || !nextContent)
      return
    setSaving(true)
    setError('')
    try {
      const payload = {
        title: nextTitle,
        content: nextContent,
        store: storeId ? Number(storeId) : null,
        tags: tags.trim(),
        sort_order: Number.parseInt(sortOrder, 10) || 0,
      }
      if (editingId)
        await getChatKit().QuickReplyAPI.update(editingId, payload)
      else
        await getChatKit().QuickReplyAPI.create(payload)
      const wasEditing = Boolean(editingId)
      closeDialog()
      await reload()
      toast({ variant: 'success', title: wasEditing ? t('kefu.quickReplies.saveSuccess') : t('kefu.quickReplies.addSuccess') })
    }
    catch (err) {
      toast({ variant: 'destructive', title: t('kefu.quickReplies.saveFailed'), description: describeKefuError(err, t('kefu.quickReplies.saveFailed')) })
    }
    finally {
      setSaving(false)
    }
  }

  async function deleteQuickReply(item: QuickReply) {
    if (!window.confirm(tpl('kefu.quickReplies.deleteConfirm', item.title || '')))
      return
    setError('')
    try {
      await getChatKit().QuickReplyAPI.destroy(item.id)
      await reload()
      toast({ variant: 'success', title: t('kefu.quickReplies.deleteSuccess') })
    }
    catch (err) {
      toast({ variant: 'destructive', title: t('kefu.quickReplies.deleteFailed'), description: describeKefuError(err, t('kefu.quickReplies.deleteFailed')) })
    }
  }

  const activeMeta = answerMeta
  const dialogMeta = answerMeta

  return (
    <div className="x1-lc-container x1-lc-settings-page">
      {error ? <div className="mr-state-error x1-lc-settings-alert" role="alert">{error}</div> : null}
      <div className="x1-lc-body x1-lc-settings-workspace">
        <div className="x1-lc-settings-section">
          <div className="x1-lc-main-head kefu-quick-replies-head">
            <div className="kefu-quick-replies-head__text">
              <div className="x1-lc-main-title kefu-quick-replies-title">
                <h2>
                  <MessageSquareText size={16} className="mr-muted" aria-hidden />
                  {activeMeta.label}
                </h2>
                <span className="x1-lc-badge">{tpl('kefu.common.countItems', String(visible.length))}</span>
              </div>
              <p className="kefu-quick-replies-head__lede">{activeMeta.description}</p>
            </div>
            <div className="x1-lc-main-actions">
              <button type="button" className="x1-lc-btn x1-lc-btn-primary" onClick={openCreateDialog}>
                <Plus size={14} /> {tpl('kefu.quickReplies.addItem', activeMeta.shortLabel)}
              </button>
            </div>
          </div>

          <div className="x1-lc-settings-list">
            {loading ? <div className="x1-lc-empty kefu-quick-replies-empty"><p>{t('kefu.common.loading')}</p></div> : null}
            {!loading && visible.length === 0 ? (
              <div className="x1-lc-empty kefu-quick-replies-empty">
                <div className="x1-lc-empty-icon"><ClipboardList size={28} /></div>
                <strong>{activeMeta.emptyTitle}</strong>
                <p>{activeMeta.emptyText}</p>
              </div>
            ) : null}

            {visible.map(item => (
              <div key={item.id} className="x1-lc-settings-row kefu-quick-replies-row">
                <div className="kefu-quick-replies-row__body">
                  <div className="kefu-quick-replies-row__title">
                    <strong>{item.title}</strong>
                  </div>
                  <div className="kefu-quick-replies-row__meta">
                    <span>{item.store_name || t('kefu.common.allStores')}</span>
                    <span aria-hidden="true">{t('kefu.common.dotSep')}</span>
                    <span>{tpl('kefu.common.sortOrder', String(item.sort_order ?? 0))}</span>
                    {(item.tags || '').trim() ? (
                      <>
                        <span aria-hidden="true">{t('kefu.common.dotSep')}</span>
                        <span className="x1-lc-badge">{item.tags.trim()}</span>
                      </>
                    ) : null}
                  </div>
                  <div className="kefu-quick-replies-row__content">
                    {item.content}
                  </div>
                </div>
                <div className="kefu-quick-replies-row__actions">
                  <button type="button" className="x1-lc-btn" onClick={() => openEditDialog(item)}>
                    <Pencil size={14} /> {t('kefu.common.edit')}
                  </button>
                  <button type="button" className="x1-lc-btn kefu-quick-replies-row__delete" onClick={() => void deleteQuickReply(item)}>
                    <Trash2 size={14} /> {t('kefu.common.delete')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => open ? setDialogOpen(true) : closeDialog()}>
        <DialogContent className="kefu-qa-dialog">
          <form className="kefu-qa-dialog__form" onSubmit={onSubmit}>
            <DialogHeader className="kefu-qa-dialog__header">
              <div className="kefu-qa-dialog__heading">
                <span className="kefu-qa-dialog__icon" aria-hidden="true">
                  {editingId ? <Pencil size={17} /> : <Plus size={17} />}
                </span>
                <div>
                  <DialogTitle className="kefu-qa-dialog__title">
                    {editingId ? t('kefu.quickReplies.dialogEdit') : t('kefu.quickReplies.dialogAdd')}
                  </DialogTitle>
                  <DialogDescription className="kefu-qa-dialog__description">
                    {dialogMeta.description}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="kefu-qa-dialog__body">
              <div className="kefu-qa-dialog__grid">
                <div className="kefu-qa-dialog__field">
                  <label htmlFor="quick-store">{t('kefu.quickReplies.fieldStore')}</label>
                  <select
                    id="quick-store"
                    className="kefu-qa-dialog__control"
                    value={storeId}
                    onChange={e => setStoreId(e.target.value)}
                  >
                    <option value="">{t('kefu.common.allStores')}</option>
                    {stores.map(store => <option key={store.id} value={store.id}>{store.name}</option>)}
                  </select>
                </div>
                <div className="kefu-qa-dialog__field">
                  <label htmlFor="quick-sort">{t('kefu.quickReplies.fieldSort')}</label>
                  <input
                    id="quick-sort"
                    className="kefu-qa-dialog__control"
                    type="number"
                    value={sortOrder}
                    onChange={e => setSortOrder(e.target.value)}
                    inputMode="numeric"
                  />
                </div>
              </div>
              <div className="kefu-qa-dialog__grid">
                <div className="kefu-qa-dialog__field">
                  <label htmlFor="quick-title">{t('kefu.quickReplies.fieldTitle')}</label>
                  <input
                    id="quick-title"
                    className="kefu-qa-dialog__control"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder={dialogMeta.titlePlaceholder}
                    autoFocus
                  />
                </div>
                <div className="kefu-qa-dialog__field">
                  <label htmlFor="quick-tags">{t('kefu.quickReplies.fieldTags')}</label>
                  <input
                    id="quick-tags"
                    className="kefu-qa-dialog__control"
                    value={tags}
                    onChange={e => setTags(e.target.value)}
                    placeholder={t('kefu.quickReplies.fieldTagsPlaceholder')}
                  />
                </div>
              </div>
              <div className="kefu-qa-dialog__field">
                <label htmlFor="quick-content">{dialogMeta.contentLabel}</label>
                <textarea
                  id="quick-content"
                  className="kefu-qa-dialog__control kefu-qa-dialog__textarea"
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder={dialogMeta.contentHint}
                />
              </div>
            </div>

            <DialogFooter className="kefu-qa-dialog__footer">
              <button type="button" className="x1-lc-btn" onClick={closeDialog}>
                <X size={14} /> {t('kefu.common.cancel')}
              </button>
              <button type="submit" className="x1-lc-btn x1-lc-btn-primary" disabled={saving || !title.trim() || !content.trim()}>
                <Save size={14} /> {saving ? t('kefu.common.savingEllipsis') : t('kefu.quickReplies.save')}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
