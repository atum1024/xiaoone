import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemeMode = 'dark' | 'light'

function applyTheme(mode: ThemeMode) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.dataset.theme = mode
  if (mode === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}

interface ThemeState {
  mode: ThemeMode
}

interface ThemeActions {
  init: () => void
  set: (mode: ThemeMode) => void
  toggle: () => void
}

export const useThemeStore = create<ThemeState & ThemeActions>()(
  persist(
    (set, get) => ({
      mode: 'dark',
      init: () => applyTheme(get().mode),
      set: (mode) => {
        set({ mode })
        applyTheme(mode)
      },
      toggle: () => get().set(get().mode === 'dark' ? 'light' : 'dark'),
    }),
    {
      name: 'xiaoone-merchant-theme',
    }
  )
)
