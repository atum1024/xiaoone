import { useCallback, useSyncExternalStore } from 'react'

const STORAGE_KEY = 'xiaoone.home.portal.transition.v1'

export interface HomePortalTransitionPayload {
  intent: string
  sourceRect: {
    top: number
    left: number
    width: number
    height: number
  }
  theme: 'light' | 'dark'
  createdAt: number
}

export interface HomePortalTransitionActive {
  payload: HomePortalTransitionPayload
  phase: 'running' | 'handoff'
}

type Listener = () => void

let active: HomePortalTransitionActive | null = null
const listeners = new Set<Listener>()

function emit() {
  listeners.forEach(listener => listener())
}

function subscribe(listener: Listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot() {
  return active
}

function getServerSnapshot() {
  return null
}

export function useHomePortalTransition() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

export function resolveLoginComposerTargetRect(): DOMRect {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const narrow = vw < 1024
  const width = Math.min(narrow ? vw - 32 : Math.min(520, vw * 0.4), 560)
  const height = narrow ? 124 : 116
  const left = narrow
    ? (vw - width) / 2
    : vw * 0.54 + Math.max(0, (vw * 0.44 - width) / 2)
  const top = vh - height - (narrow ? 24 : 40)
  return new DOMRect(left, top, width, height)
}

export function writeHomePortalTransitionPayload(payload: HomePortalTransitionPayload) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  }
  catch {
    // sessionStorage may be unavailable
  }
}

export function readHomePortalTransitionPayload(): HomePortalTransitionPayload | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw)
      return null
    const parsed = JSON.parse(raw) as HomePortalTransitionPayload
    if (!parsed?.sourceRect || typeof parsed.intent !== 'string')
      return null
    return parsed
  }
  catch {
    return null
  }
}

export function clearHomePortalTransitionPayload() {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  }
  catch {
    // ignore
  }
}

export function startHomePortalTransition(payload: HomePortalTransitionPayload) {
  writeHomePortalTransitionPayload(payload)
  active = { payload, phase: 'running' }
  emit()
}

export function markHomePortalTransitionHandoff() {
  if (!active)
    return
  active = { ...active, phase: 'handoff' }
  emit()
}

export function finishHomePortalTransition() {
  active = null
  clearHomePortalTransitionPayload()
  emit()
}

export function cancelHomePortalTransition() {
  finishHomePortalTransition()
}

export function useHomePortalArrival() {
  const read = useCallback(() => readHomePortalTransitionPayload(), [])
  return read()
}
