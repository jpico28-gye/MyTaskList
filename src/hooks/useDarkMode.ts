'use client'

import { useState, useEffect } from 'react'

const STORAGE_KEY = 'todo-dark-mode'

export function useDarkMode() {
  const [dark, setDark] = useState(false)

  // Initialise from localStorage / system preference on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const isDark = stored !== null ? stored === 'true' : systemDark
    apply(isDark)
    setDark(isDark)
  }, [])

  function apply(value: boolean) {
    document.documentElement.classList.toggle('dark', value)
  }

  function toggle() {
    setDark((prev) => {
      const next = !prev
      localStorage.setItem(STORAGE_KEY, String(next))
      apply(next)
      return next
    })
  }

  return { dark, toggle }
}
