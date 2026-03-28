'use client'

import { createContext, useContext, useEffect, useState } from 'react'

export type Theme = 'dark' | 'light'

interface SettingsCtx {
  theme: Theme
  setTheme: (t: Theme) => void
}

const Ctx = createContext<SettingsCtx>({
  theme: 'dark',
  setTheme: () => {},
})

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark')

  useEffect(() => {
    const saved = (localStorage.getItem('eco_theme') as Theme) || 'dark'
    setThemeState(saved)
    document.documentElement.classList.toggle('light', saved === 'light')
  }, [])

  const setTheme = (t: Theme) => {
    setThemeState(t)
    localStorage.setItem('eco_theme', t)
    document.documentElement.classList.toggle('light', t === 'light')
  }

  return (
    <Ctx.Provider value={{ theme, setTheme }}>
      {children}
    </Ctx.Provider>
  )
}

export const useSettings = () => useContext(Ctx)
