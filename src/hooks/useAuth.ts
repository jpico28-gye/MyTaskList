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
      await supabase.auth.signOut()
      setUser(null)
    }
  }

  useEffect(() => {
    // onAuthStateChange fires INITIAL_SESSION on mount — use it as the
    // single source of truth so we don't have a getSession() race condition.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        try {
          await checkAndSetUser(session?.user ?? null)
        } finally {
          setLoading(false)
        }
      }
    )

    // Safety net: if the auth event never fires (e.g. Supabase unreachable),
    // clear the loading spinner after 5 seconds so the user isn't stuck.
    const timeout = setTimeout(() => setLoading(false), 5000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
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
