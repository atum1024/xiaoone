import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, useReducedMotion } from 'motion/react'
import { ArrowUp } from 'lucide-react'
import {
  cancelHomePortalTransition,
  finishHomePortalTransition,
  resolveLoginComposerTargetRect,
  useHomePortalTransition,
} from './homePortalTransition'

const EASE_OUT_QUINT: [number, number, number, number] = [0.22, 1, 0.36, 1]

interface GhostFrame {
  top: number
  left: number
  width: number
  height: number
}

function rectToFrame(rect: DOMRect | DOMRectReadOnly): GhostFrame {
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  }
}

interface HomePortalTransitionOverlayProps {
  intent: string
  theme: 'light' | 'dark'
  source: GhostFrame
  onNavigate: () => void
}

function HomePortalTransitionOverlay({
  intent,
  theme,
  source,
  onNavigate,
}: HomePortalTransitionOverlayProps) {
  const reducedMotion = useReducedMotion()
  const target = useMemo(() => rectToFrame(resolveLoginComposerTargetRect()), [])
  const [veilReady, setVeilReady] = useState(false)

  useEffect(() => {
    if (reducedMotion) {
      onNavigate()
      finishHomePortalTransition()
      return
    }
    const veilTimer = window.setTimeout(() => setVeilReady(true), 40)
    const navTimer = window.setTimeout(() => {
      onNavigate()
    }, 560)
    const finishTimer = window.setTimeout(() => {
      finishHomePortalTransition()
    }, 920)
    return () => {
      window.clearTimeout(veilTimer)
      window.clearTimeout(navTimer)
      window.clearTimeout(finishTimer)
    }
  }, [onNavigate, reducedMotion])

  if (reducedMotion)
    return null

  const preview = intent.trim()

  return createPortal(
    <div className="x1-home-portal-transition" aria-hidden="true">
      <motion.div
        className="x1-home-portal-transition__veil"
        initial={{ opacity: 0 }}
        animate={{ opacity: veilReady ? 1 : 0 }}
        transition={{ duration: 0.42, ease: EASE_OUT_QUINT }}
      />
      <motion.div
        className="x1-home-portal-transition__bloom"
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1.08 }}
        transition={{ duration: 0.62, ease: EASE_OUT_QUINT, delay: 0.08 }}
      />
      <motion.div
        className={`x1-home-portal-transition__ghost ${theme === 'dark' ? 'is-dark' : 'is-light'}`}
        initial={{
          top: source.top,
          left: source.left,
          width: source.width,
          height: source.height,
          opacity: 1,
        }}
        animate={{
          top: target.top,
          left: target.left,
          width: target.width,
          height: target.height,
          opacity: 0.94,
        }}
        transition={{ duration: 0.58, ease: EASE_OUT_QUINT }}
      >
        <div className="x1-home-portal-transition__ghost-inner">
          <p className="x1-home-portal-transition__ghost-text">
            {preview || '…'}
          </p>
          <div className="x1-home-portal-transition__ghost-actions">
            <span className="x1-home-portal-transition__ghost-send" aria-hidden="true">
              <ArrowUp size={16} strokeWidth={2.5} />
            </span>
          </div>
        </div>
      </motion.div>
    </div>,
    document.body,
  )
}

export interface HomePortalTransitionHostProps {
  onNavigate: () => void
}

export function HomePortalTransitionHost({ onNavigate }: HomePortalTransitionHostProps) {
  const active = useHomePortalTransition()

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && active?.phase === 'running') {
        cancelHomePortalTransition()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active?.phase])

  if (!active || active.phase !== 'running')
    return null

  return (
    <HomePortalTransitionOverlay
      intent={active.payload.intent}
      theme={active.payload.theme}
      source={active.payload.sourceRect}
      onNavigate={onNavigate}
    />
  )
}
