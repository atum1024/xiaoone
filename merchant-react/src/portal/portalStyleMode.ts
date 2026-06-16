import { useCallback, useSyncExternalStore } from 'react'

export type PortalStyleMode = 'chat' | 'classic'

const STYLE_KEY = 'xiaoone.user.portal.style'

function isStyleMode(v: unknown): v is PortalStyleMode {
  return v === 'chat' || v === 'classic'
}

function readSeedFromUrl(): PortalStyleMode | undefined {
  if (typeof window === 'undefined')
    return undefined
  try {
    const params = new URLSearchParams(window.location.search)
    const style = params.get('style')
    if (!isStyleMode(style))
      return undefined
    params.delete('style')
    const next = params.toString()
    const nextUrl = `${window.location.pathname}${next ? `?${next}` : ''}${window.location.hash}`
    window.history.replaceState(window.history.state, '', nextUrl)
    return style
  }
  catch {
    return undefined
  }
}

function readInitialMode(): PortalStyleMode {
  const seed = readSeedFromUrl()
  if (seed)
    return seed
  if (typeof window === 'undefined')
    return 'chat'
  try {
    const stored = window.localStorage.getItem(STYLE_KEY)
    if (isStyleMode(stored))
      return stored
  }
  catch {
    return 'chat'
  }
  return 'chat'
}

let currentMode: PortalStyleMode = readInitialMode()
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot() {
  return currentMode
}

function getServerSnapshot(): PortalStyleMode {
  return 'chat'
}

function emitChange() {
  listeners.forEach(listener => listener())
}

export function setPortalStyleMode(next: PortalStyleMode) {
  if (currentMode === next)
    return
  currentMode = next
  try {
    if (typeof window !== 'undefined')
      window.localStorage.setItem(STYLE_KEY, next)
  }
  catch {
    // Storage can be unavailable in hardened browsers; keep the live switch working.
  }
  emitChange()
}

export interface PortalStyleModePrefs {
  mode: PortalStyleMode
  setMode: (mode: PortalStyleMode) => void
  toggle: () => void
  isChat: boolean
  isClassic: boolean
}

export function usePortalStyleMode(): PortalStyleModePrefs {
  const mode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const setMode = useCallback((next: PortalStyleMode) => {
    setPortalStyleMode(next)
  }, [])

  const toggle = useCallback(() => {
    setPortalStyleMode(mode === 'chat' ? 'classic' : 'chat')
  }, [mode])

  return {
    mode,
    setMode,
    toggle,
    isChat: mode === 'chat',
    isClassic: mode === 'classic',
  }
}
