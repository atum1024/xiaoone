import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { motion, AnimatePresence } from 'motion/react'
import { Cpu, Globe, Lock, Sparkles } from 'lucide-react'
import { uiT } from '../i18n/catalogResolve'
import type { Locale } from '../i18n/types'

const LEGACY_STORAGE_KEY = 'xiaoone.user.workspacePreparingDismissed'

function storageKey(userId: number | string): string {
  return `xiaoone.user.${userId}.workspacePreparingDismissed`
}

export function markWorkspacePreparingDismissed(userId: number | string | null | undefined) {
  if (userId === null || userId === undefined || userId === '') return
  try {
    localStorage.setItem(storageKey(userId), '1')
    localStorage.removeItem(LEGACY_STORAGE_KEY)
  }
  catch {
    /* localStorage unavailable */
  }
}

export function isWorkspacePreparingDismissed(userId: number | string | null | undefined): boolean {
  if (userId === null || userId === undefined || userId === '') return false
  try {
    return localStorage.getItem(storageKey(userId)) === '1'
  }
  catch {
    return false
  }
}

export function resetWorkspacePreparingDismissal(userId: number | string | null | undefined) {
  try {
    if (userId !== null && userId !== undefined && userId !== '') {
      localStorage.removeItem(storageKey(userId))
    }
    localStorage.removeItem(LEGACY_STORAGE_KEY)
  }
  catch {
    /* localStorage unavailable */
  }
}

export interface WorkspacePreparingModalProps {
  open: boolean
  onClose: () => void
  /** @deprecated Subdomain is locked at registration; modal is informational only. */
  onConfirmSubdomain?: () => Promise<void>
  merchantSubdomain?: string
  subdomainRoot?: string
  /** @deprecated */
  subdomainConfirmed?: boolean
  /** @deprecated */
  confirming?: boolean
  etaMinutes?: number
  locale?: Locale
  title?: string
  description?: string
  renewHref?: string
}

function workspaceCopy(locale: Locale) {
  return {
    kicker: uiT(locale, 'common.workspace.kicker'),
    title: uiT(locale, 'common.workspace.title'),
    eta: uiT(locale, 'common.workspace.eta'),
    etaUnit: uiT(locale, 'common.workspace.etaUnit'),
    desc: uiT(locale, 'common.workspace.desc'),
    progressBuilding: uiT(locale, 'common.workspace.progressBuilding'),
    progressLinking: uiT(locale, 'common.workspace.progressLinking'),
    progressCharging: uiT(locale, 'common.workspace.progressCharging'),
    cta: uiT(locale, 'common.workspace.ctaSkip'),
    note: uiT(locale, 'common.workspace.note'),
    subdomainLabel: uiT(locale, 'common.workspace.subdomainLabel'),
    subdomainLockedWarning: uiT(locale, 'common.workspace.subdomainLockedWarning'),
    subdomainLockedBadge: uiT(locale, 'common.workspace.subdomainLockedBadge'),
  }
}

export function WorkspacePreparingModal({
  open,
  onClose,
  merchantSubdomain = '',
  subdomainRoot = '',
  etaMinutes = 3,
  locale = 'zh',
  title,
  description,
  renewHref,
}: WorkspacePreparingModalProps) {
  const navigate = useNavigate()
  const copy = useMemo(() => workspaceCopy(locale), [locale])
  const [activeIndex, setActiveIndex] = useState(0)

  const fqdn = merchantSubdomain && subdomainRoot
    ? `${merchantSubdomain}.${subdomainRoot}`
    : merchantSubdomain || ''
  const hasSubdomain = Boolean(merchantSubdomain.trim())

  useEffect(() => {
    if (!open) return
    const tick = window.setInterval(() => {
      setActiveIndex(prev => (prev + 1) % 3)
    }, 1100)
    return () => window.clearInterval(tick)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const progressLabels = [copy.progressBuilding, copy.progressLinking, copy.progressCharging]

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="x1-ws-prep-overlay"
          className="x1-ws-prep-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="x1-ws-prep-title"
        >
          <motion.div
            className="x1-ws-prep-card"
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            onClick={event => event.stopPropagation()}
          >
            <div className="x1-ws-prep-sparks" aria-hidden>
              <span /><span /><span /><span /><span />
            </div>

            <div className="x1-ws-prep-stage" aria-hidden>
              <motion.div
                className="x1-ws-prep-aura"
                animate={{ rotate: 360 }}
                transition={{ duration: 9, repeat: Infinity, ease: 'linear' }}
              />
              <motion.div
                className="x1-ws-prep-core"
                animate={{ scale: [1, 1.06, 1], rotate: [0, 6, 0] }}
                transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Cpu size={30} strokeWidth={2.4} />
              </motion.div>
              <motion.span
                className="x1-ws-prep-orb x1-ws-prep-orb--a"
                animate={{ x: [0, 14, -4, 0], y: [0, -10, 8, 0] }}
                transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
              />
              <motion.span
                className="x1-ws-prep-orb x1-ws-prep-orb--b"
                animate={{ x: [0, -12, 6, 0], y: [0, 12, -8, 0] }}
                transition={{ duration: 3.9, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
              />
              <motion.span
                className="x1-ws-prep-orb x1-ws-prep-orb--c"
                animate={{ x: [0, 8, -12, 0], y: [0, 10, -10, 0] }}
                transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
              />
            </div>

            <div className="text-center">
              <span className="x1-ws-prep-kicker">
                <Sparkles size={12} strokeWidth={2.5} />
                {copy.kicker}
              </span>
              <h2 id="x1-ws-prep-title" className="x1-ws-prep-title">
                {title || copy.title}
              </h2>
              <p className="x1-ws-prep-eta">
                {copy.eta}
                {' '}
                <strong>
                  {etaMinutes}
                  {copy.etaUnit}
                </strong>
              </p>
              <p className="x1-ws-prep-desc">{description || copy.desc}</p>

              <div className="x1-ws-prep-progress" role="status" aria-live="polite">
                {progressLabels.map((label, index) => (
                  <span key={label} className="flex items-center gap-1.5">
                    <span
                      className={`x1-ws-prep-progress-dot ${activeIndex === index ? 'is-active' : ''}`}
                      aria-hidden
                    />
                    <span>{label}</span>
                  </span>
                ))}
              </div>

              {hasSubdomain && (
                <div className="x1-ws-prep-subdomain">
                  <p className="x1-ws-prep-subdomain-label">{copy.subdomainLabel}</p>
                  <div className="x1-ws-prep-subdomain-readout" aria-live="polite">
                    <Globe size={16} strokeWidth={2.2} aria-hidden />
                    <span className="x1-ws-prep-subdomain-value">
                      {fqdn || '—'}
                    </span>
                    <span className="x1-ws-prep-subdomain-locked">
                      <Lock size={12} strokeWidth={2.4} aria-hidden />
                      {copy.subdomainLockedBadge}
                    </span>
                  </div>
                  <p className="x1-ws-prep-subdomain-warning">{copy.subdomainLockedWarning}</p>
                </div>
              )}

              <div className="x1-ws-prep-actions">
                {renewHref ? (
                  <button
                    type="button"
                    className="x1-ws-prep-btn-primary"
                    onClick={() => navigate(renewHref)}
                  >
                    {uiT(locale, 'common.workspace.renewRestoreCta', '续费恢复')}
                  </button>
                ) : null}
                <button
                  type="button"
                  className={renewHref ? 'x1-ws-prep-btn-secondary' : 'x1-ws-prep-btn-primary'}
                  onClick={onClose}
                >
                  {copy.cta}
                </button>
                <p className="text-[0.78rem] font-medium text-[var(--xiaoone-fg-faint)]">
                  {copy.note}
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
