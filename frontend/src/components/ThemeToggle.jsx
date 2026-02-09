import { useEffect, useState } from 'react'

const THEME_KEY = 'localix-theme'

export default function ThemeToggle() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(THEME_KEY)
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const shouldUseDark = stored ? stored === 'dark' : prefersDark
    setDark(shouldUseDark)
  }, [])

  useEffect(() => {
    const root = document.documentElement
    if (dark) {
      root.classList.add('dark')
      localStorage.setItem(THEME_KEY, 'dark')
    } else {
      root.classList.remove('dark')
      localStorage.setItem(THEME_KEY, 'light')
    }
  }, [dark])

  return (
    <button
      type="button"
      onClick={() => setDark((prev) => !prev)}
      className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-medium text-slate-700 shadow-sm transition hover:border-brand-300 hover:text-brand-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
    >
      {dark ? 'Light Mode' : 'Dark Mode'}
    </button>
  )
}
