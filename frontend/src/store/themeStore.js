import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const applyTheme = (theme) => {
  const root = document.documentElement
  if (theme === 'dark') {
    root.setAttribute('data-theme', 'dark')
  } else {
    root.removeAttribute('data-theme')
  }
}

export const useThemeStore = create(
  persist(
    (set, get) => ({
      theme: 'dark', // default to dark

      toggleTheme: () => {
        const next = get().theme === 'dark' ? 'light' : 'dark'
        applyTheme(next)
        set({ theme: next })
      },

      initTheme: () => {
        applyTheme(get().theme)
      },
    }),
    {
      name: 'polaris-theme',
    }
  )
)
