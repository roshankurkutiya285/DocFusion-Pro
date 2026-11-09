import { create } from 'zustand'
import type { ThemeMode } from '@/types'

interface ThemeState {
  theme: ThemeMode
  resolvedTheme: 'light' | 'dark'
  setTheme: (theme: ThemeMode) => void
  toggleTheme: () => void
  initTheme: () => void
}

const STORAGE_KEY = 'docfusion_theme'

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyThemeToDOM(resolved: 'light' | 'dark') {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  if (resolved === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'system',
  resolvedTheme: 'light',

  initTheme: () => {
    let savedTheme: ThemeMode = 'system'
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as ThemeMode
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        savedTheme = stored
      }
    } catch {
      // Fallback
    }

    const resolved = savedTheme === 'system' ? getSystemTheme() : savedTheme
    applyThemeToDOM(resolved)

    set({ theme: savedTheme, resolvedTheme: resolved })

    // Listen for OS theme changes if on system
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      mediaQuery.addEventListener('change', (e) => {
        if (get().theme === 'system') {
          const newResolved = e.matches ? 'dark' : 'light'
          applyThemeToDOM(newResolved)
          set({ resolvedTheme: newResolved })
        }
      })
    }
  },

  setTheme: (theme: ThemeMode) => {
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      // Ignore storage error
    }

    const resolved = theme === 'system' ? getSystemTheme() : theme
    applyThemeToDOM(resolved)
    set({ theme, resolvedTheme: resolved })
  },

  toggleTheme: () => {
    const current = get().resolvedTheme
    const next: ThemeMode = current === 'dark' ? 'light' : 'dark'
    get().setTheme(next)
  },
}))
