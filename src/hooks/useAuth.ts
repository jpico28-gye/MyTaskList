'use client'

import { useState, useEffect } from 'react'
import type { User, AuthError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export type AuthState = {
  user:             User | null
  loading:          boolean
  signIn:           (email: string, password: string) => Promise<AuthError | null>
  signUp:           (email: string, password: string) => Promise<AuthError | null>
  signOut:          () => Promise<void>
  signInWithGoogle: () => Promise<AuthError | null>
}

export function useAuth(): AuthState {
  const [user,    setUser]    = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  async function checkAndSetUser(user: User | null) {
    if (!user) { setUser(null); return }
    try {
      const { data: allowed } = await supabase.rpc('is_email_allowed', { check_email: user.email })
      if (!allowed) {
        await supabase.auth.signOut()
        setUser(null)
      } else {
        setUser(user)
      }
    } catch {
      // If the allowlist check fails (network issue etc.), sign out to be safe
      await supabase.auth.signOut()
      setUser(null)
    }
  }

  useEffect(() => {
    let cancelled = false

    supabase.auth.getSession().then(async ({ data }) => {
      if (cancelled) return
      try {
        await checkAndSetUser(data.session?.user ?? null)
      } finally {
        // Always clear the loading state so the UI never stays stuck
        if (!cancelled) setLoading(false)
      }
    })

    // Keep in sync with Supabase auth events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      await checkAndSetUser(session?.user ?? null)
      setLoading(false)
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  async function signIn(email: string, password: string): Promise<AuthError | null> {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return error
  }

  async function signUp(email: string, password: string): Promise<AuthError | null> {
    const { error } = await supabase.auth.signUp({ email, password })
    return error
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  async function signInWithGoogle(): Promise<AuthError | null> {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    return error
  }

  return { user, loading, signIn, signUp, signOut, signInWithGoogle }
}
